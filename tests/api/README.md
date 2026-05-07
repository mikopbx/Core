# MikoPBX REST API Tests

Pytest-based integration test suite for the MikoPBX REST API v3.

The suite runs against a live MikoPBX instance (Docker container, LXC, VM, or
cloud deployment) and covers authentication, CRUD on every domain object,
network/firewall settings, CDR, files, modules, and security regressions.

> 87 `test_*.py` modules · ~720+ tests · sequential by file name

## Quick start

```bash
cd tests/api

# 1) Configure connection
cp .env.example .env
$EDITOR .env             # set MIKOPBX_API_URL / username / password

# 2) Install Python deps (host or CI runner — Python 3.10+)
pip install -r requirements.txt

# 3) Run safe tests
./run-safe-tests.sh
```

The default `MIKOPBX_API_URL` points at the local Docker stack
(`https://192.168.97.2:8445/pbxcore/api/v3`). For any other target — VM, LXC,
remote host — change the URL and credentials in `.env`. See
[docs/configuration.md](docs/configuration.md) for all execution modes.

## Layout

```
tests/api/
├── README.md                         # this file
├── conftest.py                       # API client + global fixtures
├── config.py                         # central env/.env loader
├── pytest.ini                        # markers and discovery
├── requirements.txt
├── .env.example                      # documented template
│
├── docs/
│   ├── configuration.md              # execution modes, env vars, .env
│   ├── teamcity.md                   # CI integration on TeamCity
│   ├── running-on-vm.md              # remote VM / LXC / cloud targets
│   └── dangerous-tests.md            # network-mutating tests
│
├── test_*.py                         # 87 sequential test modules
├── fixtures/                         # JSON test data (16 domains) + CDR seed
├── helpers/                          # cdr_seeder, reboot_helper, runner glue
├── scripts/                          # remote bash helpers (CDR seed/cleanup)
├── tools/                            # one-off generators (PHP→JSON fixtures)
│
├── run-safe-tests.sh                 # default runner (skips dangerous_network)
├── run-dangerous-tests.sh            # runs only network-mutating tests
├── run_all_tests.sh                  # legacy priority-based runner
├── run-reboot-test.sh                # two-phase reboot orchestrator
├── run-test-from-host.sh             # cache-clean wrapper for one test
└── bootstrap-s3-providers.sh         # spins up Garage+MinIO via docker compose
```

## Test execution order

Files are picked up alphabetically. The numeric prefix encodes the phase:

| Range          | Phase                                          |
|----------------|------------------------------------------------|
| `test_00_*`    | Optional clean-system reset & CDR seeding      |
| `test_01–09_*` | Auth, ACL, passwords, settings, license, files |
| `test_10–19_*` | Storage, sound files, extensions, providers    |
| `test_20–29_*` | Settings, routes, queues, IVR, dialplan apps   |
| `test_30–39_*` | Provider deletion, network, firewall, AMI/ARI  |
| `test_40–49_*` | Sysinfo, syslog, advice, CDR, passkeys, OpenAPI|
| `test_50–63_*` | Unified providers, files, search, public APIs  |
| `test_64–99_*` | Security regressions, log analysis, teardown   |

`test_00_setup_clean_system.py` runs only when `ENABLE_SYSTEM_RESET=1`.
`test_99_system_delete_all.py` is destructive and gated likewise.

## Running tests

```bash
# Everything except network-mutating tests (default)
./run-safe-tests.sh

# Only network-mutating tests (firewall, routes, DNS — see docs)
./run-dangerous-tests.sh

# A single file or test
pytest -v test_01_auth.py
pytest -v test_15_extensions_crud.py::TestExtensionsCRUD::test_01_create

# By marker
pytest -v -m "smoke"
pytest -v -m "telephony"
pytest -v -m "not dangerous_network"
```

Available markers (see `pytest.ini` for the full list):
`smoke`, `auth`, `telephony`, `routing`, `settings`, `security`, `files`,
`utility`, `destructive`, `slow`, `performance`, `dangerous_network`.

## Writing new tests

1. Pick the next free `test_NN_*.py` slot in the right phase.
2. Use the `api_client` fixture from `conftest.py` (`MikoPBXClient`) — it
   handles JWT login, refresh-token cookie, and retries.
3. Load test data from `fixtures/<domain>.json` rather than inlining it.
4. Use the `assert_api_success`, `assert_record_exists`,
   `assert_record_deleted` helpers from `conftest.py`.
5. Tag the test with relevant markers; add `@pytest.mark.dangerous_network`
   for anything that mutates firewall, routes, or DNS — see
   [docs/dangerous-tests.md](docs/dangerous-tests.md).

Example skeleton:

```python
import pytest
from conftest import assert_api_success, assert_record_exists


class TestExtensionsCrud:
    def test_01_create(self, api_client, employee_fixtures):
        data = employee_fixtures["smith.james"]
        response = api_client.post("extensions", data)
        assert_api_success(response, "Failed to create extension")
        assert response["data"]["id"]
```

## Documentation index

- [docs/configuration.md](docs/configuration.md) — `.env`, execution modes
  (`docker` / `api` / `ssh` / `local`), all environment variables.
- [docs/teamcity.md](docs/teamcity.md) — TeamCity build configuration, CDR
  seeding on remote hosts, troubleshooting.
- [docs/running-on-vm.md](docs/running-on-vm.md) — pointing the suite at a
  MikoPBX VM / LXC / cloud instance over REST API.
- [docs/dangerous-tests.md](docs/dangerous-tests.md) — what
  `dangerous_network` tests do and how to recover.

## Related test suites in this repo

- `tests/AdminCabinet/` — Selenium browser automation (PHPUnit).
- `tests/Calls/` — Asterisk call-flow integration tests on port 5062.
- `tests/pycalltests/` — PJSUA2 SIP scenarios run inside the container.
- `tests/PBXCoreREST/` — pure PHP unit tests for the REST API layer.
