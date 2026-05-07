# TeamCity integration

This page describes how to wire the REST API test suite into TeamCity. The
build runs against a live MikoPBX target — VM, LXC, or container — over the
REST API; no Docker or SSH access from the agent is required.

## Build step

```bash
#!/bin/bash
set -e

cd tests/api

# MIKOPBX_API_URL / MIKOPBX_API_USERNAME / MIKOPBX_API_PASSWORD come in
# from TeamCity environment parameters (see "TeamCity parameters" below) —
# no need to re-export them here.

# Reasonable defaults for CI
export ENABLE_CDR_SEED=1
export ENABLE_CDR_CLEANUP=1
export ENABLE_SYSTEM_RESET=0

pip install -r requirements.txt

python3 -m pytest \
    --junitxml=test-results.xml \
    -v --tb=short \
    -m "not dangerous_network" \
    2>&1 | tee test-output.log
```

Publish `test-results.xml` as a TeamCity test report and `test-output.log`
as a build artifact.

## TeamCity parameters

| Parameter                    | Type           | Description                  |
|------------------------------|----------------|------------------------------|
| `env.MIKOPBX_API_URL`        | Configuration  | API base URL                 |
| `env.MIKOPBX_API_USERNAME`   | Configuration  | Admin username               |
| `env.MIKOPBX_API_PASSWORD`   | Password       | Admin password (masked)      |

Optional:

| Parameter                       | When to set                                          |
|---------------------------------|------------------------------------------------------|
| `env.MIKOPBX_EXECUTION_MODE`    | Force a mode (`api` for cloud/remote, default ok)    |
| `env.ENABLE_SYSTEM_RESET`       | `1` to wipe target before tests (use with care)      |
| `env.ENABLE_DESTRUCTIVE_TESTS`  | `1` to allow `test_99_*` and friends                 |

See [configuration.md](configuration.md) for the full variable reference.

## CDR seeding on a remote target

`test_00a_cdr_seed.py` copies bash + JSON helpers to the target and invokes
them through the REST API (or SSH, if configured). For this to work, the
target must reach `pip install` results — i.e. the helpers can call
`sqlite3` and `python3` on it. MikoPBX firmware ships both.

If your target lives behind restricted networking, deploy the helpers
manually once:

```bash
ssh root@mikopbx 'mkdir -p /storage/usbdisk1/mikopbx/python-tests/scripts \
                              /storage/usbdisk1/mikopbx/python-tests/fixtures'

scp tests/api/scripts/*.{sh,py}    root@mikopbx:/storage/usbdisk1/mikopbx/python-tests/scripts/
scp tests/api/fixtures/*.json      root@mikopbx:/storage/usbdisk1/mikopbx/python-tests/fixtures/

ssh root@mikopbx 'chmod +x /storage/usbdisk1/mikopbx/python-tests/scripts/*.sh'
```

CDR dates are generated dynamically by `scripts/generate_cdr_fixtures.py`
using the current month, so seeded data stays inside the default search
windows regardless of when the build runs. If `python3` is unavailable on
the target, the suite falls back to the static `fixtures/cdr_seed_data.sql`
— which may have stale dates, causing skip messages.

## Troubleshooting

**`No CDR data available` skips** — `ENABLE_CDR_SEED=1` is missing, or the
target lacks `python3` and the static SQL is outdated. Check the test log
for the seeder output.

**`401 Unauthorized`** — credentials are wrong or the API is disabled. Test
manually:

```bash
curl -k -X POST -d 'login=admin&password=...' \
  "$MIKOPBX_API_URL/auth:login"
```

**Connection errors** — the agent cannot reach the target. Verify the URL
from the agent itself; check firewall/NAT and that ports `80`/`8080`/`8445`
are reachable.

**Passkeys tests skip** — expected. WebAuthn requires a browser context.

## Test execution order

Tests are picked up alphabetically and gated by numeric prefix:

1. `test_00_setup_clean_system.py` — runs only when `ENABLE_SYSTEM_RESET=1`.
2. `test_00a_cdr_seed.py` — populates `cdr.db`.
3. `test_01_*` … `test_99_*` — main suite. The last few are destructive
   and require `ENABLE_DESTRUCTIVE_TESTS=1`.

For day-to-day CI, exclude `dangerous_network` (firewall / routes / DNS) —
those tests intentionally break connectivity and need manual recovery. See
[dangerous-tests.md](dangerous-tests.md).
