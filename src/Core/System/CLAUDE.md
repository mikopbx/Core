# CLAUDE.md — Core/System (networking, container detection, boot)

System-level utilities: network configuration (IPv4/IPv6), DHCP clients, DNS,
container/capability detection, and boot orchestration.

> Cloud provisioning has its own guide: [CloudProvisioning/CLAUDE.md](CloudProvisioning/CLAUDE.md).

## Container & Capability Detection

MikoPBX uses **capability-based** detection instead of binary environment checks.
Implemented in `System` (`src/Core/System/System.php`):

- `isDocker()` — true ONLY for Docker (checks `/.dockerenv`)
- `isLxc()` — true ONLY for LXC (checks `container=lxc` env var)
- `isContainer()` — true for both Docker and LXC
- `canManageNetwork()` — false for Docker, true for LXC/bare-metal
- `canManageFirewall()` — false for Docker, checks iptables capability for LXC

Matching shell functions in `/sbin/shell_functions.sh`: `is_docker()`, `is_lxc()`,
`is_container()`, `can_manage_network()`.

### Docker vs LXC vs Bare-Metal

| Feature | Docker | LXC | Bare-Metal |
|---------|--------|-----|------------|
| Boot Console | Runtime | /dev/tty1 | Smart detect |
| Serial Output | Skipped | Skipped | Auto-detect |
| Network Config | Runtime | Container | Container |
| DHCP Client | Skipped | Supported | Supported |
| IPv6 Auto (DHCPv6) | Skipped | Supported | Supported |
| Firewall (iptables) | Host | Container* | Container |
| DNS Config | 127.0.0.11 | Container | Container |
| NTP Sync | Host | Host | Container |
| ACPI Events | N/A | N/A | Supported |

*LXC firewall requires `CAP_NET_ADMIN` capability.

When running in LXC, MikoPBX has full capabilities: static IP / DHCP, IPv4 udhcpc,
IPv6 udhcpc6 with SLAAC fallback, DNS configuration, iptables (if `CAP_NET_ADMIN`),
and fail2ban.

## IPv6 Implementation

**Modes** (configured via `LanInterfaces` model, `m_LanInterfaces` table):
- **Mode 0 (Off)**: IPv6 disabled on interface
- **Mode 1 (Auto)**: DHCPv6 with SLAAC fallback (enterprise autoconfiguration)
- **Mode 2 (Manual)**: Static IPv6 address and gateway

**Mode 1 (Auto) — DHCPv6 + SLAAC:**
- Primary: DHCPv6 stateful client (BusyBox udhcpc6) obtains address from server
- Fallback: SLAAC continues when DHCPv6 server unavailable
- Both addresses coexist on the same interface (dual addressing)
- Priority: DHCPv6 preferred over SLAAC per RFC 6724
- DNS: IPv6 nameservers obtained via DHCPv6 options (merged into `/etc/resolv.conf`)

**Key classes/methods:**
- `Network::configureIpv6Interface()` — configures interface per mode
- `Network::lanConfigure()` — orchestrates network config on boot and on change
- `Udhcpc6::configure()` — handles DHCPv6 events (bound/renew/deconfig)
- `DnsConf::resolveConfGenerate()` — merges IPv4/IPv6 DNS servers
- `Network::getHostDNS6()` — retrieves IPv6 DNS from LanInterfaces

**`m_LanInterfaces` IPv6 columns:**
- `ipv6_mode`: '0'=Off, '1'=Auto, '2'=Manual
- `ipv6addr`: IPv6 address (empty in Auto until DHCPv6 binds)
- `ipv6_subnet`: prefix length (1-128)
- `ipv6_gateway`: IPv6 gateway (optional, DHCPv6 uses RA)
- `primarydns6`, `secondarydns6`: IPv6 DNS servers

**Security:**
- Shell argument escaping via `escapeshellarg()` in all network commands
- Parameterized SQL queries in DHCP callback handlers
- Validation via `IpAddressHelper::isIpv6()` before database storage

**Container handling:** DHCP callbacks always update the database (fixes stale-IP
display bug); the actual network commands are skipped in Docker, executed in
LXC/bare-metal.

## DHCP Callback Pattern

- IPv4: `Udhcpc` handles udhcpc events via `/etc/rc/udhcpc_configure`
- IPv6: `Udhcpc6` handles udhcpc6 events via `/etc/rc/udhcpc6_configure`
- Database is always synchronized regardless of Docker; network commands are
  conditional on execution context.

## Boot System & Smart Console

Boot orchestration scripts (rootfs, `/sbin` and `/etc/rc`):
- `/sbin/pbx_boot_init` — main boot orchestrator with smart console redirect
- `/sbin/mountoffload` — partition 2 (rootfs) mount with disk detection
- `/etc/rc/mountconfdir` — partition 3 (config database) mount
- `/sbin/pbx-message` — unified message handler (console + serial output)

**Smart console:** `pbx_boot_init` tests `/dev/console` accessibility (writes the
version string as an early diagnostic marker) before redirecting — this prevents
boot failures on VMware VMs without a serial console. Output routing:
- Console: always via stdout
- Serial: container-aware — skipped in Docker (runtime manages console) and LXC
  (stdout already to /dev/tty1); bare-metal auto-detects the serial port (cached)

Universal compatibility: bare-metal (IPMI/serial), VMware (with/without serial),
KVM/QEMU, Docker, LXC — no configuration changes required.
