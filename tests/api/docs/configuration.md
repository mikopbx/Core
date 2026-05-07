# Configuration

The test suite reads its configuration from `tests/api/.env` via `config.py`.
There is no Docker-specific code path: the same suite runs against a local
container, an LXC system container, a VM installed from ISO, or a cloud
deployment. Differences are expressed entirely through environment variables.

## Quick start

```bash
cd tests/api
cp .env.example .env
$EDITOR .env
python3 config.py        # prints the effective configuration
```

`config.py` validates required variables and auto-detects the execution mode.
If validation fails it raises immediately rather than letting tests fail
deep inside fixtures.

## Execution modes

The mode controls how privileged commands (file reads, Asterisk CLI, etc.)
reach the target system. All modes share the same REST API client; only the
shell-side helpers differ.

| Mode     | How commands are executed                          | Typical use                  |
|----------|----------------------------------------------------|------------------------------|
| `docker` | `docker exec <container> ...`                      | Local development            |
| `api`    | REST `system:executeBashCommand`                   | Remote VM / LXC / cloud / CI |
| `ssh`    | `ssh user@host ...`                                | Remote target with SSH only  |
| `local`  | Direct `subprocess` on the local FS                | When pytest runs *inside* the target |

If `MIKOPBX_EXECUTION_MODE` is unset, `config.py` picks one based on the
provided variables (Docker container reachable → `docker`; SSH host set →
`ssh`; otherwise → `api`).

## Environment variables

### Required

| Variable               | Description                  | Example                                            |
|------------------------|------------------------------|----------------------------------------------------|
| `MIKOPBX_API_URL`      | REST API v3 base URL         | `https://192.168.97.2:8445/pbxcore/api/v3`         |
| `MIKOPBX_API_USERNAME` | Admin user                   | `admin`                                            |
| `MIKOPBX_API_PASSWORD` | Admin password               | `123456789MikoPBX#1`                               |

### Execution mode

| Variable                  | Default              | Notes                                |
|---------------------------|----------------------|--------------------------------------|
| `MIKOPBX_EXECUTION_MODE`  | auto-detected        | `docker` / `api` / `ssh` / `local`   |
| `MIKOPBX_CONTAINER`       | `mikopbx-php83`      | For `docker` mode                    |
| `MIKOPBX_SSH_HOST`        | —                    | Forces `ssh` mode when set           |
| `MIKOPBX_SSH_USER`        | `root`               |                                      |
| `MIKOPBX_SSH_PORT`        | `22`                 |                                      |

### Paths inside the target (rarely overridden)

| Variable                | Default                                                   |
|-------------------------|-----------------------------------------------------------|
| `MIKOPBX_DB_PATH`       | `/cf/conf/mikopbx.db`                                     |
| `MIKOPBX_CDR_DB_PATH`   | `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`       |
| `MIKOPBX_STORAGE_PATH`  | `/storage/usbdisk1/mikopbx`                               |
| `MIKOPBX_MONITOR_PATH`  | `/storage/usbdisk1/mikopbx/astspool/monitor`              |
| `MIKOPBX_LOG_PATH`      | `/storage/usbdisk1/mikopbx/log`                           |

### Test behaviour flags

| Variable                    | Default | Effect                                       |
|-----------------------------|---------|----------------------------------------------|
| `ENABLE_CDR_SEED`           | `1`     | Seed `cdr.db` with fixtures before tests     |
| `ENABLE_CDR_CLEANUP`        | `1`     | Remove seeded CDR after tests                |
| `ENABLE_SYSTEM_RESET`       | `0`     | Run `test_00_setup_clean_system.py`          |
| `ENABLE_DESTRUCTIVE_TESTS`  | `0`     | Allow tests that wipe domain data            |

## Common scenarios

### Local Docker (default)

```ini
MIKOPBX_API_URL=https://192.168.97.2:8445/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=123456789MikoPBX#1
MIKOPBX_CONTAINER=mikopbx-php83
MIKOPBX_EXECUTION_MODE=docker
```

### Remote VM / LXC over REST API (recommended for CI)

```ini
MIKOPBX_API_URL=https://192.168.1.100:8445/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=...
# Mode auto-detects to `api`; no Docker or SSH required on the runner.
```

### Remote VM over SSH

```ini
MIKOPBX_API_URL=https://192.168.1.100:8445/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=...
MIKOPBX_SSH_HOST=192.168.1.100
MIKOPBX_SSH_USER=root
```

### Cloud deployment

```ini
MIKOPBX_API_URL=https://mikopbx.example.com/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=...
# Mode auto-detects to `api`.
```

## Container helpers in tests

Old tests sometimes shelled out to `docker exec` directly. New tests should
use the helpers in `conftest.py`, which honour the configured execution mode:

```python
from conftest import read_file_from_container, execute_asterisk_command

config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
output = execute_asterisk_command(api_client, 'pjsip show endpoints')
```

These call `system:executeBashCommand` (or `docker exec` / `ssh` / local
`subprocess`, depending on mode) and return strings.

## Troubleshooting

**`.env file not found`** — copy the template:
```bash
cp tests/api/.env.example tests/api/.env
```

**Auto-detection picks the wrong mode** — set it explicitly:
```ini
MIKOPBX_EXECUTION_MODE=api
```

**`Docker container not found`** during auto-detection — either pin the
container name or switch to API mode:
```bash
docker ps --filter name=mikopbx
```

**Inspect the resolved configuration**:
```bash
cd tests/api && python3 config.py
```
