# CloudProvisioning — agent notes

Providers in this directory are driven by the orchestrator one level up,
`src/Core/System/CloudProvisioning.php`; the provider list and detection order live
there, not here. Repo-wide rules are in the root `AGENTS.md`.

## Boot ordering (do not move things between phases)
- `applyEarlyOverrides()` runs from `SystemLoader` before Redis starts. Only file I/O is
  allowed there (Docker port ENV -> `/etc/inc/mikopbx-settings.json`). It is followed by
  `ConfigProvider::recreateConfigProvider()`; skipping that leaves the DI config stale (#982).
- `start()` runs after Redis and before SSH. Docker/LXC "every start" overrides go first
  and may use the ORM; the one-time `provision()` path must stay ORM-free and use the
  `*Direct()` SQLite helpers, because it can run before the ORM metadata cache is usable.
- `provision()` for Docker/LXC only confirms the environment; real work happens in the
  every-start overrides. Provisioning is never re-run once `CLOUD_PROVISIONING=1`; LXC
  credentials (`/etc/shadow` hash, authorized_keys) are also gated on that flag.
- Both phases are skipped entirely in recovery mode.

## Gotchas
- Direct SQLite goes through the `sqlite3` CLI. `loadPbxSettingsDirectly()` splits output
  on newlines and `|`, so multi-line or pipe-containing values (SSH keys) read back
  truncated. Never read those back via `getPbxSettingDirect()`.
- SQL values are escaped by quote doubling; `escapeshellarg()` wraps the whole statement
  for the shell. Keys are whitelisted (PbxSettings constants / `VALID_LAN_COLUMNS`) —
  keep both checks when adding a direct write.
- Mixing `*Direct()` writes with ORM writes in the same run (LxcCloud does) bypasses the
  ORM cache; do not read a Direct-written key through the ORM afterwards.
- Docker/LXC ENV variable names are the PbxSettings constant NAMES (`PBX_NAME`,
  `WEB_ADMIN_PASSWORD`, ...), resolved by reflection. `fromEnvironment()` does no
  validation; only YAML/JSON user-data is validated/sanitized.
- `fromYaml()` silently returns null without the `yaml` extension; tests skip in that case.
- `CLOUD_INSTANCE_ID` intentionally stores the plain-text initial password (used for
  "default password" detection). It is set only when `shouldSetCloudInstanceId()` is true,
  which is decided by class basename (Docker/NoCloud/Lxc excluded). New providers
  need a `CloudID` constant and, if the instance id must not leak, an override.
- `resetLanInterface()` must preserve DHCP-obtained ipaddr/gateway/dns; only reset
  interface/internet/disabled/dhcp/vlanid.
- LXC: read `/etc/resolv.conf` before `Network::lanConfigure()`, which overwrites it.
- NoCloud HTTP seeds block private IPs unless `NOCLOUD_ALLOW_PRIVATE_IPS=1`; keep that
  guard. Provider HTTP checks share `HTTP_TIMEOUT` (3 s); detection runs in parallel, so
  a slow `checkAvailability()` delays boot for everyone.
- `markProvisioningCompleteDirect()` also force-enables firewall and fail2ban.

## Tests
`tests/Core/System/CloudProvisioning/` (Docker, NoCloud, ProvisioningConfig). Some cases
skip when run inside Docker because real MikoPBX ENV vars are present.
