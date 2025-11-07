# Running Python Tests Inside MikoPBX

This guide explains how to run Python pytest tests directly inside MikoPBX (both Docker containers and VMs installed from ISO).

## Overview

MikoPBX has a minimal Python 3.11 installation without the full standard library. To run pytest tests inside MikoPBX, we use a persistent Python environment stored on `/storage/usbdisk1/`.

## Architecture

```
/storage/usbdisk1/mikopbx/
├── python-libs/
│   └── python/lib/python3.11/    # Full Python stdlib (25MB)
└── python-tests/
    ├── setup-test-environment.sh  # One-time setup script
    ├── run-pytest.sh              # Wrapper to run tests
    ├── .pytest_cache/             # Pytest cache (persistent)
    └── .hypothesis/               # Hypothesis cache (persistent)
```

## Quick Start

### 1. One-Time Setup

Run the setup script to install the Python testing environment:

```bash
# Inside MikoPBX (Docker or VM)
/storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh
```

This script will:
1. Install pip3 (if not already installed)
2. Download and extract Python 3.11 standard library (25MB)
3. Install pytest and all dependencies from `requirements.txt`
4. Verify the installation

**Note**: The setup only needs to be run once. The environment persists across reboots.

### 2. Running Tests

Use the wrapper script to run pytest tests:

```bash
# Run a specific test file
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v

# Run all tests
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -v

# Run tests matching a pattern
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -k "test_license" -v

# Run with coverage
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh --cov=. --cov-report=html
```

### 3. From Docker Host

You can also run tests inside the container from your host machine:

```bash
# Run tests inside mikopbx-php83 container
docker exec mikopbx-php83 /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v

# Interactive shell inside container
docker exec -it mikopbx-php83 /bin/sh
# Then inside: /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v
```

## Environment Variables

The `run-pytest.sh` script sets up the following environment variables:

- `PYTHONPATH` - Includes the full Python stdlib from storage
- `PYTEST_CACHE_DIR` - Points to `/storage/usbdisk1/mikopbx/python-tests/.pytest_cache`
- `HYPOTHESIS_STORAGE_DIRECTORY` - Points to `/storage/usbdisk1/mikopbx/python-tests/.hypothesis`
- `MIKOPBX_API_URL` - Default: `http://127.0.0.1:8081/pbxcore/api/v3`
- `MIKOPBX_API_USERNAME` - Default: `admin`
- `MIKOPBX_API_PASSWORD` - Default: `123456789MikoPBX#1`

You can override these before running tests:

```bash
export MIKOPBX_API_URL="https://192.168.1.100:8445/pbxcore/api/v3"
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_01_auth.py -v
```

## Benefits of Running Tests Inside MikoPBX

### 1. Direct File System Access

Tests can directly create and manipulate files inside MikoPBX:

```python
# Create CDR test data
import sqlite3
conn = sqlite3.connect('/cf/conf/mikopbx.db')
# ... insert test CDR records

# Create test audio files
with open('/storage/usbdisk1/mikopbx/media/test.mp3', 'wb') as f:
    f.write(audio_data)
```

### 2. Works on VMs Installed from ISO

The same setup works on virtual machines installed from the MikoPBX ISO image, not just Docker containers.

### 3. Local API Access

Tests connect to `localhost` avoiding network latency and firewall issues.

### 4. Persistent Environment

The Python environment is stored on `/storage/usbdisk1/` which persists across:
- Container restarts
- System reboots
- MikoPBX updates

## Troubleshooting

### "ModuleNotFoundError: No module named 'unittest'"

The stdlib is not installed or PYTHONPATH is not set correctly. Re-run the setup script:

```bash
/storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh
```

### "Read-only file system" warnings

This is normal for pytest cache on the read-only `/offload` filesystem. The wrapper script redirects cache to `/storage/usbdisk1/` to avoid these warnings.

### Tests fail to connect to API

Check that the API URL is correct:

```bash
# Inside MikoPBX
curl http://127.0.0.1:8081/pbxcore/api/v3/license/info

# If using custom port or IP
export MIKOPBX_API_URL="http://192.168.1.100:8081/pbxcore/api/v3"
```

### Slow test execution

The first test run after setup may be slower as pytest compiles `.pyc` files. Subsequent runs will be faster as the cache is used.

## Manual Setup (Alternative Method)

If the automated setup script fails, you can set up manually:

```bash
# 1. Install pip3
curl -sS https://bootstrap.pypa.io/get-pip.py | python3

# 2. Create directories
mkdir -p /storage/usbdisk1/mikopbx/python-libs
mkdir -p /storage/usbdisk1/mikopbx/python-tests

# 3. Download Python stdlib
cd /storage/usbdisk1/mikopbx/python-libs
curl -sL https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz
tar -xzf python.tar.gz python/lib/python3.11
rm python.tar.gz

# 4. Install pytest dependencies
pip3 install -r /offload/rootfs/usr/www/tests/api/requirements.txt --root-user-action=ignore

# 5. Test installation
export PYTHONPATH="/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11"
python3 -c "import unittest; print('OK')"
python3 -m pytest --version
```

## File Structure

```
/storage/usbdisk1/mikopbx/
├── python-libs/
│   └── python/
│       └── lib/
│           └── python3.11/
│               ├── unittest/         # Standard library modules
│               ├── asyncio/
│               ├── collections/
│               └── ... (all stdlib)
│
└── python-tests/
    ├── setup-test-environment.sh    # Setup script
    ├── run-pytest.sh                # Test runner wrapper
    ├── .pytest_cache/               # Pytest cache
    │   └── v/
    │       └── cache/
    └── .hypothesis/                 # Hypothesis examples database
```

## Performance Considerations

- **Storage**: Full Python stdlib is ~50MB uncompressed
- **Download**: Initial setup downloads ~25MB
- **Speed**: Tests run at native speed (no network overhead)
- **Cache**: Persistent cache makes subsequent runs faster

## Security Notes

- Tests run as `root` inside MikoPBX
- Tests have full access to the file system
- Use caution when running untrusted tests
- The setup script uses HTTPS for all downloads

## Integration with CI/CD

You can use this setup in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Setup test environment
  run: |
    docker exec mikopbx-php83 /storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh

- name: Run tests
  run: |
    docker exec mikopbx-php83 /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -v --junit-xml=results.xml
```

## Comparison: Host vs Inside MikoPBX

| Feature | Run from Host | Run Inside MikoPBX |
|---------|---------------|-------------------|
| File system access | ❌ No direct access | ✅ Full access |
| Works on VM from ISO | ❌ No | ✅ Yes |
| Network overhead | ⚠️ Some latency | ✅ Localhost |
| Setup complexity | ✅ Simple | ⚠️ One-time setup |
| Performance | ✅ Fast | ✅ Fast |
| Persistence | ✅ Always available | ✅ Stored on storage |

## Advanced Usage

### Custom Python Packages

Install additional packages:

```bash
pip3 install package-name --root-user-action=ignore
```

### Debugging

Use pytest debugging features:

```bash
# Drop into debugger on failure
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh --pdb test_file.py

# Verbose output
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -vv --tb=long test_file.py
```

### Parallel Execution

Run tests in parallel:

```bash
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -n auto
```

## Handling Tests That Require Reboot

Some tests need to reboot the system and verify state persistence. Special handling is required because the pytest process will be killed during reboot.

### Pattern for Reboot Tests

Use the `RebootTestHelper` class to handle two-phase execution:

```python
from helpers.reboot_helper import RebootTestHelper

@pytest.mark.reboot
def test_settings_persist_after_reboot(api_client):
    helper = RebootTestHelper("test_settings_persist_after_reboot")

    if helper.is_before_reboot():
        # Phase 1: Pre-reboot
        helper.save_state({"setting": "value"})
        api_client.post("/system/reboot")
        helper.mark_reboot_initiated()
        pytest.skip("Waiting for reboot")

    elif helper.is_after_reboot():
        # Phase 2: Post-reboot
        state = helper.load_state()
        assert state["setting"] == "value"
        helper.cleanup()
```

### Running Reboot Tests from Host

Use the provided wrapper script:

```bash
# From host machine
cd tests/api
./run-reboot-test.sh mikopbx-php83 test_47_system.py::test_system_reboot

# With custom API URL
./run-reboot-test.sh mikopbx-php83 test_reboot.py http://192.168.107.2:8081/pbxcore/api/v3
```

The script automatically:
1. Runs pre-reboot phase inside container
2. Waits for system to reboot (max 5 minutes)
3. Runs post-reboot phase inside container

### How It Works

1. **State Persistence**: Test state is saved to `/storage/usbdisk1/mikopbx/python-tests/reboot-states/`
2. **Two-Phase Execution**: Test detects whether it's before or after reboot
3. **Automatic Orchestration**: Wrapper script handles the reboot coordination

See `tests/api/examples/test_reboot_example.py` for complete examples.

## Support

For issues or questions:
- Check logs: `/storage/usbdisk1/mikopbx/log/`
- Verify Python: `python3 --version`
- Verify pytest: `python3 -m pytest --version`
- Re-run setup if needed
- For reboot tests: Check state files in `/storage/usbdisk1/mikopbx/python-tests/reboot-states/`
