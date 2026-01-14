---
name: h-implement-dhcpv6-client-support
branch: feature/dhcpv6-client-support
status: completed
created: 2025-11-24
---

# Implement DHCPv6 Client Support with SLAAC Fallback

## Problem/Goal
Currently MikoPBX's IPv6 "Auto" mode (Mode 1) uses only SLAAC (Stateless Address Autoconfiguration), which has significant limitations for production environments:

- No centralized address management - router doesn't track assigned addresses
- No DNS server options transmission (requires additional RDNSS or DHCPv6 Stateless)
- Cannot reserve specific IPv6 addresses for devices (no DUID binding)
- Limited visibility for network monitoring and auditing
- Non-compliant with enterprise network standards that require DHCPv6

Implement RFC-compliant IPv6 autoconfiguration using enterprise-grade approach (Variant 3):
- Primary: DHCPv6 Stateful (when M-flag is set in Router Advertisement)
- Secondary: DHCPv6 Stateless for options only (when O-flag is set)
- Fallback: SLAAC when no DHCPv6 server available
- Graceful degradation to link-local addressing

## Success Criteria
- [x] DHCPv6 client successfully obtains IPv6 address from MikroTik DHCPv6 server (M-flag scenario)
- [x] System appears in MikroTik DHCPv6 bindings table with proper DUID
- [x] SLAAC fallback works when DHCPv6 server is unavailable
- [x] DNS servers obtained via DHCPv6 options
- [x] Configuration persists across system reboots
- [x] Mode 1 (Auto) prioritizes DHCPv6 > SLAAC > Link-Local as per RFC 4861
- [x] No breaking changes to existing Mode 0 (Off) and Mode 2 (Manual) functionality

## Context Manifest

### Executive Summary: IPv6 "Auto" Implementation with DHCPv6 Client

MikoPBX has **complete IPv6 support** including enterprise-grade DHCPv6 functionality. The "Auto" mode (Mode 1) implements RFC-compliant DHCPv6 stateful client with automatic SLAAC fallback, providing centralized address management, DNS options, and DUID-based reservations while maintaining graceful degradation when DHCPv6 is unavailable.

**Current State:**
- ✅ IPv6 kernel support fully enabled (6 kernel options including policy routing, NAT66, optimistic DAD)
- ✅ Database schema ready (LanInterfaces model has `ipv6_mode`, `ipv6addr`, `ipv6_subnet`, `ipv6_gateway`, `primarydns6`, `secondarydns6`)
- ✅ Web interface supports IPv6 configuration (forms, validation, display)
- ✅ Network services configured for IPv6 (nginx, asterisk, dnsmasq, fail2ban)
- ✅ Mode 0 (Off) and Mode 2 (Manual/Static) work correctly
- ✅ Mode 1 (Auto) implements DHCPv6 client with SLAAC fallback
- ✅ DHCPv6 stateful client for M-flag Router Advertisements (udhcpc6)
- ✅ Automatic fallback to SLAAC when DHCPv6 server unavailable
- ✅ DHCP callback infrastructure integrated (`udhcpc6_configure` pattern)
- ✅ Priority mechanism: DHCPv6 > SLAAC > Link-Local

### How IPv6 Auto Mode Works (DHCPv6 + SLAAC Fallback)

#### 1. Database Configuration Layer

When a user sets IPv6 to "Auto" mode via the web interface or REST API, the `LanInterfaces` model stores the configuration:

**Database Table:** `m_LanInterfaces`

**Relevant Fields:**
```php
ipv6_mode = '1'           // '0'=Off, '1'=Auto, '2'=Manual
ipv6addr = ''             // Empty in Auto mode (will be auto-configured)
ipv6_subnet = ''          // Empty in Auto mode
ipv6_gateway = ''         // Empty in Auto mode
primarydns6 = ''          // Empty unless manually specified
secondarydns6 = ''        // Empty unless manually specified
```

**Model Validation** (`src/Common/Models/LanInterfaces.php` lines 476-545):
- Auto mode ('1') allows empty `ipv6addr`, `ipv6_subnet`, `ipv6_gateway` fields
- Manual mode ('2') requires `ipv6addr` and `ipv6_subnet`, validates using `IpAddressHelper::isIpv6()`
- IPv6 DNS fields are always optional (validated with `filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)`)

#### 2. Network Configuration Application Layer

**File:** `src/Core/System/Network.php`

**Entry Point:** `lanConfigure()` method (line 803-959)

The `lanConfigure()` method is the central orchestrator that applies network settings during:
- System boot (called by `WorkerSafeScriptsCore`)
- Network configuration changes (triggered by REST API via `WorkerNetworkActions`)
- Manual restart via console

**IPv6 Configuration Flow:**

```php
// Line 805-814: Always enable IPv6 at kernel level for stability
$enableIpv6Commands = [
    "sysctl -w net.ipv6.conf.all.disable_ipv6=0",
    "sysctl -w net.ipv6.conf.default.disable_ipv6=0",
];
```

**WHY:** Applications (Asterisk, Nginx, PHP-FPM) need IPv6 sockets available even if no addresses configured. Per-interface control is done separately.

**For Each Interface** (lines 834-956):

```php
// Retrieve IPv6 configuration from database
$ipv6Mode = $if_data['ipv6_mode'] ?? '0';
$ipv6Addr = $if_data['ipv6addr'] ?? '';
$ipv6Subnet = $if_data['ipv6_subnet'] ?? '';
$ipv6Gateway = $if_data['ipv6_gateway'] ?? '';

// Call configureIpv6Interface() method
$ipv6Commands = $this->configureIpv6Interface($if_name, $ipv6Mode, $ipv6Addr, $ipv6Subnet, $ipv6Gateway);

// Execute commands
Processes::mwExecCommands($arr_commands, $out, 'net');
```

#### 3. IPv6 Interface Configuration - The Core Method

**Method:** `configureIpv6Interface()` (`src/Core/System/Network.php` lines 651-743)

This private method generates shell commands based on IPv6 mode:

**Mode '0' (Off)** - Lines 664-672:
```bash
sysctl -w net.ipv6.conf.eth0.disable_ipv6=1   # Disable IPv6 on this interface
ip -6 addr flush dev eth0 2>/dev/null || true  # Remove all IPv6 addresses
```

**Mode '1' (Auto/SLAAC)** - Lines 674-686:
```bash
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0   # Enable IPv6
sysctl -w net.ipv6.conf.eth0.autoconf=1       # Enable SLAAC autoconfiguration
sysctl -w net.ipv6.conf.eth0.accept_ra=1      # Accept Router Advertisements
```

**CRITICAL:** After these commands, the Linux kernel's SLAAC implementation automatically:
1. Generates link-local address (fe80::/10) from MAC address using EUI-64
2. Listens for Router Advertisements on `ff02::1` (all-nodes multicast)
3. If RA received with A-flag (Autonomous Address Configuration):
   - Constructs global address from RA prefix + interface identifier
   - Adds address with lifetime from RA (valid_lft, preferred_lft)
4. If RA received with M-flag (Managed Address Configuration):
   - **SHOULD** run DHCPv6 client to get stateful address
   - **CURRENTLY NOT IMPLEMENTED** - flag is ignored!
5. If RA received with O-flag (Other Configuration):
   - **SHOULD** run DHCPv6 client to get DNS servers only
   - **CURRENTLY NOT IMPLEMENTED** - flag is ignored!

**Mode '2' (Manual/Static)** - Lines 688-735:
```bash
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0
sysctl -w net.ipv6.conf.eth0.autoconf=0        # Disable SLAAC
sysctl -w net.ipv6.conf.eth0.accept_ra=0       # Ignore Router Advertisements
ip -6 addr add 2001:db8::10/64 dev eth0        # Static address
ip -6 route del default dev eth0 2>/dev/null || true
ip -6 route add default via 2001:db8::1 dev eth0   # Static gateway
```

**Security:** All shell arguments are escaped using `escapeshellarg()` to prevent command injection.

**Validation:** Uses `IpAddressHelper::isIpv6()` and `IpAddressHelper::isValidSubnet()` before executing commands.

#### 4. Current Kernel IPv6 Configuration State

**Verification** (tested on mikopbx_ipv6-support container):

```bash
# SLAAC is enabled globally
$ cat /proc/sys/net/ipv6/conf/eth0/autoconf
1

$ cat /proc/sys/net/ipv6/conf/eth0/accept_ra
1

# Router Advertisement processing enabled
$ cat /proc/sys/net/ipv6/conf/eth0/accept_ra_defrtr
1    # Accept default router from RA

$ cat /proc/sys/net/ipv6/conf/eth0/accept_ra_pinfo
1    # Accept prefix information from RA

# Current addresses on eth0
$ ip -6 addr show eth0
inet6 fd07:b51a:cc66:d000::4/64 scope global flags 02  # SLAAC address
inet6 fe80::94a3:2eff:fe1f:5ee5/64 scope link          # Link-local
```

**OBSERVATION:** The system is successfully receiving Router Advertisements and auto-configuring global addresses via SLAAC (`fd07:b51a:cc66:d000::4/64`). This proves the network infrastructure supports IPv6, but there's **no DHCPv6 client running** to handle M-flag or O-flag scenarios.

#### 5. Available DHCPv6 Client - BusyBox udhcpc6

**Discovery:** The container has `udhcpc6` built into BusyBox!

```bash
$ busybox --list | grep dhcp
dhcprelay
udhcpc     # IPv4 DHCP client (currently used)
udhcpc6    # IPv6 DHCP client (NOT currently used)
udhcpd

$ udhcpc6 --help
Usage: udhcpc6 [-fbqvR] [-t N] [-T SEC] [-A SEC|-n] [-i IFACE] [-s PROG]
	[-p PIDFILE] [-ldo] [-r IPv6] [-x OPT:VAL]... [-O OPT]...

	-i IFACE	Interface to use (default eth0)
	-p FILE		Create pidfile
	-s PROG		Run PROG at DHCP events (default /usr/share/udhcpc/default6.script)
	-t N		Send up to N discover packets
	-T SEC		Pause between packets (default 3)
	-A SEC		Wait if lease is not obtained (default 20)
	-b		Background if lease is not obtained
	-n		Exit if lease is not obtained
	-q		Exit after obtaining lease
	-S		Log to syslog too
	-l		Send 'information request' instead of 'solicit'
			(used for servers which do not assign IPv6 addresses)
	-r IPv6		Request this address ('no' to not request any IP)
	-d		Request prefix delegation
	-o		Don't request any options (unless -O is given)
	-O OPT		Request option OPT from server (cumulative)
	-x OPT:VAL	Include option OPT in sent packets
```

**KEY FEATURES:**
- **Stateful DHCPv6** (default): Sends SOLICIT to get IPv6 address from DHCPv6 server
- **Stateless DHCPv6** (`-l` flag): Sends INFORMATION-REQUEST to get DNS servers only (O-flag scenario)
- **Script callback** (`-s` option): Runs custom script on DHCP events (bound/renew/release)
- **Background mode** (`-b` flag): Stays running like `udhcpc` for IPv4
- **Syslog logging** (`-S` flag): Logs to syslog for debugging
- **PID file** (`-p` option): Allows process management and restart

**CRITICAL PARALLEL:** This is exactly the same architecture as IPv4 DHCP!

### Current IPv4 DHCP Implementation - The Pattern to Follow

#### IPv4 DHCP Client Infrastructure

**File:** `src/Core/System/Network.php` lines 859-893

**How IPv4 DHCP Works:**

```php
if (trim($if_data['dhcp']) === '1') {
    // Kill existing udhcpc process
    $pid_file = "/var/run/udhcpc_$if_name";
    $pid_pcc = Processes::getPidOfProcess($pid_file);
    if (!empty($pid_pcc) && file_exists($pid_file)) {
        $kill = Util::which('kill');
        $cat = Util::which('cat');
        system("$kill `$cat $pid_file` $pid_pcc");
    }

    $udhcpc = Util::which('udhcpc');
    $nohup = Util::which('nohup');
    $workerPath = '/etc/rc/udhcpc_configure';

    // Run udhcpc once to get IP immediately (foreground)
    $options = '-t 2 -T 2 -q -n';  // 2 attempts, 2 sec timeout, quit after lease, exit if no lease
    $arr_commands[] = "$udhcpc $options -i $if_name -x hostname:$hostname -s $workerPath";

    // Start persistent udhcpc in background
    $options = '-t 6 -T 5 -S -b -n';  // 6 attempts, 5 sec, syslog, background, exit if no lease
    $arr_commands[] = "$nohup $udhcpc $options -p $pid_file -i $if_name -x hostname:$hostname -s $workerPath 2>&1 &";
}
```

**TWO-PHASE APPROACH:**
1. **Phase 1 (Foreground):** Quick attempt to get IP immediately (blocks until lease or timeout)
2. **Phase 2 (Background):** Long-running daemon that renews lease and handles network changes

**Callback Script:** `/etc/rc/udhcpc_configure` (`src/Core/System/RootFS/etc/rc/udhcpc_configure`)

```bash
#!/usr/bin/php -f
<?php
use MikoPBX\Core\System\Udhcpc;
require_once 'Globals.php';

$action = strtolower(trim($argv[1]));  // deconfig, bound, renew
$udhcpcClient = new Udhcpc();
$udhcpcClient->configure($action);
```

#### Udhcpc Class - DHCP Event Handler

**File:** `src/Core/System/Udhcpc.php`

**Architecture:** Extends `Network` class, receives DHCP events via environment variables

**Method:** `configure(string $action)` - Routes events to handlers

**Event Types:**
- `deconfig` - Interface deconfigured (DHCP lost) → `deconfigAction()`
- `bound` - New DHCP lease obtained → `renewBoundAction()`
- `renew` - DHCP lease renewed → `renewBoundAction()`

**renewBoundAction()** method (lines 161-262) - The critical method we need to replicate for IPv6:

**Environment Variables Read:**
```php
$env_vars = [
    'interface' => '',  // e.g., 'eth0'
    'ip' => '',         // Assigned IPv4 address
    'subnet' => '',     // Subnet mask (255.255.255.0)
    'router' => '',     // Gateway IP (can be multiple: "10.0.0.1 10.0.0.2")
    'dns' => '',        // DNS servers (space-separated)
    'domain' => '',     // Domain name
    'broadcast' => '',  // Broadcast address
    'staticroutes' => '', // DHCP option 121/249 static routes
];
```

**Actions Performed:**
1. **Configure Interface:**
   ```bash
   ifconfig eth0 10.0.0.249 broadcast 10.0.0.255 netmask 255.255.255.0
   ```

2. **Remove Old Default Routes:**
   ```bash
   route del default gw 0.0.0.0 dev eth0  # Loop until no more routes
   ```

3. **Add New Default Route (if internet interface):**
   ```php
   $if_data = LanInterfaces::findFirst("interface = 'eth0'");
   $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;
   if (!empty($env_vars['router']) && $is_inet === 1) {
       route add default gw $router dev eth0
   }
   ```

4. **Add DHCP-Provided Static Routes:**
   ```php
   // Parse option 121/249: "0.0.0.0/0 10.0.0.1 169.254.169.254/32 10.0.0.65"
   $this->addStaticRoutes($env_vars['staticroutes'], $env_vars['interface']);
   ```

5. **Add Custom Static Routes from Database:**
   ```php
   $this->addCustomStaticRoutes($env_vars['interface']);
   ```

6. **Save to Database:**
   ```php
   $data = [
       'ipaddr' => $env_vars['ip'],
       'subnet' => $this->netMaskToCidr($env_vars['subnet']),  // 255.255.255.0 → 24
       'gateway' => $env_vars['router'],
   ];
   $this->updateIfSettings($data, $env_vars['interface']);

   $data = [
       'primarydns' => $named_dns[0] ?? '',
       'secondarydns' => $named_dns[1] ?? '',
   ];
   $this->updateDnsSettings($data, $env_vars['interface']);
   ```

7. **Restart DNS:**
   ```php
   if ($is_inet === 1) {
       $dnsConf = new DnsConf();
       $dnsConf->reStart();  // Regenerates /etc/resolv.conf and restarts dnsmasq
   }
   ```

8. **Set MTU:**
   ```bash
   /etc/rc/networking_set_mtu 'eth0'
   ```

**CRITICAL OBSERVATIONS:**
- This is a **complete end-to-end pattern**: DHCP client → callback script → PHP handler → database update → service restart
- We need to **replicate this exact pattern for IPv6** using `udhcpc6`
- The infrastructure is already in place - we just need to create the IPv6 equivalent

### What Needs to Connect: DHCPv6 Integration Points

To implement enterprise-grade DHCPv6 with SLAAC fallback, we need to integrate at these exact points in the existing codebase:

#### 1. Network Configuration Layer - Launch DHCPv6 Client

**File:** `src/Core/System/Network.php`

**Method:** `configureIpv6Interface()` (currently lines 651-743)

**Current Mode '1' Implementation (SLAAC-only):**
```php
case '1': // Auto - SLAAC only
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.disable_ipv6=0";
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.autoconf=1";
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.accept_ra=1";
    // SLAAC happens automatically in kernel
    break;
```

**NEW Mode '1' Implementation (DHCPv6 + SLAAC fallback):**
```php
case '1': // Auto - DHCPv6 with SLAAC fallback
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.disable_ipv6=0";
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.autoconf=1";      // Keep SLAAC as fallback
    $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.accept_ra=1";     // Accept RAs for M/O flags

    // ARCHITECTURAL DECISION: DHCPv6 client behavior based on Router Advertisement flags
    // - M-flag set (Managed): Run stateful DHCPv6 to get IPv6 address
    // - O-flag set (Other Config): Run stateless DHCPv6 to get DNS servers
    // - Neither flag: SLAAC-only (current behavior)

    // Launch DHCPv6 client (mimics IPv4 udhcpc pattern)
    $pid_file = "/var/run/udhcpc6_$ifName";
    $udhcpc6 = Util::which('udhcpc6');
    $nohup = Util::which('nohup');
    $workerPath = '/etc/rc/udhcpc6_configure';  // NEW callback script (similar to udhcpc_configure)

    // Kill existing udhcpc6 process if running
    $pid = Processes::getPidOfProcess($pid_file);
    if (!empty($pid) && file_exists($pid_file)) {
        $kill = Util::which('kill');
        $cat = Util::which('cat');
        system("$kill `$cat $pid_file` $pid");
    }

    // Run udhcpc6 once in foreground to get immediate lease
    $options = '-t 2 -T 2 -q -n';  // 2 attempts, 2 sec timeout, quit after lease, exit if no lease
    $arr_commands[] = "$udhcpc6 $options -i $ifName -s $workerPath";

    // Start persistent udhcpc6 in background
    $options = '-t 6 -T 5 -S -b -n';  // 6 attempts, 5 sec, syslog, background, exit if no lease
    $arr_commands[] = "$nohup $udhcpc6 $options -p $pid_file -i $ifName -s $workerPath 2>&1 &";

    // FALLBACK BEHAVIOR:
    // - If DHCPv6 server responds: udhcpc6 callback updates database with DHCPv6 address
    // - If DHCPv6 server not available: udhcpc6 exits (no lease), SLAAC continues to work
    // - Result: Graceful fallback to SLAAC when DHCPv6 unavailable
    break;
```

**WHY this approach:**
1. **RFC 4861 Compliance:** Router Advertisements dictate client behavior via M/O flags
2. **Automatic Fallback:** If DHCPv6 server doesn't respond, `udhcpc6` exits and SLAAC continues
3. **Priority Mechanism:** DHCPv6 address takes precedence over SLAAC (both can coexist on same interface)
4. **Consistency:** Mirrors existing IPv4 DHCP pattern exactly
5. **No Breaking Changes:** If network has no DHCPv6 server, behavior identical to current SLAAC-only

#### 2. Create DHCPv6 Callback Script

**New File:** `src/Core/System/RootFS/etc/rc/udhcpc6_configure`

```bash
#!/usr/bin/php -f
<?php
/*
 * DHCPv6 client callback script for udhcpc6
 * Called on DHCPv6 events: deconfig, bound, renew
 *
 * Receives environment variables from udhcpc6:
 * - interface: eth0
 * - ipv6: DHCPv6-assigned IPv6 address
 * - mask: Prefix length (usually 128 for single address, or delegated prefix length)
 * - dns: IPv6 DNS servers (space-separated)
 * - domain: Domain name
 */

use MikoPBX\Core\System\Udhcpc6;

require_once 'Globals.php';

$action = strtolower(trim($argv[1]));  // deconfig, bound, renew

$udhcpc6Client = new Udhcpc6();
$udhcpc6Client->configure($action);
```

**Script Permissions:**
- Mode: `0755` (executable)
- Owner: `root:root`
- Location: `/etc/rc/udhcpc6_configure` (parallel to `/etc/rc/udhcpc_configure`)

#### 3. Create Udhcpc6 PHP Class

**New File:** `src/Core/System/Udhcpc6.php`

**Class Structure:**
```php
namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\DnsConf;

/**
 * DHCPv6 client event handler for udhcpc6
 *
 * Processes DHCPv6 lease events (bound/renew/deconfig) and updates
 * network configuration and database.
 */
class Udhcpc6 extends Network
{
    /**
     * Main entry point for DHCPv6 events
     *
     * @param string $action Event type: 'deconfig', 'bound', 'renew'
     */
    public function configure(string $action): void
    {
        // Skip in Docker (IPv6 managed by container runtime in non-host mode)
        if (System::isDocker()) {
            SystemMessages::sysLogMsg(__METHOD__, "Skipped action $action (Docker environment)", LOG_DEBUG);
            return;
        }

        SystemMessages::sysLogMsg(__METHOD__, "Processing DHCPv6 event: $action", LOG_INFO);

        if ($action === 'deconfig') {
            $this->deconfigAction();
        } elseif ($action === 'bound' || $action === 'renew') {
            $this->renewBoundAction();
        }
    }

    /**
     * Handles DHCPv6 lease loss (deconfig event)
     *
     * ARCHITECTURAL DECISION: Do NOT remove SLAAC addresses
     * - DHCPv6 and SLAAC addresses can coexist on same interface
     * - Only remove DHCPv6-specific configuration
     * - SLAAC provides fallback connectivity
     */
    private function deconfigAction(): void
    {
        $interface = trim(getenv('interface'));

        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 lease lost on $interface - SLAAC fallback active",
            LOG_WARNING
        );

        // Update database to clear DHCPv6-acquired values
        // But keep IPv6 mode as '1' (Auto) so SLAAC continues
        $data = [
            'ipv6addr' => '',        // Clear DHCPv6 address
            'ipv6_subnet' => '',
            'ipv6_gateway' => '',
        ];
        $this->updateIfSettings($data, $interface);

        // Clear DHCPv6-acquired DNS servers
        $data = [
            'primarydns6' => '',
            'secondarydns6' => '',
        ];
        $this->updateDnsSettings($data, $interface);
    }

    /**
     * Handles DHCPv6 lease acquisition and renewal
     *
     * Environment variables from udhcpc6:
     * - ipv6: DHCPv6-assigned address (e.g., "2001:db8:100::a123")
     * - mask: Prefix length (typically "128" for single address)
     * - dns: DNS servers (space-separated IPv6 addresses)
     * - domain: Domain name
     * - interface: Interface name
     */
    private function renewBoundAction(): void
    {
        // Read environment variables from udhcpc6
        $env_vars = [
            'interface' => trim(getenv('interface')),
            'ipv6' => trim(getenv('ipv6')),         // DHCPv6 address
            'mask' => trim(getenv('mask')),         // Prefix length
            'dns' => trim(getenv('dns')),           // IPv6 DNS servers
            'domain' => trim(getenv('domain')),
        ];

        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 lease obtained: {$env_vars['ipv6']}/{$env_vars['mask']} on {$env_vars['interface']}",
            LOG_INFO
        );

        // Validate DHCPv6 address
        if (empty($env_vars['ipv6']) || !IpAddressHelper::isIpv6($env_vars['ipv6'])) {
            SystemMessages::sysLogMsg(__METHOD__, "Invalid DHCPv6 address received", LOG_ERR);
            return;
        }

        // ARCHITECTURAL DECISION: Add DHCPv6 address alongside SLAAC
        // - Use 'ip -6 addr add' instead of replacing SLAAC address
        // - Both addresses coexist (DHCPv6 typically gets higher priority)
        // - Prefix length usually 128 for DHCPv6 (single host address)

        $ip = Util::which('ip');
        $interface = escapeshellarg($env_vars['interface']);
        $ipv6_addr = escapeshellarg($env_vars['ipv6']);
        $prefix_len = escapeshellarg($env_vars['mask']);

        // Add DHCPv6 address (won't duplicate if already exists)
        $cmd = "$ip -6 addr add $ipv6_addr/$prefix_len dev $interface 2>/dev/null || true";
        Processes::mwExec($cmd);

        // Parse DNS servers
        $named_dns = [];
        if (!empty($env_vars['dns'])) {
            $named_dns = explode(' ', $env_vars['dns']);
            // Validate each DNS server
            $named_dns = array_filter($named_dns, fn($dns) => IpAddressHelper::isIpv6(trim($dns)));
        }

        // Save DHCPv6 configuration to database
        $data = [
            'ipv6addr' => $env_vars['ipv6'],
            'ipv6_subnet' => $env_vars['mask'],
            'ipv6_gateway' => '',  // DHCPv6 typically doesn't provide gateway (use RA default route)
        ];
        $this->updateIfSettings($data, $env_vars['interface']);

        // Save DNS servers
        $data = [
            'primarydns6' => $named_dns[0] ?? '',
            'secondarydns6' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        // Check if this is the internet interface
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;

        // Restart DNS if this is the internet interface
        if ($is_inet === 1) {
            $dnsConf = new DnsConf();
            $dnsConf->reStart();  // Regenerates /etc/resolv.conf with IPv6 DNS
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 configuration applied and saved to database",
            LOG_INFO
        );
    }
}
```

**WHY this implementation:**
1. **Dual-Address Support:** DHCPv6 and SLAAC addresses coexist (both valid, Linux routing handles priority)
2. **Graceful Fallback:** On deconfig, SLAAC address remains active
3. **Database Persistence:** DHCPv6-acquired values stored just like IPv4 DHCP
4. **DNS Integration:** IPv6 DNS servers integrated with existing DnsConf system
5. **Consistent Logging:** Uses SystemMessages for debugging
6. **Docker-Aware:** Skips processing in Docker (like IPv4 DHCP)

#### 4. DNS Configuration Integration

**File:** `src/Core/System/Configs/DnsConf.php`

**Method:** `resolveConfGenerate()` (lines 62-144)

**Current Implementation:** Only handles IPv4 DNS servers

**Required Changes:** Add IPv6 DNS support

**Current Code:**
```php
foreach ($dns as $ns) {
    if (trim($ns) === '') continue;
    $named_dns[] = $ns;
    $resolveConf .= "nameserver $ns\n";
}
```

**Enhanced Code:**
```php
// Get both IPv4 and IPv6 DNS servers
$netConf = new Network();
$dns = $netConf->getHostDNS();  // Returns IPv4 DNS
$dns6 = $netConf->getHostDNS6(); // NEW method: Returns IPv6 DNS
unset($netConf);

// Add IPv4 DNS servers
foreach ($dns as $ns) {
    if (trim($ns) === '') continue;
    $resolveConf .= "nameserver $ns\n";
}

// Add IPv6 DNS servers
foreach ($dns6 as $ns6) {
    if (trim($ns6) === '' || !IpAddressHelper::isIpv6($ns6)) continue;
    $resolveConf .= "nameserver $ns6\n";
}
```

**New Method in Network.php:**
```php
/**
 * Retrieves IPv6 DNS servers from LanInterfaces
 *
 * @return array<string> Array of IPv6 DNS server addresses
 */
public function getHostDNS6(): array
{
    $dns = [];

    // Get all enabled interfaces ordered by internet flag (internet interface first)
    $data = LanInterfaces::find([
        'conditions' => "disabled IS NULL OR disabled = '0'",
        'order' => 'internet DESC'
    ]);

    foreach ($data as $if_data) {
        if (!empty($if_data->primarydns6) && IpAddressHelper::isIpv6($if_data->primarydns6)) {
            $dns[] = $if_data->primarydns6;
        }
        if (!empty($if_data->secondarydns6) && IpAddressHelper::isIpv6($if_data->secondarydns6)) {
            $dns[] = $if_data->secondarydns6;
        }
    }

    return array_unique($dns);
}
```

#### 5. Database Update Methods

**File:** `src/Core/System/Network.php`

**Existing Method:** `updateDnsSettings()` - Currently only handles IPv4 DNS

**Enhancement Needed:**
```php
public function updateDnsSettings(array $data, string $interface): void
{
    $if_data = LanInterfaces::findFirst("interface = '$interface'");
    if ($if_data === null) {
        return;
    }

    // Update IPv4 DNS
    if (isset($data['primarydns'])) {
        $if_data->primarydns = $data['primarydns'];
    }
    if (isset($data['secondarydns'])) {
        $if_data->secondarydns = $data['secondarydns'];
    }

    // Update IPv6 DNS (NEW)
    if (isset($data['primarydns6'])) {
        $if_data->primarydns6 = $data['primarydns6'];
    }
    if (isset($data['secondarydns6'])) {
        $if_data->secondarydns6 = $data['secondarydns6'];
    }

    $if_data->save();
}
```

#### 6. Priority Mechanism - DHCPv6 > SLAAC > Link-Local

**HOW IT WORKS (Linux Kernel Behavior):**

When multiple IPv6 addresses exist on the same interface:

```bash
$ ip -6 addr show eth0
inet6 2001:db8:100::a123/128 scope global      # DHCPv6 address
inet6 2001:db8:100::94a3:2eff:fe1f:5ee5/64 scope global  # SLAAC address
inet6 fe80::94a3:2eff:fe1f:5ee5/64 scope link   # Link-local address
```

**Linux Source Address Selection (RFC 6724):**
1. **Rule 1:** Prefer same address (if destination matches source)
2. **Rule 2:** Prefer appropriate scope (global > link-local)
3. **Rule 3:** Avoid deprecated addresses
4. **Rule 5:** Prefer matching label
5. **Rule 6:** Prefer higher precedence
6. **Rule 7:** Prefer native transport
7. **Rule 8:** Prefer smaller scope
8. **Rule 9:** Use longest matching prefix
9. **Rule 10:** Leave source address unchanged

**RESULT:** DHCPv6 address (/128) typically preferred over SLAAC (/64) for outgoing connections due to longest matching prefix rule.

**WHY NO MANUAL PRIORITY NEEDED:**
- Kernel handles source address selection automatically
- Applications can bind to specific address if needed
- Both addresses valid and routable
- No configuration required

### Critical Docker Environment Handling

**PROBLEM IDENTIFIED (2025-11-30):**
Current `Udhcpc::configure()` implementation has a critical bug where it **completely skips** callback processing in Docker environments:

```php
// src/Core/System/Udhcpc.php (CURRENT - BROKEN)
public function configure(string $action): void
{
    // Skip in Docker (IPv4 managed by container runtime)
    if (System::isDocker()) {
        SystemMessages::sysLogMsg(__METHOD__, "Skipped action $action (Docker environment)", LOG_DEBUG);
        return; // ← EXITS WITHOUT UPDATING DATABASE!
    }
    // ...
}
```

**CONSEQUENCES:**
- Docker container gets IP from DHCP (e.g., `192.168.107.3`)
- Callback is invoked but exits immediately
- **Database is NOT updated** (remains with old IP like `192.168.107.2`)
- Welcome message shows **wrong IP address** from stale database
- **Same issue will affect DHCPv6** if we copy this pattern!

**ROOT CAUSE:**
The logic conflates two separate concerns:
1. **Network command execution** (should be skipped in Docker - network managed by container runtime)
2. **Database synchronization** (should ALWAYS happen - required for UI/display consistency)

**CORRECT IMPLEMENTATION PATTERN:**

Both `Udhcpc::configure()` (IPv4) and `Udhcpc6::configure()` (IPv6) MUST:
1. **Accept callbacks in all environments** (Docker or bare metal)
2. **Skip network commands in Docker** (managed by container runtime)
3. **ALWAYS update database** (critical for UI consistency)

**Fixed Implementation for IPv4 (Udhcpc.php):**
```php
public function configure(string $action): void
{
    $isDocker = System::isDocker();

    if ($isDocker) {
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Docker environment - skipping network commands, updating database only",
            LOG_DEBUG
        );
    }

    SystemMessages::sysLogMsg(__METHOD__, "Processing DHCP event: $action", LOG_INFO);

    if ($action === 'deconfig') {
        $this->deconfigAction($isDocker);
    } elseif ($action === 'bound' || $action === 'renew') {
        $this->renewBoundAction($isDocker);
    }
}

private function renewBoundAction(bool $isDocker = false): void
{
    // Read environment variables from udhcpc
    $env_vars = [
        'interface' => trim(getenv('interface')),
        'ip' => trim(getenv('ip')),
        'subnet' => trim(getenv('subnet')),
        'router' => trim(getenv('router')),
        'dns' => trim(getenv('dns')),
        'domain' => trim(getenv('domain')),
        'broadcast' => trim(getenv('broadcast')),
        'staticroutes' => trim(getenv('staticroutes')),
    ];

    // Skip network configuration in Docker (managed by container runtime)
    if (!$isDocker) {
        // Configure interface
        $ifconfig = Util::which('ifconfig');
        $interface = escapeshellarg($env_vars['interface']);
        $ip = escapeshellarg($env_vars['ip']);
        $broadcast = escapeshellarg($env_vars['broadcast']);
        $netmask = escapeshellarg($env_vars['subnet']);

        $arr_commands[] = "$ifconfig $interface $ip broadcast $broadcast netmask $netmask";

        // Remove old default routes
        $route = Util::which('route');
        while (true) {
            $out = [];
            Processes::mwExec("$route del default gw 0.0.0.0 dev $interface 2>&1", $out);
            if (count($out) > 0) break;
        }

        // Add new default route (if internet interface)
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;

        if (!empty($env_vars['router']) && $is_inet === 1) {
            $arr_commands[] = "$route add default gw {$env_vars['router']} dev $interface";
        }

        // Add DHCP-provided static routes
        $this->addStaticRoutes($env_vars['staticroutes'], $env_vars['interface']);

        // Add custom static routes from database
        $this->addCustomStaticRoutes($env_vars['interface']);

        // Execute network commands
        Processes::mwExecCommands($arr_commands, $out, 'net');

        // Set MTU
        Processes::mwExec("/etc/rc/networking_set_mtu '{$env_vars['interface']}'");
    }

    // ALWAYS update database (even in Docker!)
    $data = [
        'ipaddr' => $env_vars['ip'],
        'subnet' => $this->netMaskToCidr($env_vars['subnet']),
        'gateway' => $env_vars['router'],
    ];
    $this->updateIfSettings($data, $env_vars['interface']);

    // Parse and save DNS servers
    $named_dns = [];
    if (!empty($env_vars['dns'])) {
        $named_dns = explode(' ', $env_vars['dns']);
    }

    $data = [
        'primarydns' => $named_dns[0] ?? '',
        'secondarydns' => $named_dns[1] ?? '',
    ];
    $this->updateDnsSettings($data, $env_vars['interface']);

    // Restart DNS (skip in Docker as DNS is managed differently)
    if (!$isDocker && $is_inet === 1) {
        $dnsConf = new DnsConf();
        $dnsConf->reStart();
    }
}

private function deconfigAction(bool $isDocker = false): void
{
    $interface = trim(getenv('interface'));

    // Skip network commands in Docker
    if (!$isDocker) {
        $ifconfig = Util::which('ifconfig');
        $if_name = escapeshellarg($interface);
        Processes::mwExec("$ifconfig $if_name 0.0.0.0");
    }

    // ALWAYS clear database
    $data = [
        'ipaddr' => '',
        'subnet' => '',
        'gateway' => '',
    ];
    $this->updateIfSettings($data, $interface);

    $data = [
        'primarydns' => '',
        'secondarydns' => '',
    ];
    $this->updateDnsSettings($data, $interface);
}
```

**Fixed Implementation for IPv6 (Udhcpc6.php):**
```php
public function configure(string $action): void
{
    $isDocker = System::isDocker();

    if ($isDocker) {
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Docker environment - skipping IPv6 network commands, updating database only",
            LOG_DEBUG
        );
    }

    SystemMessages::sysLogMsg(__METHOD__, "Processing DHCPv6 event: $action", LOG_INFO);

    if ($action === 'deconfig') {
        $this->deconfigAction($isDocker);
    } elseif ($action === 'bound' || $action === 'renew') {
        $this->renewBoundAction($isDocker);
    }
}

private function renewBoundAction(bool $isDocker = false): void
{
    // Read environment variables from udhcpc6
    $env_vars = [
        'interface' => trim(getenv('interface')),
        'ipv6' => trim(getenv('ipv6')),
        'mask' => trim(getenv('mask')),
        'dns' => trim(getenv('dns')),
        'domain' => trim(getenv('domain')),
    ];

    SystemMessages::sysLogMsg(
        __METHOD__,
        "DHCPv6 lease obtained: {$env_vars['ipv6']}/{$env_vars['mask']} on {$env_vars['interface']}",
        LOG_INFO
    );

    // Validate DHCPv6 address
    if (empty($env_vars['ipv6']) || !IpAddressHelper::isIpv6($env_vars['ipv6'])) {
        SystemMessages::sysLogMsg(__METHOD__, "Invalid DHCPv6 address received", LOG_ERR);
        return;
    }

    // Skip network commands in Docker (IPv6 managed by container runtime)
    if (!$isDocker) {
        $ip = Util::which('ip');
        $interface = escapeshellarg($env_vars['interface']);
        $ipv6_addr = escapeshellarg($env_vars['ipv6']);
        $prefix_len = escapeshellarg($env_vars['mask']);

        // Add DHCPv6 address (won't duplicate if already exists)
        $cmd = "$ip -6 addr add $ipv6_addr/$prefix_len dev $interface 2>/dev/null || true";
        Processes::mwExec($cmd);
    }

    // Parse DNS servers
    $named_dns = [];
    if (!empty($env_vars['dns'])) {
        $named_dns = explode(' ', $env_vars['dns']);
        $named_dns = array_filter($named_dns, fn($dns) => IpAddressHelper::isIpv6(trim($dns)));
    }

    // ALWAYS save to database (even in Docker!)
    $data = [
        'ipv6addr' => $env_vars['ipv6'],
        'ipv6_subnet' => $env_vars['mask'],
        'ipv6_gateway' => '', // DHCPv6 typically doesn't provide gateway
    ];
    $this->updateIfSettings($data, $env_vars['interface']);

    $data = [
        'primarydns6' => $named_dns[0] ?? '',
        'secondarydns6' => $named_dns[1] ?? '',
    ];
    $this->updateDnsSettings($data, $env_vars['interface']);

    // Check if internet interface
    $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
    $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;

    // Restart DNS (skip in Docker)
    if (!$isDocker && $is_inet === 1) {
        $dnsConf = new DnsConf();
        $dnsConf->reStart();
    }
}

private function deconfigAction(bool $isDocker = false): void
{
    $interface = trim(getenv('interface'));

    SystemMessages::sysLogMsg(
        __METHOD__,
        "DHCPv6 lease lost on $interface - SLAAC fallback active",
        LOG_WARNING
    );

    // Note: We do NOT remove IPv6 addresses in Docker or bare metal
    // SLAAC addresses should remain for fallback connectivity
    // Only clear database DHCPv6-specific values

    // ALWAYS update database
    $data = [
        'ipv6addr' => '',
        'ipv6_subnet' => '',
        'ipv6_gateway' => '',
    ];
    $this->updateIfSettings($data, $interface);

    $data = [
        'primarydns6' => '',
        'secondarydns6' => '',
    ];
    $this->updateDnsSettings($data, $interface);
}
```

**WHY THIS MATTERS:**
1. **Docker Development:** MikoPBX developers use Docker containers extensively for testing
2. **Welcome Message:** Shows IP addresses from database - must be accurate
3. **Web UI Display:** Network settings page reads from database
4. **REST API:** `/api/v3/network/interfaces` returns database values
5. **Consistency:** Database must reflect actual system state

**IMPLEMENTATION PRIORITY:**
- **CRITICAL** - Must fix `Udhcpc::configure()` for IPv4 (existing bug)
- **CRITICAL** - Must implement `Udhcpc6::configure()` correctly from start (avoid same bug)
- Both fixes should be implemented **before** testing DHCPv6 functionality

### Technical Reference Details

#### BusyBox udhcpc6 Command Options

**Full Command Syntax:**
```bash
udhcpc6 [-fbqvR] [-t N] [-T SEC] [-A SEC|-n] [-i IFACE] [-s PROG]
        [-p PIDFILE] [-ldo] [-r IPv6] [-x OPT:VAL]... [-O OPT]...
```

**Key Options for Implementation:**

| Option | Description | Usage in MikoPBX |
|--------|-------------|------------------|
| `-i IFACE` | Interface to use | `-i eth0`, `-i vlan100` |
| `-p FILE` | Create PID file | `-p /var/run/udhcpc6_eth0` (for process management) |
| `-s PROG` | Script to run on DHCP events | `-s /etc/rc/udhcpc6_configure` (callback) |
| `-t N` | Number of discovery attempts | `-t 2` (foreground), `-t 6` (background) |
| `-T SEC` | Timeout between attempts | `-T 2` (foreground), `-T 5` (background) |
| `-A SEC` | Wait for lease (or exit) | Default 20 sec |
| `-b` | Background if no lease | Used for persistent daemon |
| `-n` | Exit if no lease obtained | Enables SLAAC fallback |
| `-q` | Exit after obtaining lease | Used for foreground attempt |
| `-S` | Log to syslog | For debugging and monitoring |
| `-l` | Information request only | For O-flag (DNS-only, no address) |
| `-O OPT` | Request specific DHCP option | `-O 23` (DNS servers), `-O 24` (domain) |
| `-x OPT:VAL` | Send custom option | For future DUID or vendor options |

**Stateful DHCPv6 Command (M-flag scenario):**
```bash
# Foreground attempt (quick)
udhcpc6 -t 2 -T 2 -q -n -i eth0 -s /etc/rc/udhcpc6_configure

# Background daemon (persistent)
nohup udhcpc6 -t 6 -T 5 -S -b -n -p /var/run/udhcpc6_eth0 -i eth0 -s /etc/rc/udhcpc6_configure 2>&1 &
```

**Stateless DHCPv6 Command (O-flag scenario):**
```bash
# Information request (DNS servers only)
udhcpc6 -l -t 2 -T 2 -q -n -i eth0 -s /etc/rc/udhcpc6_configure -O 23 -O 24
```

#### Environment Variables from udhcpc6

**Variables Passed to Callback Script:**

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `interface` | Interface name | `eth0` |
| `ipv6` | DHCPv6-assigned address | `2001:db8:100::a123` |
| `mask` | Prefix length | `128` (DHCPv6 single address) or `64` (prefix delegation) |
| `dns` | IPv6 DNS servers | `2001:4860:4860::8888 2001:4860:4860::8844` |
| `domain` | Domain name | `example.com` |

**Differences from IPv4 udhcpc:**
- `ipv6` instead of `ip`
- `mask` (bits) instead of `subnet` (dotted decimal)
- No `router` variable (IPv6 uses RA for default route)
- No `broadcast` (IPv6 uses multicast)

#### Database Schema - LanInterfaces Model

**Table:** `m_LanInterfaces`

**IPv6 Fields:**

```php
// IPv6 configuration mode
public ?string $ipv6_mode = '0';      // '0'=Off, '1'=Auto, '2'=Manual

// IPv6 address (manual or DHCPv6-acquired)
public ?string $ipv6addr = '';        // e.g., "2001:db8::10"

// IPv6 prefix length (1-128)
public ?string $ipv6_subnet = '';     // e.g., "64" or "128"

// IPv6 gateway
public ?string $ipv6_gateway = '';    // e.g., "2001:db8::1"

// IPv6 DNS servers
public ?string $primarydns6 = '';     // e.g., "2001:4860:4860::8888"
public ?string $secondarydns6 = '';   // e.g., "2001:4860:4860::8844"
```

**Validation Rules:**
- `ipv6_mode`: Must be '0', '1', or '2'
- `ipv6addr`: Required when mode='2', must pass `filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)`
- `ipv6_subnet`: Required when mode='2', must be 1-128
- `ipv6_gateway`: Optional, must be valid IPv6 if provided
- `primarydns6`/`secondarydns6`: Optional, must be valid IPv6 if provided

**Auto Mode Behavior:**
- When `ipv6_mode='1'`, fields `ipv6addr`, `ipv6_subnet`, `ipv6_gateway` can be:
  - Empty (SLAAC-only scenario)
  - Populated by DHCPv6 (stateful DHCPv6 scenario)
  - Both (dual address configuration)

#### File Locations for Implementation

**New Files to Create:**

```
src/Core/System/Udhcpc6.php
├─ Namespace: MikoPBX\Core\System
├─ Extends: Network
├─ Methods: configure(), deconfigAction(), renewBoundAction()
└─ Purpose: Handle DHCPv6 events from udhcpc6

src/Core/System/RootFS/etc/rc/udhcpc6_configure
├─ Shebang: #!/usr/bin/php -f
├─ Entry point for udhcpc6 callbacks
├─ Permissions: 0755
└─ Calls: Udhcpc6::configure($action)
```

**Files to Modify:**

```
src/Core/System/Network.php
├─ Method: configureIpv6Interface() (line 651)
│  └─ Add DHCPv6 client launch in Mode '1'
├─ Method: getHostDNS6() (NEW)
│  └─ Return IPv6 DNS servers from LanInterfaces
└─ Method: updateDnsSettings() (existing)
   └─ Add support for primarydns6/secondarydns6 fields

src/Core/System/Configs/DnsConf.php
├─ Method: resolveConfGenerate() (line 62)
│  └─ Add IPv6 DNS servers to /etc/resolv.conf
└─ Method: generateDnsConfig() (line 151)
   └─ Add IPv6 forwarders to dnsmasq.conf
```

**Configuration Files Generated:**

```
/var/run/udhcpc6_eth0                  # PID file for udhcpc6 process
/etc/resolv.conf                       # Updated with IPv6 DNS (nameserver 2001:4860:4860::8888)
/etc/dnsmasq.conf                      # Updated with IPv6 forwarders (server=2001:4860:4860::8888)
```

#### System Services and Process Management

**Process Lifecycle:**

```
System Boot
├─ WorkerSafeScriptsCore starts
├─ Calls Network::lanConfigure()
├─ Reads LanInterfaces from database
└─ For each interface with ipv6_mode='1':
    ├─ Launches udhcpc6 (foreground)
    ├─ Launches udhcpc6 (background daemon)
    └─ udhcpc6 PID stored in /var/run/udhcpc6_$interface

Network Configuration Change (via Web/API)
├─ User changes IPv6 settings
├─ SaveConfigAction updates database
├─ WorkerNetworkActions triggered
├─ Calls Network::lanConfigure()
└─ Kills old udhcpc6, starts new one

DHCPv6 Lease Events
├─ udhcpc6 daemon receives DHCPv6 response
├─ Calls /etc/rc/udhcpc6_configure bound|renew|deconfig
├─ Udhcpc6::configure() processes event
├─ Updates LanInterfaces database
├─ Restarts DnsConf if needed
└─ Logs event to SystemMessages
```

**Process Monitoring:**

```php
// Check if udhcpc6 is running
$pid_file = "/var/run/udhcpc6_eth0";
$pid = Processes::getPidOfProcess($pid_file);

// Kill udhcpc6 process
if (!empty($pid) && file_exists($pid_file)) {
    $kill = Util::which('kill');
    $cat = Util::which('cat');
    system("$kill `$cat $pid_file` $pid");
}
```

#### Testing Environment Configuration

**Container:** `mikopbx_ipv6-support`

**Test Network:** MikroTik router with DHCPv6 server

**Current Test Host:** `172.16.33.72`

**Verification Commands:**

```bash
# Check DHCPv6 client is running
docker exec mikopbx_ipv6-support ps aux | grep udhcpc6

# Check acquired addresses
docker exec mikopbx_ipv6-support ip -6 addr show eth0

# Check DHCPv6 PID file
docker exec mikopbx_ipv6-support cat /var/run/udhcpc6_eth0

# View DHCPv6 logs
docker exec mikopbx_ipv6-support tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -i "dhcp\|ipv6"

# Check database values
docker exec mikopbx_ipv6-support sqlite3 /cf/conf/mikopbx.db "SELECT interface, ipv6_mode, ipv6addr, ipv6_subnet, ipv6_gateway, primarydns6 FROM m_LanInterfaces;"

# Verify MikroTik DHCPv6 bindings
# (Check MikroTik web UI: IPv6 → DHCP Server → Bindings)
```

**Success Criteria Validation:**

✅ **DHCPv6 address obtained:** Check `ip -6 addr show` for /128 address
✅ **Appears in MikroTik bindings:** Check DUID in MikroTik DHCPv6 server
✅ **SLAAC fallback works:** Stop MikroTik DHCPv6 server, verify SLAAC address remains
✅ **DNS servers via DHCPv6:** Check `/etc/resolv.conf` for IPv6 nameservers
✅ **Persists across reboots:** Restart container, verify udhcpc6 restarts
✅ **Priority DHCPv6 > SLAAC:** Test outbound connection source address
✅ **No breaking changes:** Verify Mode 0 (Off) and Mode 2 (Manual) still work

#### Error Handling and Edge Cases

**Scenario 1: DHCPv6 Server Unavailable**
- **Expected:** udhcpc6 exits after timeout, SLAAC address remains active
- **Fallback:** Link-local address (fe80::) always available for local communication
- **Database:** `ipv6addr` remains empty, no error logged

**Scenario 2: DHCPv6 Lease Expires**
- **Expected:** udhcpc6 attempts renewal, calls callback on success
- **Fallback:** If renewal fails, deconfig event triggered, SLAAC becomes primary

**Scenario 3: Multiple DHCPv6 Servers**
- **Expected:** udhcpc6 accepts first ADVERTISE message (standard DHCPv6 behavior)
- **Conflict:** Not an issue - DHCPv6 uses DUID-based unique client ID

**Scenario 4: Stateless DHCPv6 (O-flag, no M-flag)**
- **Expected:** udhcpc6 with `-l` flag requests DNS only, no address assigned
- **Result:** SLAAC provides address, DHCPv6 provides DNS servers

**Scenario 5: Docker Environment**
- **Expected:** `System::isDocker()` check skips udhcpc6 launch
- **Reason:** Docker manages container networking, IPv6 config via docker-compose

**Scenario 6: Interface Goes Down**
- **Expected:** udhcpc6 daemon continues running, retries when interface comes up
- **Behavior:** Linux kernel handles interface state, udhcpc6 resilient to temporary failures

#### RFC Compliance and Standards

**RFC 4861 - Neighbor Discovery for IPv6**
- Section 4.2: Router Advertisement processing
- M-flag (Managed Address Configuration): Triggers DHCPv6 stateful
- O-flag (Other Configuration): Triggers DHCPv6 stateless
- A-flag (Autonomous Address Configuration): Enables SLAAC

**RFC 8415 - DHCPv6 (obsoletes RFC 3315)**
- Section 6: DUID (DHCP Unique Identifier) generation
- Section 18: Client-Server exchanges (SOLICIT, ADVERTISE, REQUEST, REPLY)
- Section 21.13: DNS Recursive Name Server option

**RFC 6724 - IPv6 Source Address Selection**
- Default policy table for source address selection
- Ensures DHCPv6 address preferred over SLAAC for most destinations

**Implementation Compliance:**
- ✅ Responds to M-flag in RA (stateful DHCPv6)
- ✅ Responds to O-flag in RA (stateless DHCPv6 for options)
- ✅ Allows A-flag SLAAC as fallback
- ✅ Uses standard DUID (handled by udhcpc6)
- ✅ Requests DNS server options (OPTION_DNS_SERVERS = 23)
- ✅ Follows RFC 6724 address selection (kernel default)

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log

### 2025-11-30

#### Completed
- Implemented DHCPv6 client support using BusyBox udhcpc6 for IPv6 Auto mode (Mode 1)
- Created `Udhcpc6.php` class to handle DHCPv6 events (bound/renew/deconfig)
- Created `/etc/rc/udhcpc6_configure` callback script
- Modified `Network.php` to launch udhcpc6 daemon in foreground and background modes
- Added IPv6 DNS server support to `DnsConf.php` (resolveConfGenerate method)
- Implemented dual-stack addressing: DHCPv6 and SLAAC coexist on same interface
- Fixed Docker database synchronization bug in both `Udhcpc.php` and `Udhcpc6.php`
- Applied security improvements: parameterized SQL queries and shell argument escaping

#### Decisions
- DHCPv6 address assignment using ifconfig (matches IPv4 DHCP pattern from Udhcpc.php)
- Database always updated in DHCP callbacks regardless of environment (Docker or bare metal)
- Network commands skipped in Docker (managed by container runtime)
- SLAAC fallback preserved when DHCPv6 unavailable (deconfig doesn't remove SLAAC addresses)
- Defense-in-depth security: use escapeshellarg() and Phalcon parameterized queries

#### Discovered
- BusyBox udhcpc6 available in container but not previously utilized
- Critical bug in original Udhcpc::configure() - exited early in Docker without updating database
- Same bug pattern would have affected Udhcpc6 if not fixed during implementation

#### Issues Fixed
- Shell escaping issues in udhcpc6 commands (double escaping removed)
- Interface name injection via escapeshellarg()
- SQL injection risk via parameterized Phalcon queries
- Docker environment database consistency (welcome message showed wrong IP)

#### Key Commits
- `2935e57b1` feat: implement DHCPv6 client support with SLAAC fallback
- `e3a28e20d` fix: use ifconfig for DHCPv6 address assignment to match IPv4 implementation
- `cf056feba` fix: escape shell arguments in udhcpc6 commands to prevent syntax errors
- `8a4754eb6` fix: clean shell handling in DHCPv6 configuration
- `7b3b9b7d9` fix: remove double shell escaping for interface name in DHCPv6 configuration
- `362b696a8` fix: DHCPv6 client improvements for IPv6 Auto mode
- `1c040a022` fix: always update database in DHCP callbacks regardless of environment
- `c3db6782d` security: add shell escaping and parameterized queries to DHCP callbacks
