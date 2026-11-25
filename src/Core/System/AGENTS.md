# Core/System — agent guide

System-level services: boot orchestration (`SystemLoader`, `ContainerEntrypoint`), network
and DHCP clients, process/storage helpers, and the rootfs overlay in `RootFS/`.
`CloudProvisioning/` and `Mail/` have their own AGENTS.md. Repo-wide rules: root `AGENTS.md`.

## Runtime detection: use capabilities, not environment checks
- `System::isDocker()` (`/.dockerenv`), `System::isLxc()` (`container=lxc` in env or
  `/proc/1/environ`), `System::isContainer()` = either.
- Branch new code on `System::canManageNetwork()` (false only in Docker) and
  `System::canManageFirewall()` (false in Docker; in LXC requires `CAP_NET_ADMIN`, probed
  by `hasIptablesCapability()`), not on `isDocker()`.
- Shell counterparts in `RootFS/sbin/shell_functions.sh`: `is_docker`, `is_lxc`,
  `is_container`, `can_manage_network` (no firewall variant).
- Docker: networking, iptables and NTP belong to the host; `DnsConf` keeps Docker's
  embedded resolver `127.0.0.11` in `/etc/resolv.conf`. LXC behaves like a VM.

## Network / DHCP conventions
- DHCP callbacks (`Udhcpc`, `Udhcpc6`, invoked from `RootFS/etc/rc/udhcpc_configure` and
  `udhcpc6_configure`) must ALWAYS update `LanInterfaces` in the DB and only skip the
  shell commands when `canManageNetwork()` is false. Otherwise the GUI shows stale IPs.
- `ipv6_mode`: `'0'` off, `'1'` auto (udhcpc6 with SLAAC fallback, `ipv6addr` stays empty
  until bind), `'2'` manual. IPv6 DNS is merged by `DnsConf::resolveConfGenerate()` via
  `Network::getHostDNS6()`.
- Every shell command: resolve binaries with `Util::which()`, wrap arguments in
  `escapeshellarg()`, validate addresses with `IpAddressHelper::isIpv6()` / `Verify`
  before storing, use bound parameters in model queries.

## Gotchas
- `Processes::mwExec()` only echoes the command when `core.debugMode` is on; nothing
  runs. Do not read "success" from a debug-mode run.
- `SystemLoader::startSystem()` order is load-bearing (settings restore -> loopback ->
  redis -> acpid (bare-metal amd64 only) -> beanstalkd -> ... -> storage -> syslog).
  Insert new stages after their dependencies, wrapped in `echoStartMsg`/`echoResultMsg`.
- `RootFS/` is the rootfs overlay shipped in the image. Match the shebang of the script
  you edit: most are `#!/bin/sh` (BusyBox), a few (`pbx_boot_init`) are bash.
- `pbx_boot_init` redirects I/O to `/dev/console` only if a test write succeeds
  (VMware VMs without serial). Serial output goes through `pbx-message` (shell) and
  `SerialConsole` (PHP); both take ports from `pbx-env-detect --serial`.
- A serial port whose output does not drain blocks a plain `open()`/`write()` forever
  (#1412). Never write to `/dev/ttyS*`/`/dev/ttyAMA*` directly: PHP opens with
  `O_NONBLOCK` (`fopen($dev, 'an')`), shell writes run under `busybox timeout -s KILL 1`
  (SIGTERM may be ignored by the caller; the exit code is then 137). Use only `/bin`
  tools or `/bin/busybox <applet>` there: `awk`, `tr`, `stat` live in `/usr`, which is
  not mounted at early boot. Never change termios with `stty` on a live port (it waits
  for the queue to drain); reading with `stty -F dev -a` is fine. A writer that gives up flags the port in
  `/var/run/pbx-serial-disabled/<tty>` until reboot and logs once; `pbx-serial-check`
  shows every port's state, probes it and `--enable`s a flagged one.
- `pbx-env-detect` caches its answer in `/etc/.pbx_env_info` (1 h) and the serial port
  states in `/var/run/pbx-serial-status` (60 s); pass `--nocache` after changing
  detection logic or you will debug the old result.
- `PBX.php` is deprecated and kept only for legacy modules; do not add to it.
