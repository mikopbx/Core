---
name: h-implement-ipv6-application-support
branch: ipv6-support
status: pending
created: 2025-11-19
---

# IPv6 Application Layer Support Implementation

## Problem/Goal
MikoPBX has IPv6 support enabled at the kernel level (6 kernel options including policy routing, NAT66, optimistic DAD, etc.), but the application layer doesn't yet support IPv6 configuration and management. We need to add comprehensive IPv6 support across all network-related modules while maintaining MikoPBX's core principle of simplicity for small business administration.

The goal is to enable administrators to use MikoPBX in IPv6 environments by adding support to:
- Web interface (forms, validation, display)
- Network services configuration (nginx, asterisk, dnsmasq, fail2ban)
- Firewall rules (iptables → ip6tables)
- DHCP and routing scripts
- Cloud provisioning scripts
- Console SSH menu
- NAT and static routes management

## Success Criteria
- [ ] **Web interface supports IPv6 addresses** - All network configuration forms accept and validate IPv6 addresses (with CIDR notation), display them correctly, and handle dual-stack configurations
- [ ] **Core network services configured for IPv6** - nginx, asterisk, dnsmasq, and fail2ban generate correct IPv6 configurations when IPv6 is enabled
- [ ] **Firewall rules support IPv6** - iptables scripts extended to generate equivalent ip6tables rules maintaining security policies
- [ ] **Lua security scripts handle IPv6** - fail2ban and other Lua-based security scripts properly parse and process IPv6 addresses
- [ ] **Routing and DHCP scripts handle IPv6** - Network configuration scripts support IPv6 static routes, DHCPv6, and SLAAC autoconfiguration
- [ ] **Console SSH menu supports IPv6** - Network configuration through SSH console allows IPv6 address entry and displays IPv6 settings
- [ ] **Cloud provisioning works with IPv6** - Provisioning scripts handle IPv6 network configurations for cloud deployments
- [ ] **NAT66 configuration available** - Support for IPv6 NAT (NAT66) configuration where needed
- [ ] **Dual-stack operation** - System can operate in IPv4-only, IPv6-only, or dual-stack modes without conflicts
- [ ] **Input validation prevents errors** - All IPv6 address inputs validated to prevent misconfigurations (invalid formats, wrong CIDR, etc.)
- [ ] **Docker environment compatibility** - IPv6 support works correctly within Docker containers, respecting container networking constraints
- [ ] **Documentation and testing** - IPv6 configuration documented and tested in Docker environment

## Context Manifest

### Executive Summary: Current IPv4-Only Architecture

MikoPBX has a **complete IPv4-only architecture** at the application layer despite having IPv6 kernel support. Every component that handles IP addresses - from database models to Lua security scripts - uses IPv4-specific validation (PHP's `ip2long()`, JavaScript regex `/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/`, Lua CIDR calculations for 32-bit addresses). The system needs systematic IPv6 support added across 10+ subsystems while maintaining the core MikoPBX principle: **simplicity for small business administrators**.

### How Network Configuration Currently Works (IPv4-Only Flow)

#### 1. Web Interface Layer - Dynamic Form Generation

The network configuration page (`/network/modify`) is **entirely dynamically generated via REST API** - not server-rendered HTML. Here's the complete flow:

**Initial Page Load:**
1. PHP controller `NetworkController::modifyAction()` renders an empty form skeleton (just basic fields like hostname, NAT checkbox)
2. JavaScript `networks.initialize()` calls `NetworkAPI.getConfiguration()` which hits `/pbxcore/api/v3/network:get-configuration`
3. REST API `NetworkManagementProcessor::callbackGetConfiguration()` returns JSON with:
   - All LAN interfaces from database (`LanInterfaces` model)
   - PbxSettings for ports (SIPPort, TLS_PORT, etc.)
   - Firewall enabled status
   - Docker environment flag
4. JavaScript `networks.loadConfiguration(response)` **dynamically creates**:
   - Tab menu for each interface (eth0, eth1, VLANs)
   - Form fields for each interface using `DynamicDropdownBuilder` for subnet dropdowns
   - DHCP checkboxes that toggle IP/subnet field states
   - Static routes table via `StaticRoutesManager`

**Critical IPv4 Assumptions in Web Layer:**
- `NetworkEditForm.php` applies `.ipaddress` class which triggers **inputmask IP v4 validation** (`$ipaddressInput.inputmask({alias: 'ip'})`)
- JavaScript validation rules use `type: 'ipaddr'` which validates against IPv4 regex: `/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/`
- Subnet dropdowns generated from CIDR /0-/32 (IPv4 only)
- Network modify form has hardcoded validation: `networks.validateRules.extipaddr` checks `type: 'ipaddrWithPortOptional'`

#### 2. PHP Backend Validation - Model Layer

When the form is submitted, data flows through multiple validation layers:

**LanInterfaces Model Validation** (`src/Common/Models/LanInterfaces.php`):
```php
private function validateIpField(?string $value): bool {
    if (empty($value)) return true;
    return filter_var($value, FILTER_VALIDATE_IP) !== false;  // SUPPORTS IPv6!
}
```

**IMPORTANT:** The model already uses `filter_var()` which supports BOTH IPv4 and IPv6! This is a **major advantage** - database layer is ready for IPv6.

**Verify Class** (`src/Core/System/Verify.php`) - **IPv4-ONLY**:
```php
public static function isIpAddress(string $ipaddr): ?bool {
    $ip_long = ip2long($ipaddr);  // IPv4 ONLY (returns false for IPv6)
    $ip_reverse = long2ip($ip_long);
    return ($ipaddr == $ip_reverse);
}
```

This `Verify::isIpAddress()` method is used in:
- `Network.php` line 141, 967, 978 - Gateway validation, DNS validation
- `NginxConf.php` line 189 - DNS server validation
- `ConsoleMenu.php` line 187 - Console SSH menu IP input
- `Udhcpc.php` - DHCP configuration scripts

#### 3. Network Configuration Application - System Layer

**Network.php - The Core Network Manager:**

The `Network::lanConfigure()` method (line 628-759) is the **central orchestrator** that applies network settings:

**For Each Interface:**
1. Retrieves settings from `LanInterfaces` model via `getGeneralNetSettings()`
2. **VLAN Handling**: If `vlanid > 0`, creates VLAN interface using `vconfig` command (line 662-664)
3. **DHCP Mode** (line 671-705):
   - Kills existing `udhcpc` process
   - Runs `udhcpc` (BusyBox DHCP client) with callbacks to `/etc/rc/udhcpc_configure`
   - The script `Udhcpc.php` handles IP acquisition and calls `Network::udhcpcConfigureRenewBound()`
4. **Static IP Mode** (line 706-745):
   - Uses `SubnetCalculator` to convert CIDR to netmask: `$calc_subnet = new SubnetCalculator($ipaddr, $subnet)`
   - Executes: `ifconfig $if_name $ipaddr netmask $subnet` (IPv4 command format)
   - Executes: `route add default gw $gateway dev $if_name` (IPv4-specific gateway syntax)
5. **Static Routes** (line 756): Calls `addCustomStaticRoutes()` which reads `NetworkStaticRoutes` model

**Static Routes Implementation** (`Network::addCustomStaticRoutes()` line 817-881):
```php
foreach ($staticRoutes as $routeData) {
    $network = trim($routeData->network);   // e.g., "192.168.10.0"
    $subnet = trim($routeData->subnet);     // CIDR bits: "24"
    $gateway = trim($routeData->gateway);   // e.g., "192.168.1.1"

    // IPv4 route command format:
    $command = "$route add -net $network/$subnet gw $gateway";
    if (!empty($iface)) {
        $command .= " dev $iface";
    }
}
```

**Docker Environment Differences:**
- In Docker (`System::isDocker() === true`), `lanConfigure()` and `iptables` operations are **skipped** (line 630, 104 in IptablesConf)
- Docker networking is managed by container runtime
- Only `configureLanInDocker()` runs to sync interface data from container to database (line 70-115)

#### 4. Service Configuration Generators - All IPv4-Specific

**NginxConf.php** (`src/Core/System/Configs/NginxConf.php`):
- Line 189: Validates DNS with `Verify::isIpAddress($ns)` - blocks IPv6 DNS servers
- Generates nginx configuration with `resolver 127.0.0.1;` (IPv4 only)
- Listen directives: `listen $WEBPort;` and `listen $WEBHTTPSPort ssl http2;` (no IPv6 equivalent like `listen [::]:80`)

**Asterisk SIPConf.php** (`src/Core/Asterisk/Configs/SIPConf.php`):
- Line 203-224: `getTopologyData()` retrieves local subnets for NAT configuration
- Uses `SubnetCalculator` to build subnet list: `['127.0.0.1/32', '192.168.1.0/24']`
- These subnets go into pjsip.conf as `local_net=` directives (IPv4 CIDR format)
- External IP stored in `LanInterfaces.extipaddr` is used for `external_media_address` and `external_signaling_address`

**IptablesConf.php** (`src/Core/System/Configs/IptablesConf.php`):
- Line 184: `getIptablesInputRule()` generates: `iptables -A INPUT $other_data $data_port $action`
- Line 212-213: Generates multiport rules for SIP providers:
  ```php
  "iptables -A INPUT -s $host -p tcp -m multiport --dport $this->sipPort,$this->tlsPort -j ACCEPT"
  "iptables -A INPUT -s $host -p udp -m multiport --dport $this->sipPort,$this->rtpPorts -j ACCEPT"
  ```
- Line 272: `makeCmdMultiport()` builds rules with IPv4 subnets: `iptables -A INPUT -s $subnet -p $protocol...`
- **No ip6tables equivalent** - IPv6 traffic would be unfiltered

**Fail2BanConf.php** (`src/Core/System/Configs/Fail2BanConf.php`):
- Line 393: `generateConf()` sets `allowipv6 = auto` in fail2ban.conf (feature flag exists!)
- Line 465-511: `generateActions()` creates iptables actions for banning IPs
- **In Docker** (line 470-488): Uses custom actions that call `/etc/rc/fail2ban_asterisk ban <ip>` and `/etc/rc/fail2ban_nginx ban <ip>`
- Line 799-836: `banIpAsterisk()` adds IPs to Redis and regenerates Asterisk ACL files
- Line 878-994: `generateUnifiedFail2BanAcl()` creates ACL configuration for PJSIP, Manager, IAX

**Critical Fail2ban Flow:**
1. Fail2ban detects failed login (regex in filter files like `asterisk-main.conf`)
2. Triggers action: either iptables (non-Docker) or custom script (Docker)
3. Custom script calls `Fail2BanConf::fail2banAction('ban', $ip)`
4. IP added to Redis: `DockerNetworkFilterService::addBlockedIp($ip, 'sip', $banTime)`
5. Regenerates ACL files:
   - `/etc/asterisk/fail2ban_sip_acl.conf`: Named ACL for PJSIP (line 921-943)
   - `/etc/asterisk/fail2ban_manager_deny.conf`: Deny rules for AMI (line 946-962)
   - `/etc/asterisk/fail2ban_iax_deny.conf`: Deny rules for IAX (line 964-986)
6. Reloads PJSIP/Manager/IAX via `WorkerModelsEvents::invokeAction(ReloadPJSIPAction::class)`

**ACL File Format (IPv4 CIDR):**
```ini
[acl_fail2ban]
permit=127.0.0.1/255.255.255.255
permit=::1  ; IPv6 localhost already supported!
deny=192.168.1.100/255.255.255.255  ; Banned IPv4
```

#### 5. Lua Security Scripts - IPv4 CIDR Math Only

**unified-security.lua** (`src/Core/System/RootFS/etc/nginx/mikopbx/lua/unified-security.lua`):

This Lua script runs on **every HTTP request** when firewall is enabled. Critical IPv4-only function:

**Line 112-145: `ip_in_network()` function** - Checks if IP matches CIDR:
```lua
local function ip_in_network(ip, network)
    -- Parse CIDR: "192.168.1.0/24"
    local net_addr = string.sub(network, 1, pos - 1)
    local mask_bits = tonumber(string.sub(network, pos + 1))

    -- Convert IPv4 dotted decimal to 32-bit number
    local function ip_to_number(addr)
        local a, b, c, d = addr:match("(%d+)%.(%d+)%.(%d+)%.(%d+)")
        return tonumber(a) * 16777216 + tonumber(b) * 65536 + tonumber(c) * 256 + tonumber(d)
    end

    -- Calculate subnet mask and compare
    local mask = 0
    for i = 1, mask_bits do
        mask = mask + 2^(32 - i)  -- IPv4 32-bit mask
    end

    return (ip_num - ip_num % 2^(32 - mask_bits)) == (net_num - net_num % 2^(32 - mask_bits))
end
```

**This function is used for:**
- Line 387: Checking whitelist: `if allowed_ip == client_ip or ip_in_network(client_ip, allowed_ip)`
- IPv6 addresses would **fail** the regex match and return false

**Other Lua Scripts:**
- `access-nchan.lua`: WebSocket JWT validation (checks localhost with `ip == "127.0.0.1" or ip == "::1"`)
- `fail-auth.lua`: Failed authentication tracking (line 25: gets `client_ip = ngx.var.http_x_real_ip or ngx.var.remote_addr`)

#### 6. Database Models - Ready for IPv6!

**NetworkStaticRoutes Model** (`src/Common/Models/NetworkStaticRoutes.php`):
```php
public ?string $network = '';   // Network address (e.g., "192.168.10.0")
public ?string $subnet = '24';  // Subnet mask in CIDR notation (0-32)
public ?string $gateway = '';   // Gateway IP address

// Validation (line 119-156):
private function validateIpField(?string $value): bool {
    if (empty($value)) return false;
    return filter_var($value, FILTER_VALIDATE_IP) !== false;  // IPv6-ready!
}

private function validateSubnetField(?string $value): bool {
    $intValue = (int)$value;
    return ($intValue >= 0 && $intValue <= 32);  // IPv4-only (0-128 for IPv6)
}
```

**NetworkFilters Model** (`src/Common/Models/NetworkFilters.php`):
```php
public ?string $permit = '';  // Permitted IP addresses or networks (CIDR format)
public ?string $deny = '';    // Denied IP addresses or networks
public ?string $newer_block_ip = '0';  // Trusted list (never blocked by Fail2Ban)
public ?string $local_network = '0';   // Local subnet flag
```

Used in:
- Firewall rules (permit/deny lists)
- SIP endpoint ACLs
- Asterisk Manager ACLs
- Fail2ban whitelist (line 732-738 in Fail2BanConf)

#### 7. Console SSH Menu - IPv4 Validation Only

**ConsoleMenu.php** (`src/Core/System/ConsoleMenu.php`):

Line 171-261: `setupLanManual()` prompts administrator to configure network via SSH console:

```php
// Line 184-189: IP validation using Verify::isIpAddress (IPv4-only)
$input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
    public function validate(string $input): bool {
        return Verify::isIpAddress($input);  // Rejects IPv6!
    }
};

// Line 200-211: Subnet mask validation (1-32 bits for IPv4)
$input_bits = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
    public function validate(string $input): bool {
        return (is_numeric($input) && ($input >= 1) && ($input <= 32));  // No /64, /128 for IPv6
    }
};
```

The console menu is critical for **initial system configuration** when web interface is not accessible.

#### 8. Cloud Provisioning and Deployment Scripts

**DHCP Configuration** (`src/Core/System/RootFS/etc/rc/udhcpc_configure`):
- Shell script called by BusyBox `udhcpc` DHCP client
- Sets environment variables: `$ip`, `$subnet`, `$router`, `$dns`
- Calls PHP: `/usr/bin/php -f /var/www/src/Core/System/Udhcpc.php` with action (deconfig/bound/renew)

**Udhcpc.php** (`src/Core/System/Udhcpc.php`):
```php
public static function udhcpcConfigureRenewBound(string $interface, ...) {
    // Update LanInterfaces model with DHCP-acquired values
    $data['ipaddr'] = $ip;
    $data['subnet'] = $network->netMaskToCidr($subnet);  // Convert 255.255.255.0 -> 24
    $data['gateway'] = $router;

    $network->updateIfSettings($data, $interface);
}
```

**netMaskToCidr()** (`Network.php` line 211-221) - **IPv4-specific**:
```php
public function netMaskToCidr(string $net_mask): int {
    $bits = 0;
    $net_mask = explode(".", $net_mask);  // Assumes dotted-decimal
    foreach ($net_mask as $oct_ect) {
        $bits += strlen(str_replace("0", "", decbin((int)$oct_ect)));
    }
    return $bits;
}
```

#### 9. Docker-Specific Network Handling

**DockerNetworkFilterService** (`src/Core/System/DockerNetworkFilterService.php`):
- Manages Redis-based IP blocking for Docker environments (no iptables access)
- `addBlockedIp($ip, $category, $ttl)`: Stores in Redis key `_PH_REDIS_CLIENT:firewall:blocked:$category:$ip`
- `getBlockedIps($category)`: Retrieves all blocked IPs for category (sip/ami/iax/http)
- `isIpWhitelisted($ip)`: Checks against whitelist in Redis
- **IPv6 Note**: Uses string storage - **already supports IPv6 addresses** in Redis keys!

### What Needs to Connect: IPv6 Integration Points

To add IPv6 support while maintaining MikoPBX's simplicity, we need to extend (not replace) existing systems:

#### 1. Dual-Stack Validation Strategy

**PHP Layer:**
- Extend `Verify::isIpAddress()` to support both IPv4 and IPv6:
  ```php
  public static function isIpAddress(string $ipaddr, int $flags = FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6): ?bool {
      return filter_var($ipaddr, FILTER_VALIDATE_IP, $flags) !== false;
  }
  ```
- Add `Verify::getIpVersion($ip)`: Returns 4, 6, or false
- Add `Verify::isIpv4()` and `Verify::isIpv6()` for explicit checks

**JavaScript Layer:**
- Add new validation rule `ipv6addr` alongside existing `ipaddr`
- Add dual-stack rule `ipaddress` that accepts both
- Update inputmask to support IPv6 format: `inputmask({alias: 'ipaddress', ipversion: 'both'})`
- Extend CIDR subnet dropdowns: /0-/32 (IPv4) and /0-/128 (IPv6)

**Model Layer:**
- `NetworkStaticRoutes::validateSubnetField()`: Check `$intValue <= 128` if IPv6 detected
- `LanInterfaces`: Already uses `filter_var()` - **no changes needed!**

#### 2. Network Configuration Commands - Dual Commands

**Static IP Configuration:**
Current IPv4:
```bash
ifconfig eth0 192.168.1.100 netmask 255.255.255.0
route add default gw 192.168.1.1 dev eth0
```

Add IPv6 equivalent:
```bash
ip -6 addr add 2001:db8::100/64 dev eth0
ip -6 route add default via 2001:db8::1 dev eth0
```

**Implementation in `Network::lanConfigure()`:**
- Detect IP version with `filter_var($ipaddr, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)`
- Use `ip` command (modern, supports both) instead of `ifconfig`/`route` (legacy, IPv4-only)
- For static routes: Check `NetworkStaticRoutes.network` IP version and use appropriate `ip` command

#### 3. Service Configuration - Listen on Both Stacks

**Nginx:**
```nginx
listen 80;
listen [::]:80;  # Add IPv6 listener

listen 443 ssl http2;
listen [::]:443 ssl http2;
```

**Asterisk PJSIP:**
```ini
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
; Add IPv6 transport
[transport-udp-ipv6]
type=transport
protocol=udp
bind=[::]:5060
```

**Implementation:**
- `NginxConf::generateConf()`: Add IPv6 listen directives if IPv6 interface exists
- `SIPConf.php`: Generate separate IPv6 transport if `LanInterfaces` has IPv6 address

#### 4. Firewall - ip6tables Parallel Rules

**Current iptables flow:**
```php
// IptablesConf::addMainFirewallRules()
"iptables -A INPUT -s 192.168.1.0/24 -p tcp --dport 5060 -j ACCEPT"
```

**Add ip6tables equivalent:**
```php
if (Verify::isIpv6($subnet)) {
    $arr_command[] = "ip6tables -A INPUT -s $subnet -p $protocol $other_data -j ACCEPT";
} else {
    $arr_command[] = "iptables -A INPUT -s $subnet -p $protocol $other_data -j ACCEPT";
}
```

**In Docker** - use same Redis-based blocking (already supports IPv6 strings)

#### 5. Lua Scripts - IPv6 CIDR Calculation

**Current IPv4 CIDR math** (`unified-security.lua` line 126-144):
```lua
-- Convert 192.168.1.100 to 3232235876 (32-bit number)
local ip_num = tonumber(a) * 16777216 + tonumber(b) * 65536 + tonumber(c) * 256 + tonumber(d)
```

**Add IPv6 support**:
```lua
local function is_ipv6(ip)
    return string.find(ip, ":")
end

local function ipv6_in_network(ipv6, network)
    -- Parse 2001:db8::1/64
    -- Convert to 128-bit comparison
    -- Use luasocket or resty.iputils library
end

local function ip_in_network(ip, network)
    if is_ipv6(ip) or is_ipv6(network) then
        return ipv6_in_network(ip, network)
    else
        -- Existing IPv4 logic
    end
end
```

**Library Option**: Use `lua-resty-iputils` (already available in OpenResty) which handles IPv6 CIDR natively

#### 6. Console Menu - Dual Input Validation

**Current SSH menu** (`ConsoleMenu.php` line 184):
```php
$input_ip = new class extends Text {
    public function validate(string $input): bool {
        return Verify::isIpAddress($input);  // IPv4-only
    }
};
```

**Update to accept both:**
```php
$input_ip = new class extends Text {
    public function validate(string $input): bool {
        return Verify::isIpAddress($input, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6);
    }
};

// Subnet prompt:
$input_bits = new class extends Text {
    public function validate(string $input): bool {
        // Allow 1-32 (IPv4) or 1-128 (IPv6)
        return (is_numeric($input) && ($input >= 1) && ($input <= 128));
    }
};
```

Display message: "Subnet masks: IPv4 (1-32) or IPv6 (1-128) as in CIDR notation"

#### 7. DHCP - DHCPv6 and SLAAC Support

**Current**: `udhcpc` (BusyBox DHCP client) - IPv4 only

**For IPv6**:
- **SLAAC (Stateless Address Autoconfiguration)**: Automatically enabled in Linux kernel when interface comes up
- **DHCPv6**: Use `dhcp6c` or similar client (check if available in MikoPBX's BusyBox build)
- Detection: If interface has IPv6 address starting with `fe80::` (link-local), SLAAC is working
- If DHCPv6 is needed, run parallel to udhcpc with separate callback script

**Implementation:**
```php
// Network::lanConfigure()
if ($if_data['dhcp'] === '1') {
    // Existing udhcpc for IPv4
    Processes::mwExecBg("udhcpc -i $if_name ...");

    // Add DHCPv6 if enabled
    if ($if_data['enable_ipv6'] === '1') {
        Processes::mwExecBg("dhcp6c -c /etc/dhcp6c.conf $if_name");
    }
}
```

#### 8. Static Routes - Detect IP Version

**Current** (`Network::addCustomStaticRoutes()`):
```php
$command = "$route add -net $network/$subnet gw $gateway";
```

**Update**:
```php
$isIpv6 = filter_var($routeData->network, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);

if ($isIpv6) {
    $command = "/sbin/ip -6 route add $network/$subnet via $gateway";
} else {
    $command = "/sbin/ip route add $network/$subnet via $gateway";
}

if (!empty($iface)) {
    $command .= " dev $iface";
}
```

#### 9. NAT Configuration - NAT66 Support

**Current NAT** (`LanInterfaces.topology === 'public'` triggers external IP usage in PJSIP):
```ini
external_media_address=203.0.113.5
external_signaling_address=203.0.113.5
```

**For IPv6**:
- NAT66 is **rare** (IPv6 was designed to eliminate NAT)
- Most deployments use **public IPv6 addresses directly**
- If NAT66 is needed (cloud environments), same `external_*` directives work:
  ```ini
  external_media_address=2001:db8::5
  ```

**Implementation**: No changes needed in PJSIP config generation - already supports any IP in `extipaddr` field

#### 10. Docker Networking - Container IPv6 Stack

**Current Docker setup**:
- Container has IPv4 address assigned by Docker bridge
- `configureLanInDocker()` syncs container IP to database
- Firewall rules skipped (Docker manages networking)

**For IPv6 in Docker**:
- Enable IPv6 in Docker daemon: `docker network create --ipv6 --subnet=2001:db8::/64 mikopbx-net`
- Container can have dual-stack addresses
- Same sync logic in `configureLanInDocker()` - `ifconfig` shows both IPv4 and IPv6
- Parse both: `inet 172.17.0.2` and `inet6 2001:db8::2`

### Technical Reference: Implementation Checklist

#### A. Database Schema (No Changes Needed!)

All IP address fields are `string` types - already support IPv6:
- `LanInterfaces`: `ipaddr`, `gateway`, `extipaddr`, `primarydns`, `secondarydns` (all `VARCHAR`)
- `NetworkStaticRoutes`: `network`, `gateway` (all `VARCHAR`)
- `NetworkFilters`: `permit`, `deny` (all `VARCHAR`)

**CRITICAL**: `NetworkStaticRoutes.subnet` field stores CIDR bits as string (currently validated 0-32). Need to extend validation to 0-128 for IPv6.

#### B. PHP Functions to Create/Modify

**New Helper Class**: `src/Core/Utilities/IpAddressHelper.php`
```php
class IpAddressHelper {
    public static function getIpVersion(string $ip): int|false;
    public static function isIpv4(string $ip): bool;
    public static function isIpv6(string $ip): bool;
    public static function normalizeCidr(string $cidr): array; // Returns [ip, prefix_length, version]
    public static function ipInNetwork(string $ip, string $cidr): bool; // Dual-stack CIDR check
}
```

**Extend Existing**:
- `Verify::isIpAddress()`: Add `$flags` parameter (default both IPv4+IPv6)
- `Network::netMaskToCidr()`: Add IPv6 mask conversion (though IPv6 doesn't use dotted masks)
- `SubnetCalculator`: Already has IPv6 support in v1.4+ (check vendor version)

**Modify**:
- `Network::lanConfigure()`: Detect IP version and use `ip` command for IPv6
- `Network::addCustomStaticRoutes()`: Check route IP version and use appropriate command
- `ConsoleMenu::setupLanManual()`: Update validation ranges and messages
- `Udhcpc.php`: Handle IPv6 addresses from DHCPv6 (if implemented)

#### C. JavaScript Files to Modify

**Validation Rules** (`sites/admin-cabinet/assets/js/src/Network/network-modify.js`):
```javascript
// Add new validation rules
$.fn.form.settings.rules.ipv6addr = function(value) {
    // Regex for IPv6: supports :: compression, full addresses, etc.
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::)$/;
    return ipv6Regex.test(value);
};

$.fn.form.settings.rules.ipaddress = function(value) {
    // Accepts both IPv4 and IPv6
    return $.fn.form.settings.rules.ipaddr(value) || $.fn.form.settings.rules.ipv6addr(value);
};
```

**Input Masks** (use library that supports IPv6 like `jquery.inputmask` with IP extension):
```javascript
networks.$ipaddressInput.inputmask({
    alias: 'ip',
    ipversion: 'both'  // or 'ipv4', 'ipv6'
});
```

**Subnet Dropdowns** (`DynamicDropdownBuilder` usage):
```javascript
// Detect interface IP version and generate appropriate subnet options
const isIpv6 = detectIpVersion(interfaceData.ipaddr);
const subnetOptions = isIpv6
    ? generateOptions(0, 128)  // IPv6 /0 to /128
    : generateOptions(0, 32);  // IPv4 /0 to /32
```

#### D. Configuration Generators

**NginxConf.php** (`src/Core/System/Configs/NginxConf.php`):
```php
protected function generateConf(): void {
    $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);

    // IPv4 listener
    $config = "listen $webPort;\n";

    // Check if any IPv6 interfaces exist
    if ($this->hasIpv6Interfaces()) {
        $config .= "listen [::]:$webPort;\n";
    }

    // Same for HTTPS
    $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
    $config .= "listen $httpsPort ssl http2;\n";
    if ($this->hasIpv6Interfaces()) {
        $config .= "listen [::]:$httpsPort ssl http2;\n";
    }
}
```

**IptablesConf.php**:
```php
private function getFirewallRule(string $subnet, ...): string {
    if (IpAddressHelper::isIpv6($subnet)) {
        return "ip6tables -A INPUT -s $subnet ...";
    } else {
        return "iptables -A INPUT -s $subnet ...";
    }
}
```

**SIPConf.php** (add IPv6 transport):
```php
protected function generateTransportConf(): string {
    $conf = $this->generateTransportIpv4();  // Existing

    if ($this->hasIpv6Interfaces()) {
        $conf .= $this->generateTransportIpv6();  // New
    }

    return $conf;
}
```

#### E. Lua Scripts

**unified-security.lua**:
```lua
-- Add at top
local iputils = require "resty.iputils"

-- Replace ip_in_network() function
local function ip_in_network(ip, network)
    -- Use iputils.ip_in_cidrs() which handles both IPv4 and IPv6
    local cidrs = iputils.parse_cidrs({network})
    return iputils.ip_in_cidrs(ip, cidrs)
end
```

**Alternative** (if iputils not available): Implement IPv6 CIDR manually using bit operations

#### F. Console Menu

**ConsoleMenu.php**:
```php
// IP input validator
$input_ip = new class extends Text {
    public function validate(string $input): bool {
        return filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6) !== false;
    }
};

// Subnet bits validator
$input_bits = new class extends Text {
    public function validate(string $input): bool {
        // Detect if user is configuring IPv6 based on IP format
        // For simplicity, accept 1-128 range
        return (is_numeric($input) && ($input >= 1) && ($input <= 128));
    }
};

// Update prompt messages
$elDialog = $input_bits
    ->setPromptText('Enter subnet mask bits (IPv4: 1-32, IPv6: 1-128): ')
    ->ask();
```

#### G. Translation Keys to Add

Add to `src/Common/Messages/en/Network.php` (and all 28 other languages):
```php
'nw_IPv6Enabled' => 'Enable IPv6',
'nw_IPv6Address' => 'IPv6 Address',
'nw_IPv6Gateway' => 'IPv6 Gateway',
'nw_IPv6PrimaryDNS' => 'Primary IPv6 DNS',
'nw_IPv6SecondaryDNS' => 'Secondary IPv6 DNS',
'nw_ValidateIPv6AddressEmpty' => 'IPv6 address cannot be empty',
'nw_ValidateIPv6AddressInvalid' => 'Invalid IPv6 address format',
'nw_IPv6SubnetRange' => 'IPv6 subnet must be between 1 and 128',
'nw_DHCPv6Enabled' => 'Enable DHCPv6 (IPv6 automatic configuration)',
```

#### H. UI Components

**Network Interface Form** (dynamically generated in JS):
```javascript
// For each interface, add IPv6 section:
<div class="field">
    <div class="ui checkbox">
        <input type="checkbox" name="enable_ipv6_${eth}" id="enable-ipv6-${eth}">
        <label>Enable IPv6</label>
    </div>
</div>

<div class="ipv6-settings" style="display: none;">  // Toggle based on checkbox
    <div class="field">
        <label>IPv6 Address</label>
        <input type="text" name="ipv6addr_${eth}" class="ipv6address">
    </div>

    <div class="field">
        <label>IPv6 Prefix Length</label>
        <!-- Dropdown: /1 to /128 -->
    </div>

    <div class="field">
        <label>IPv6 Gateway</label>
        <input type="text" name="ipv6gateway_${eth}" class="ipv6address">
    </div>
</div>
```

**Static Routes Table**:
- Add "IP Version" column (auto-detect from network address)
- Validation: If IPv6 detected, enforce /1-/128 range

### Deployment Strategy

**Phase 1: Foundation (Backend)**
1. Create `IpAddressHelper` class with dual-stack utilities
2. Extend `Verify::isIpAddress()` to support both
3. Update all models' validation (already mostly done via `filter_var()`)
4. Add database migration to extend `NetworkStaticRoutes.subnet` validation

**Phase 2: System Layer**
1. Update `Network::lanConfigure()` to use `ip` command instead of `ifconfig`/`route`
2. Implement IPv6 static routes in `addCustomStaticRoutes()`
3. Update console menu validators

**Phase 3: Service Configurations**
1. Nginx: Add IPv6 listeners
2. Asterisk: Add IPv6 transports
3. Firewall: Generate ip6tables rules
4. Fail2ban: Test IPv6 ACLs (already supported)

**Phase 4: Security (Lua)**
1. Integrate `lua-resty-iputils` or implement IPv6 CIDR matching
2. Update `unified-security.lua`

**Phase 5: Frontend**
1. Add IPv6 validation rules to JavaScript
2. Update input masks to support IPv6
3. Extend subnet dropdowns (conditional based on IP version)
4. Add IPv6 toggle/section to interface forms

**Phase 6: Testing**
1. Unit tests for `IpAddressHelper`
2. Integration tests for network configuration
3. Manual testing in Docker with dual-stack
4. Test console menu with IPv6 input

### Key Architectural Decisions

**1. Dual-Stack Not Replacement**: Keep IPv4 working exactly as before. Add IPv6 as parallel capability.

**2. Auto-Detection Over Configuration**: Detect IP version from address format (presence of `:`) rather than requiring user to specify "IPv4" or "IPv6" mode.

**3. Graceful Degradation**: If IPv6 command fails (e.g., kernel module not loaded), log error but don't break IPv4 functionality.

**4. Simple UI**: Don't overwhelm small business admin with complexity. Show IPv6 fields only when needed (toggle/accordion).

**5. Docker Awareness**: Different networking rules in Docker. Document that IPv6 in Docker requires `--ipv6` daemon flag and proper network configuration.

### Potential Gotchas

**1. BusyBox Command Differences**: BusyBox `ip` command may have fewer features than full iproute2. Test thoroughly.

**2. Kernel IPv6 Disabled**: Some systems boot with `ipv6.disable=1`. Need to detect and warn user.

**3. IPv6 Address Format Variations**: `::1`, `::ffff:192.0.2.1` (IPv4-mapped), `fe80::1%eth0` (link-local with scope). Validation must handle all forms.

**4. Subnet Calculator Library**: Check if composer-installed `SubnetCalculator` supports IPv6. May need to upgrade version or find alternative.

**5. Lua Library Availability**: `lua-resty-iputils` may not be in OpenResty distribution. May need to bundle or implement manually.

**6. Translation Workload**: 29 languages × ~10 new keys = 290 translations. Use automation (DeepL API) with manual review.

**7. DHCPv6 Client**: BusyBox may not include DHCPv6. Check build configuration or document as optional.

**8. Firewall Complexity**: ip6tables rules must mirror iptables. Easy to miss a rule and leave port open.

**9. Testing IPv6**: Requires real IPv6 connectivity or proper IPv6 emulation in test environment.

**10. Documentation**: Administrators need clear guidance on when to use IPv6, how to configure dual-stack, and what to do if things break.

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
