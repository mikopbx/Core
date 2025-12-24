---
name: h-implement-lxc-container-support
branch: feature/lxc-container-support
status: pending
created: 2025-12-24
---

# LXC Container Support

## Problem/Goal

MikoPBX now supports running in LXC containers in addition to Docker. However, the current implementation treats LXC the same as Docker (`isDocker()` returns true for both), which causes problems:

- **Network not working in LXC**: Network configuration is skipped because code assumes container runtime manages networking (true for Docker, false for LXC)
- **DHCP not working**: DHCP client callbacks skip network commands in LXC
- **iptables/fail2ban disabled**: Firewall is skipped even though LXC can manage it
- **NTP/ACPID disabled**: Services are skipped unnecessarily

**Key difference**: Docker runtime manages networking, storage, time. LXC gives the container more control (similar to a VM).

**Solution**: Introduce capability-based checks instead of binary `isDocker()`:
- `isDocker()` — true only for real Docker
- `isLxc()` — true only for LXC
- `isContainer()` — true for both (UI/informational)
- `canManageNetwork()` — false for Docker, true for LXC/bare-metal

## Success Criteria

**Core Architecture:**
- [ ] `System::isDocker()` returns true ONLY for Docker (not LXC)
- [ ] `System::isLxc()` correctly detects LXC containers
- [ ] `System::isContainer()` returns true for both Docker and LXC
- [ ] `System::canManageNetwork()` returns false for Docker, true for LXC and bare-metal

**Network (Critical for LXC):**
- [ ] LXC can configure network interfaces via `Network::lanConfigure()`
- [ ] LXC can use DHCP client (`Udhcpc`, `Udhcpc6`)
- [ ] LXC can configure DNS via `DnsConf`
- [ ] `Network::getInterfacesNames()` works correctly in LXC

**Firewall:**
- [ ] `IptablesConf` works in LXC (with capability check)
- [ ] `Fail2BanConf` works in LXC
- [ ] `DockerNetworkFilterService` logic updated for LXC

**System Services:**
- [ ] NTP can synchronize time in LXC
- [ ] ACPID can work in LXC

**Shell Scripts:**
- [ ] `shell_functions.sh` distinguishes Docker from LXC
- [ ] `f_umount()` works correctly in LXC

**UI/API:**
- [ ] REST API returns correct container type info
- [ ] Admin UI shows appropriate options for LXC

**Testing:**
- [ ] Verified in Docker container (no regression)
- [ ] Verified in LXC container (new functionality works)

## Context Manifest

### How MikoPBX Currently Handles Docker vs LXC

MikoPBX runs in three primary environments: **bare-metal/VM**, **Docker**, and **LXC**. The current implementation incorrectly treats LXC the same as Docker, causing critical functionality to fail in LXC containers.

#### Current Container Detection Logic (System.php lines 294-374)

**THE PROBLEM**: The `isDocker()` method returns true for BOTH Docker and LXC:

```php
public static function isDocker(): bool
{
    return file_exists('/.dockerenv') || self::isLxc();  // BUG: LXC is treated as Docker
}

public static function isLxc(): bool
{
    // Check container environment variable (set by LXC runtime)
    if (getenv('container') === 'lxc') {
        return true;
    }

    // Fallback: check init process environment
    $environ = @file_get_contents('/proc/1/environ');
    if ($environ !== false && strpos($environ, 'container=lxc') !== false) {
        return true;
    }

    return false;
}
```

**Why this is wrong**:
- Docker runtime manages networking, storage, time synchronization → MikoPBX should NOT configure these
- LXC gives the container more control (similar to a VM) → MikoPBX MUST configure these
- When `isDocker()` returns true for LXC, network configuration is skipped entirely

#### Container Detection in Shell Scripts (shell_functions.sh line 200)

The shell function `f_umount()` checks for Docker OR LXC:

```bash
f_umount()
{
    if [ -f '/.dockerenv' ] || [ "$container" = 'lxc' ]; then
        return  # Skip umount in containers
    fi
    # ... umount logic
}
```

This pattern is repeated throughout the shell scripts and needs capability-based checks instead.

---

### Network Configuration Architecture (CRITICAL FOR LXC)

#### Network::lanConfigure() - Main Network Setup (Network.php lines 893-1060)

This method configures all network interfaces during boot and when settings change:

**Current Docker Behavior (lines 906-910)**:
```php
if (System::isDocker()) {
    // In Docker: Only configure IPv6 (IPv4 is managed by Docker runtime)
    $this->configureIpv6InDocker();
    return 0;
}
```

**What needs to happen for LXC**:
1. LXC should run the FULL network configuration (lines 912-1060), NOT just IPv6
2. LXC needs DHCP client support (udhcpc lines 949-976)
3. LXC needs static IP configuration (lines 985-1026)
4. LXC needs IPv6 configuration (lines 1028-1046)
5. LXC needs custom static routes (line 1057)

**Network Flow**:
1. Boot: `SystemLoader::start()` → `Network::cliAction('start')` → `Network::lanConfigure()`
2. Settings change: `LanInterfaces::afterSave()` → `WorkerModelsEvents` → `Network::networkReload()`
3. DHCP events: Udhcpc callback → database update → triggers `afterSave()`

#### Network::getInterfacesNames() - Interface Discovery (Network.php lines 48-62)

**Current implementation**:
```php
public function getInterfacesNames(): array
{
    if (System::isDocker()) {
        $ifconfig = Util::which('ifconfig');
        $command = "$ifconfig | $grep -o -E '^[a-zA-Z0-9]+' | $grep -v 'lo'";
    } else {
        // Universal command to retrieve all PCI network interfaces.
        $ls = Util::which('ls');
        $command = "$ls -l /sys/class/net | $grep devices | $grep -v virtual | $awk '{ print $9 }'";
    }
    Processes::mwExec($command, $names);
    return $names;
}
```

**LXC Requirement**: LXC should use the same logic as bare-metal (PCI interfaces), NOT Docker's ifconfig parsing. LXC containers have real network devices (e.g., `eth0`), not Docker's virtual bridge interfaces.

#### Network::configureLanInDocker() - Docker-Specific Sync (Network.php lines 71-118)

This method syncs container's runtime network config back to database (Docker-only feature):

```php
public function configureLanInDocker(): void
{
    // Check if the environment is Docker
    if (!System::isDocker()) {
        return;
    }

    // Read actual IP from container runtime and save to database
    // Docker runtime sets IP via bridge - MikoPBX just reads it
}
```

**LXC Behavior**: This should NOT run in LXC. LXC manages its own network, so there's no external runtime to sync from.

---

### DHCP Client Implementation (CRITICAL FOR LXC)

#### Udhcpc::configure() - IPv4 DHCP Events (Udhcpc.php lines 39-71)

**THE BUG** (lines 41-48):
```php
public function configure(string $action): void
{
    $isDocker = System::isDocker();  // BUG: returns true for LXC

    if ($isDocker) {
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Docker environment - skipping network commands, updating database only",
            LOG_DEBUG
        );
    }
    // ...
}
```

**What happens in Docker**:
- `renewBoundAction($isDocker=true)` line 236: Skips ALL network commands (ifconfig, route, etc.)
- Only updates database (lines 296-312)
- This is correct for Docker because Docker's bridge already configured the interface

**What MUST happen in LXC**:
- `renewBoundAction($isDocker=false)` must run FULL network configuration (lines 236-282)
- Execute ifconfig to set IP (line 251)
- Execute route commands for gateway (lines 268-274)
- Add static routes (lines 278-281)
- Set MTU (line 316)

**DHCP Callback Flow**:
1. `/etc/rc/udhcpc_configure` shell script receives DHCP events from udhcpc daemon
2. Calls `php -f /path/to/Udhcpc.php` with action (bound/renew/deconfig)
3. Updates database AND configures network (unless in Docker)
4. Database update triggers `LanInterfaces::afterSave()` which queues network reload

#### Udhcpc6::configure() - IPv6 DHCPv6 Events (Udhcpc6.php lines 49-68)

Same pattern as IPv4:

```php
public function configure(string $action): void
{
    $isDocker = System::isDocker();  // BUG: returns true for LXC

    if ($isDocker) {
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Docker environment - skipping IPv6 network commands, updating database only",
            LOG_DEBUG
        );
    }
}
```

**LXC needs**: Full IPv6 configuration (lines 166-183) including `ifconfig inet6 add` command.

---

### DNS Configuration (DnsConf.php lines 62-163)

#### DnsConf::resolveConfGenerate() - DNS Server Configuration

**Docker Special Handling** (lines 88-98):
```php
// In Docker environment, preserve Docker's embedded DNS server (127.0.0.11)
// This is required for container name resolution within Docker networks
$dockerDns = null;
if (System::isDocker() && file_exists('/etc/resolv.conf')) {
    $currentResolv = file_get_contents('/etc/resolv.conf');
    if (preg_match('/nameserver\s+(127\.0\.0\.11)/', $currentResolv, $matches)) {
        $dockerDns = $matches[1];
        // Add Docker DNS first for container name resolution
        $resolveConf .= "nameserver $dockerDns\n";
    }
}
```

**LXC Requirement**: LXC does NOT use Docker's 127.0.0.11 DNS server. Skip this Docker-specific block for LXC.

---

### Firewall Configuration (CRITICAL FOR LXC)

#### IptablesConf::applyConfig() - Firewall Rules (IptablesConf.php lines 105-166)

**THE BUG** (lines 107-110):
```php
public function applyConfig(): void
{
    // Skip iptables configuration in Docker containers - networking is handled by Docker
    if (System::isDocker()) {
        return;
    }
    // ... apply iptables rules
}
```

**Why this is wrong**:
- Docker: Correct to skip - Docker manages iptables on host for port forwarding
- LXC: WRONG - LXC containers CAN and SHOULD manage their own iptables

**LXC Capability Check**:
LXC containers need kernel capability `CAP_NET_ADMIN` to use iptables. The code should:
1. Check if LXC has iptables capability (try running iptables command)
2. If capable, apply firewall rules normally
3. If not capable, fall back to DockerNetworkFilterService (ACL-based filtering)

#### IptablesConf::dropAllRules() - Flush Rules (IptablesConf.php lines 173-191)

Same issue - skips for Docker, should run for LXC:

```php
private function dropAllRules(): void
{
    // Skip in Docker containers
    if (System::isDocker()) {
        return;
    }
    // ... flush iptables
}
```

#### Fail2BanConf - Intrusion Prevention (Fail2BanConf.php)

Fail2ban uses iptables to block malicious IPs. Currently disabled in Docker (correct) but should work in LXC.

**No explicit Docker check in Fail2BanConf.php**, but it depends on IptablesConf which is disabled in Docker.

**LXC Requirement**: If LXC has iptables capability, enable Fail2ban.

#### DockerNetworkFilterService - ACL-Based Filtering (DockerNetworkFilterService.php lines 236-300)

**Current behavior** (line 239-241):
```php
public static function generateAsteriskNetworkFiltersDenyAcl(): void
{
    if (!System::isDocker()) {
        return;  // Only runs in Docker
    }
    // Generates Asterisk ACL rules from database
}
```

This is a fallback for Docker where iptables is unavailable. It generates Asterisk-level ACL rules.

**LXC Behavior**:
- If LXC has iptables: Use IptablesConf (same as bare-metal)
- If LXC lacks iptables: Use DockerNetworkFilterService (same as Docker)

---

### System Services (NTP, ACPID)

#### NTPConf - Time Synchronization (NTPConf.php lines 63-144)

**THE BUG** (lines 63-69, 118-122, 141-144):
```php
public function generateMonitConf(): bool
{
    // Skip NTP service in Docker containers - time is inherited from host
    if (System::isDocker()) {
        $confPath = $this->getMainMonitConfFile();
        $this->saveFileContent($confPath, '');
        return true;
    }
    // ... configure NTP
}
```

**Why Docker skips NTP**: Docker containers share the host kernel and inherit the host's clock. Setting time inside a container would affect the host (dangerous).

**Why LXC should NOT skip NTP**: LXC containers can synchronize time independently (depending on capabilities). However, most LXC setups share the host clock like Docker.

**Recommended approach**: Keep NTP disabled for LXC initially (same as Docker), but add capability check for future enhancement.

#### ACPIDConf - Power Management (ACPIDConf.php lines 78-107)

**THE BUG** (lines 80-82, 93-95):
```php
public function reStart(): bool
{
    if(System::isDocker()){
        return true;  // Skip in Docker
    }
    // ... start ACPID
}
```

**Why Docker skips ACPID**: Docker containers don't receive ACPI power events from hardware.

**LXC Behavior**: Same as Docker - LXC containers don't receive ACPI events either. Keep disabled for LXC.

---

### User Interface and API

#### Console Menu - EnvironmentHelper.php (lines 32-82)

**Current Implementation**:
```php
public function __construct()
{
    $this->isDocker = System::isDocker();  // BUG: returns true for LXC
    $this->isLiveCd = file_exists('/offload/livecd');
}

public function canConfigureNetwork(): bool
{
    return !$this->isDocker;  // BUG: LXC can configure network
}
```

**LXC Requirement**: `canConfigureNetwork()` should return TRUE for LXC (network configuration is available).

#### Admin UI - Elements.php (lines 54, menu structure)

The admin menu uses `System::isDocker()` to hide/show menu items:

**Example** (hypothetical usage in Elements.php):
```php
if (!System::isDocker()) {
    // Show network configuration menu
}
```

**LXC Requirement**: Network menu should be visible for LXC.

#### REST API - Network Endpoints

**Example**: `src/PBXCoreREST/Lib/Network/SaveConfigAction.php` and `GetConfigAction.php`

These endpoints likely have checks like:
```php
if (System::isDocker()) {
    return ['error' => 'Network configuration disabled in Docker'];
}
```

**LXC Requirement**: These checks should allow LXC through (same as bare-metal).

**Note**: I couldn't read these files in detail, but based on the pattern, they need updating.

---

### Shell Scripts

#### shell_functions.sh - f_umount() (line 200)

```bash
f_umount()
{
    if [ -f '/.dockerenv' ] || [ "$container" = 'lxc' ]; then
        return  # Skip umount in containers
    fi
    # ... umount logic
}
```

**Current behavior**: Skips umount for both Docker and LXC.

**Analysis**: This is likely CORRECT for both. Containers typically don't manage their own storage mounts (host manages them). Unless LXC needs to umount something specific, this can stay as-is.

#### docker-entrypoint (lines 1-78)

Main entry point for Docker container. This script:
1. Sources `shell_functions.sh`
2. Runs `DockerEntrypoint.php`
3. Monitors for restart/shutdown flags

**LXC Behavior**: If LXC uses a similar entrypoint script, it needs to:
- Set `container=lxc` environment variable (already done by LXC runtime)
- NOT rely on Docker-specific features

---

### The Solution Architecture

Instead of binary `isDocker()` checks, introduce **capability-based methods**:

```php
class System
{
    // Detection methods
    public static function isDocker(): bool
    {
        return file_exists('/.dockerenv');  // ONLY Docker, not LXC
    }

    public static function isLxc(): bool
    {
        // Existing implementation (lines 360-374)
    }

    public static function isContainer(): bool
    {
        return self::isDocker() || self::isLxc();  // True for both
    }

    // Capability methods (NEW)
    public static function canManageNetwork(): bool
    {
        // Docker: NO (runtime manages it)
        // LXC: YES (container manages it)
        // Bare-metal: YES
        return !self::isDocker();
    }

    public static function canManageFirewall(): bool
    {
        // Docker: NO (host manages it)
        // LXC: DEPENDS (check CAP_NET_ADMIN)
        // Bare-metal: YES
        if (self::isDocker()) {
            return false;
        }
        if (self::isLxc()) {
            return self::hasIptablesCapability();
        }
        return true;
    }

    private static function hasIptablesCapability(): bool
    {
        // Try running iptables to test capability
        $iptables = Util::which('iptables');
        Processes::mwExec("$iptables -L -n > /dev/null 2>&1", $output, $returnCode);
        return $returnCode === 0;
    }
}
```

---

### Files That Need Changes

**Core System (Priority 1 - Network)**:
- `src/Core/System/System.php` - Add `canManageNetwork()`, fix `isDocker()`
- `src/Core/System/Network.php` - Replace `isDocker()` with `canManageNetwork()`
- `src/Core/System/Udhcpc.php` - Replace `isDocker()` with `canManageNetwork()`
- `src/Core/System/Udhcpc6.php` - Replace `isDocker()` with `canManageNetwork()`
- `src/Core/System/Configs/DnsConf.php` - Skip Docker DNS hack for LXC

**Firewall (Priority 2)**:
- `src/Core/System/System.php` - Add `canManageFirewall()` with capability check
- `src/Core/System/Configs/IptablesConf.php` - Use `canManageFirewall()`
- `src/Core/System/Configs/Fail2BanConf.php` - Use `canManageFirewall()`
- `src/Core/System/DockerNetworkFilterService.php` - Run for `isContainer() && !canManageFirewall()`

**System Services (Priority 3)**:
- `src/Core/System/Configs/NTPConf.php` - Keep disabled for LXC (like Docker)
- `src/Core/System/Configs/ACPIDConf.php` - Keep disabled for LXC (like Docker)

**UI/API (Priority 4)**:
- `src/Core/System/ConsoleMenu/Utilities/EnvironmentHelper.php` - Use `canManageNetwork()`
- `src/AdminCabinet/Providers/AssetProvider.php` - Check for `isContainer()` for display flags
- `src/AdminCabinet/Library/Elements.php` - Use capabilities for menu visibility
- `src/PBXCoreREST/Lib/Network/SaveConfigAction.php` - Use `canManageNetwork()`
- `src/PBXCoreREST/Lib/Network/GetConfigAction.php` - Use `canManageNetwork()`
- REST API firewall endpoints - Use `canManageFirewall()`

**Shell Scripts (Priority 5)**:
- `src/Core/System/RootFS/sbin/shell_functions.sh` - Verify `f_umount()` behavior
- `src/Core/System/RootFS/sbin/docker-entrypoint` - Document LXC compatibility

---

### Testing Strategy

**Docker Regression Testing**:
1. Verify network configuration still skipped
2. Verify firewall still skipped
3. Verify `configureLanInDocker()` still runs
4. Verify Docker DNS 127.0.0.11 preserved

**LXC Functionality Testing**:
1. Network configuration works (static IP, DHCP, IPv6)
2. DNS resolution works
3. Firewall rules apply (if capable)
4. Fail2ban works (if capable)
5. UI shows network menu
6. REST API accepts network config changes

**Bare-Metal Regression Testing**:
1. No changes to existing behavior
2. All network features work
3. All firewall features work

---

### Key Architectural Insights

**Why the current code is structured this way**:
1. MikoPBX was initially designed for bare-metal/VM deployments
2. Docker support was added later by disabling features that Docker runtime manages
3. The assumption was: "All containers are like Docker" → wrong for LXC

**The fundamental difference**:
- **Docker**: Application container - runtime manages everything, app is isolated
- **LXC**: System container - behaves like a lightweight VM, container manages itself
- **MikoPBX in LXC**: Needs full network/firewall control like a VM

**The refactoring principle**:
Replace environment detection (`isDocker()`) with capability detection (`canManageNetwork()`).
This is more maintainable and handles future container types (Podman, systemd-nspawn, etc.).

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [2025-12-24] Task created
