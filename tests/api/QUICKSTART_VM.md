# Quick Start: Install Python Tests on MikoPBX VM

## One-Line Installation

```bash
# SSH to your MikoPBX VM, then run:
mkdir -p /storage/usbdisk1/mikopbx/python-tests && \
curl -sL https://raw.githubusercontent.com/mikopbx/Core/develop/tests/api/setup-test-environment.sh \
  -o /storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh && \
curl -sL https://raw.githubusercontent.com/mikopbx/Core/develop/tests/api/run-pytest.sh \
  -o /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh && \
chmod +x /storage/usbdisk1/mikopbx/python-tests/*.sh && \
/storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh
```

## Step-by-Step

### 1. Connect to VM

```bash
ssh root@YOUR_VM_IP
```

### 2. Copy Setup Scripts

If you have the source code on your workstation:

```bash
# From workstation
scp tests/api/setup-test-environment.sh root@YOUR_VM_IP:/tmp/
scp tests/api/run-pytest.sh root@YOUR_VM_IP:/tmp/
```

Then on VM:

```bash
# On VM
mkdir -p /storage/usbdisk1/mikopbx/python-tests
mv /tmp/setup-test-environment.sh /storage/usbdisk1/mikopbx/python-tests/
mv /tmp/run-pytest.sh /storage/usbdisk1/mikopbx/python-tests/
chmod +x /storage/usbdisk1/mikopbx/python-tests/*.sh
```

### 3. Run Setup

```bash
# On VM
/storage/usbdisk1/mikopbx/python-tests/setup-test-environment.sh
```

### 4. Copy Test Files

```bash
# From workstation - copy all test files
scp -r tests/api/*.py root@YOUR_VM_IP:/tmp/tests/
scp -r tests/api/helpers root@YOUR_VM_IP:/tmp/tests/
scp -r tests/api/fixtures root@YOUR_VM_IP:/tmp/tests/
scp tests/api/conftest.py root@YOUR_VM_IP:/tmp/tests/
scp tests/api/pytest.ini root@YOUR_VM_IP:/tmp/tests/
```

Then on VM:

```bash
# On VM - move to correct location
mkdir -p /offload/rootfs/usr/www/tests/api
cp -r /tmp/tests/* /offload/rootfs/usr/www/tests/api/
```

### 5. Run Tests

```bash
# On VM
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v
```

## Manual Script Creation

If you can't download scripts, create them manually:

### Create run-pytest.sh

```bash
# On VM
cat > /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh << 'EOF'
#!/bin/sh
export PYTHONPATH="/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11:${PYTHONPATH}"
export PYTEST_CACHE_DIR="/storage/usbdisk1/mikopbx/python-tests/.pytest_cache"
export HYPOTHESIS_STORAGE_DIRECTORY="/storage/usbdisk1/mikopbx/python-tests/.hypothesis"
mkdir -p "${PYTEST_CACHE_DIR}"
mkdir -p "${HYPOTHESIS_STORAGE_DIRECTORY}"
TEST_DIR="/offload/rootfs/usr/www/tests/api"
export MIKOPBX_API_URL="${MIKOPBX_API_URL:-http://127.0.0.1:8081/pbxcore/api/v3}"
export MIKOPBX_API_USERNAME="${MIKOPBX_API_USERNAME:-admin}"
export MIKOPBX_API_PASSWORD="${MIKOPBX_API_PASSWORD:-123456789MikoPBX#1}"
cd "${TEST_DIR}" && python3 -m pytest -o cache_dir="${PYTEST_CACHE_DIR}" "$@"
EOF

chmod +x /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh
```

### Install Manually

```bash
# On VM
# 1. Install pip
curl -sS https://bootstrap.pypa.io/get-pip.py | python3

# 2. Create directories
mkdir -p /storage/usbdisk1/mikopbx/python-libs
mkdir -p /storage/usbdisk1/mikopbx/python-tests

# 3. Download Python stdlib
cd /storage/usbdisk1/mikopbx/python-libs
curl -sL https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz
tar -xzf python.tar.gz python/lib/python3.11
rm python.tar.gz

# 4. Install pytest
pip3 install pytest pytest-order pytest-dependency pytest-xdist requests urllib3 schemathesis pytest-cov pytest-timeout pytest-html pytest-json-report --root-user-action=ignore
```

## Verify Installation

```bash
# On VM
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh --version
```

Should output pytest version.

## What Gets Installed

```
/storage/usbdisk1/mikopbx/
├── python-libs/
│   └── python/lib/python3.11/    # ~50MB
└── python-tests/
    ├── setup-test-environment.sh
    ├── run-pytest.sh
    ├── .pytest_cache/
    └── .hypothesis/
```

Total disk usage: ~50-60 MB

## Common Issues

**Problem**: Can't reach github.com
**Solution**: Download files on workstation, then SCP to VM

**Problem**: Wrong architecture
**Solution**: Script is for aarch64. For x86_64, change URL to:
```
cpython-3.11.6+20231002-x86_64-unknown-linux-gnu-install_only.tar.gz
```

**Problem**: Tests not found
**Solution**: Make sure files are in `/offload/rootfs/usr/www/tests/api/`

## Next Steps

- See `INSTALL_ON_VM.md` for detailed documentation
- See `RUNNING_TESTS_INSIDE_MIKOPBX.md` for usage guide
- See `REBOOT_TESTS_SUMMARY.md` for reboot test patterns
