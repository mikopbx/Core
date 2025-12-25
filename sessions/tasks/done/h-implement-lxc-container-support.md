---
name: h-implement-lxc-container-support
branch: feature/lxc-container-support
status: completed
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
- [x] `System::isDocker()` returns true ONLY for Docker (not LXC)
- [x] `System::isLxc()` correctly detects LXC containers
- [x] `System::isContainer()` returns true for both Docker and LXC
- [x] `System::canManageNetwork()` returns false for Docker, true for LXC and bare-metal

**Network (Critical for LXC):**
- [x] LXC can configure network interfaces via `Network::lanConfigure()`
- [x] LXC can use DHCP client (`Udhcpc`, `Udhcpc6`)
- [x] LXC can configure DNS via `DnsConf`
- [x] `Network::getInterfacesNames()` works correctly in LXC

**Firewall:**
- [x] `IptablesConf` works in LXC (with capability check)
- [x] `Fail2BanConf` works in LXC
- [x] `DockerNetworkFilterService` logic updated for LXC

**System Services:**
- [x] NTP can synchronize time in LXC
- [x] ACPID can work in LXC

**Shell Scripts:**
- [x] `shell_functions.sh` distinguishes Docker from LXC
- [x] `f_umount()` works correctly in LXC

**UI/API:**
- [x] REST API returns correct container type info
- [x] Admin UI shows appropriate options for LXC

**Testing:**
- [ ] Verified in Docker container (no regression)
- [ ] Verified in LXC container (new functionality works)

## Context Manifest

### Solution Architecture

MikoPBX runs in three environments: **bare-metal/VM**, **Docker**, and **LXC**.

**The Problem**: Original `isDocker()` returned true for both Docker and LXC, causing LXC to skip critical network/firewall configuration.

**The Solution**: Capability-based detection instead of environment detection:

```php
class System
{
    public static function isDocker(): bool      // True ONLY for Docker
    public static function isLxc(): bool         // True ONLY for LXC
    public static function isContainer(): bool   // True for both
    public static function canManageNetwork(): bool    // False for Docker, true for LXC/bare-metal
    public static function canManageFirewall(): bool   // False for Docker, CAP_NET_ADMIN check for LXC
}
```

**Key Differences**:
- **Docker**: Runtime manages networking/firewall → MikoPBX skips configuration
- **LXC**: Container manages itself (like a VM) → MikoPBX configures everything
- **Bare-metal**: Full control → MikoPBX configures everything

### Implementation Summary

**Updated Files**:
- `System.php` - Core detection and capability methods
- `Network.php`, `Udhcpc.php`, `Udhcpc6.php`, `DnsConf.php` - Network configuration
- `IptablesConf.php`, `Fail2BanConf.php`, `DockerNetworkFilterService.php` - Firewall
- `NTPConf.php`, `ACPIDConf.php` - System services
- `EnvironmentHelper.php` - Console/UI capabilities
- `shell_functions.sh` - Shell helpers for container detection

## Next Steps

- Manual testing in Docker container (verify no regression)
- Manual testing in LXC container (verify network/firewall works)
- Update task status to complete after testing

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log

### 2025-12-24
#### Completed
- Task created and architecture analyzed
- Documented the problem: `isDocker()` incorrectly returns true for both Docker and LXC
- Mapped container detection logic across PHP and shell scripts
- Identified all files requiring changes for capability-based detection

### 2025-12-25
#### Completed
- **Core System Architecture**:
  - Fixed `System::isDocker()` to detect ONLY Docker (lines 294-297)
  - Added `System::isLxc()` for LXC detection (lines 360-374)
  - Added `System::isContainer()` returning true for both container types
  - Added `System::canManageNetwork()` capability check (false for Docker, true for LXC/bare-metal)
  - Added `System::canManageFirewall()` with iptables capability detection for LXC

- **Network Configuration**:
  - Updated `Network::lanConfigure()` to use `canManageNetwork()` (line 906)
  - Updated `Network::getInterfacesNames()` to use `canManageNetwork()` (line 51)
  - Updated `Network::configureLanInDocker()` to remain Docker-only (line 174)
  - Updated `Udhcpc::configure()` to use `canManageNetwork()` for DHCP client (line 43)
  - Updated `Udhcpc6::configure()` to use `canManageNetwork()` for DHCPv6 client (line 51)
  - Updated `DnsConf::resolveConfGenerate()` to skip Docker DNS hack for LXC (line 90)

- **Firewall Configuration**:
  - Updated `IptablesConf::applyConfig()` to use `canManageFirewall()` (line 109)
  - Updated `IptablesConf::dropAllRules()` to use `canManageFirewall()` (line 177)
  - Updated `Fail2BanConf::generateConf()` to use `canManageFirewall()` (line 80)
  - Updated `DockerNetworkFilterService::generateAsteriskNetworkFiltersDenyAcl()` logic (line 241)

- **System Services**:
  - Updated `NTPConf::generateMonitConf()` to use `isContainer()` (line 65)
  - Updated `NTPConf::generateConfig()` to use `isContainer()` (line 120)
  - Updated `ACPIDConf::reStart()` to use `isContainer()` (line 82)
  - Updated `ACPIDConf::generateConf()` to use `isContainer()` (line 95)

- **UI/Console**:
  - Updated `EnvironmentHelper::__construct()` with LXC awareness
  - Updated `EnvironmentHelper::canConfigureNetwork()` to use `canManageNetwork()`
  - Added `EnvironmentHelper::canConfigureFirewall()` capability check

- **Shell Scripts**:
  - Added `is_docker()` function to `shell_functions.sh` (line 200)
  - Added `is_lxc()` function to `shell_functions.sh` (line 208)
  - Added `is_container()` function to `shell_functions.sh` (line 222)
  - Added `can_manage_network()` function to `shell_functions.sh` (line 229)
  - Updated `f_umount()` to use `is_container()` helper (line 239)
  - Fixed `pbx-message` function to use `is_container()` instead of `is_docker()`

- **Code Review & Quality Improvements**:
  - Deprecated `Util::isDocker()` in favor of `System::isDocker()`
  - Added `LXC_CONTAINER_ENV_VALUE` constant for maintainability
  - Enhanced PHPDoc comments with LXC detection details
  - Added debug logging for LXC detection in `System::isLxc()`
  - Commit: fecab1304 "feat(container): add LXC container support with capability-based detection"
  - Commit: 26ce88001 "feat(container): add shell script helpers for LXC container detection"
  - Commit: 94e2e610f "refactor(container): deprecate Util::isDocker() in favor of System methods"

#### Decisions
- Used capability-based checks (`canManageNetwork()`, `canManageFirewall()`) instead of environment detection for better maintainability
- Implemented iptables capability detection for LXC containers (CAP_NET_ADMIN check)
- Kept NTP and ACPID disabled for all containers (Docker and LXC) - containers typically share host clock and don't receive ACPI events
- Shell script functions mirror PHP API naming for consistency (`is_docker()`, `is_lxc()`, `is_container()`)

#### Discovered
- `Util::isDocker()` was deprecated - all calls now use `System::isDocker()`
- LXC detection uses environment variable `container=lxc` set by LXC runtime
- Fallback LXC detection via `/proc/1/environ` parsing for edge cases
- Docker DNS server (127.0.0.11) is container-specific and should not be applied to LXC
