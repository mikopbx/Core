# Running tests against a VM, LXC, or remote MikoPBX

The recommended pattern is to **run pytest on your workstation or CI
runner** and point it at the target's REST API. This works for any
deployment style: Docker, LXC, ISO-installed VM, bare metal, or cloud.

```bash
cd tests/api

cat > .env <<'EOF'
MIKOPBX_API_URL=https://192.168.1.100:8445/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=YourPasswordHere
EOF

pip install -r requirements.txt
./run-safe-tests.sh
```

`config.py` auto-detects `api` execution mode when no Docker container or
SSH host is configured, and shell-side helpers (file reads, Asterisk CLI,
SQLite checks) go through `system:executeBashCommand` — no extra access is
required beyond admin REST credentials.

## When tests need privileged operations

A handful of helpers expect root-level access on the target — for example
seeding the CDR database, running Asterisk CLI commands, or reading
`/etc/asterisk/*.conf`. They use the same execution mode as everything
else; just set the right variables in `.env`:

| Need                            | Set                                          |
|---------------------------------|----------------------------------------------|
| Local Docker container          | `MIKOPBX_CONTAINER=mikopbx-php83`            |
| Remote target via REST API      | nothing extra — defaults to `api` mode       |
| Remote target via SSH instead   | `MIKOPBX_SSH_HOST=…`, `MIKOPBX_SSH_USER=…`   |

See [configuration.md](configuration.md) for the full matrix.

## Running pytest *inside* the target

This is rarely needed — only when a test requires direct filesystem access
that cannot be expressed over the REST API (custom audio files, raw CDR
inserts, reboot-persistence checks). The `helpers/reboot_helper.py` module
and `run-reboot-test.sh` orchestrate this two-phase pattern from the host.

If you really need a Python environment on the target VM:

```bash
# Inside the MikoPBX VM
mkdir -p /storage/usbdisk1/mikopbx/python-tests
cd /storage/usbdisk1/mikopbx/python-libs

# Architecture-appropriate Python build (aarch64 example)
curl -sL https://github.com/indygreg/python-build-standalone/releases/latest/download/cpython-3.11-aarch64-unknown-linux-gnu-install_only.tar.gz \
  -o python.tar.gz
tar -xzf python.tar.gz python/lib/python3.11
rm python.tar.gz

curl -sS https://bootstrap.pypa.io/get-pip.py | python3
pip3 install -r /offload/rootfs/usr/www/tests/api/requirements.txt --root-user-action=ignore
```

Then a one-liner wrapper to run pytest with the right `PYTHONPATH`:

```bash
cat > /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh <<'EOF'
#!/bin/sh
export PYTHONPATH="/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11:${PYTHONPATH}"
export PYTEST_CACHE_DIR="/storage/usbdisk1/mikopbx/python-tests/.pytest_cache"
export HYPOTHESIS_STORAGE_DIRECTORY="/storage/usbdisk1/mikopbx/python-tests/.hypothesis"
mkdir -p "${PYTEST_CACHE_DIR}" "${HYPOTHESIS_STORAGE_DIRECTORY}"
export MIKOPBX_API_URL="${MIKOPBX_API_URL:-http://127.0.0.1:8081/pbxcore/api/v3}"
export MIKOPBX_API_USERNAME="${MIKOPBX_API_USERNAME:-admin}"
export MIKOPBX_API_PASSWORD="${MIKOPBX_API_PASSWORD:-123456789MikoPBX#1}"
cd /offload/rootfs/usr/www/tests/api && python3 -m pytest -o cache_dir="${PYTEST_CACHE_DIR}" "$@"
EOF
chmod +x /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh
```

The Python build, pip cache, pytest cache, and hypothesis examples all live
on `/storage/usbdisk1/`, which survives container restarts and firmware
upgrades. `/offload/rootfs/usr/www/tests/api` is the standard mount point
for test files inside MikoPBX.

> Older docs in this directory referenced a `setup-test-environment.sh`
> bootstrapping script — that script was removed. The snippet above is the
> minimal replacement.

## Reboot tests

Some tests verify state persistence across reboot. Because the pytest
process gets killed during the reboot, they split into two phases:

```python
from helpers.reboot_helper import RebootTestHelper

@pytest.mark.reboot
def test_setting_persists_after_reboot(api_client):
    helper = RebootTestHelper("test_setting_persists_after_reboot")

    if helper.is_before_reboot():
        helper.save_state({"setting": "value"})
        api_client.post("system:reboot")
        helper.mark_reboot_initiated()
        pytest.skip("Waiting for reboot")

    elif helper.is_after_reboot():
        state = helper.load_state()
        assert state["setting"] == "value"
        helper.cleanup()
```

State is stored under
`/storage/usbdisk1/mikopbx/python-tests/reboot-states/`. Run the host-side
orchestrator:

```bash
./run-reboot-test.sh mikopbx-php83 test_47_system.py::test_system_reboot
```

The wrapper runs phase 1, waits for the system to come back (max 5 min),
then runs phase 2 inside the same container.

## Tests in this suite that touch the filesystem directly

Most of the suite is pure REST API. The exceptions are few; check `helpers/`
for the seeders they rely on:

- `helpers/cdr_seeder*.py` — populates `cdr.db` directly.
- `helpers/reboot_helper.py` — saves/loads JSON state across reboots.
- `helpers/pycalltest_helper.py` — orchestrates PJSUA2 calls.
- `helpers/test_runner.py` — abstraction over docker/api/ssh execution.
