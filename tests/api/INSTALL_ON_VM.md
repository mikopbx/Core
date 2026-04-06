# Installing Python Test Environment on MikoPBX VM

This guide explains how to install and run Python tests on a MikoPBX system installed on a virtual machine from ISO.

## Prerequisites

- MikoPBX installed on VM from ISO
- SSH access to the VM
- Test files from the source repository (`tests/api/` directory)

## Installation Steps

### Step 1: Connect to VM via SSH

```bash
# From your workstation
ssh root@<VM_IP_ADDRESS>

# Example:
ssh root@192.168.1.100
```

Default password is usually set during MikoPBX installation.

### Step 2: Copy Test Files to VM

You have several options to transfer the test files:

#### Option A: Using SCP (Recommended)

```bash
# From your workstation (not from VM)
cd /path/to/mikopbx/Core

# Copy entire test directory
scp -r tests/api/ root@<VM_IP>:/tmp/api-tests/

# Example:
scp -r tests/api/ root@192.168.1.100:/tmp/api-tests/
```

#### Option B: Using Git (if git is available on VM)

```bash
# From VM
cd /tmp
git clone https://github.com/mikopbx/Core.git
cp -r Core/tests/api /tmp/api-tests/
```

#### Option C: Manual File Creation

If you only need specific files, you can create them manually:

```bash
# From VM - we'll create a minimal setup script
cat > /tmp/install-pytest.sh << 'EOF'
#!/bin/sh
# This will be the full setup script
# (See Step 3)
EOF
chmod +x /tmp/install-pytest.sh
```

### Step 3: Run Automated Setup Script

Once test files are on the VM, run the setup script:

```bash
# From VM
/tmp/api-tests/setup-test-environment.sh
```

**OR** if you want to install without copying all test files, use this one-liner:

```bash
# From VM - complete installation in one command
curl -sL https://raw.githubusercontent.com/mikopbx/Core/develop/tests/api/setup-test-environment.sh | sh
```

The setup script will:
1. Install pip3 (if not present)
2. Download Python 3.11 standard library (~25MB)
3. Install pytest and dependencies
4. Create necessary directories
5. Verify installation

This takes about 2-5 minutes depending on network speed.

### Step 4: Copy Test Files to Persistent Storage

```bash
# From VM
# Copy test files to a location where run-pytest.sh expects them
mkdir -p /offload/rootfs/usr/www/tests/api
cp -r /tmp/api-tests/* /offload/rootfs/usr/www/tests/api/

# Copy helpers and fixtures
cp -r /tmp/api-tests/helpers /offload/rootfs/usr/www/tests/api/
cp -r /tmp/api-tests/fixtures /offload/rootfs/usr/www/tests/api/
cp /tmp/api-tests/conftest.py /offload/rootfs/usr/www/tests/api/
cp /tmp/api-tests/pytest.ini /offload/rootfs/usr/www/tests/api/
```

### Step 5: Verify Installation

```bash
# From VM
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh --version
```

You should see pytest version information.

### Step 6: Run a Test

```bash
# From VM
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v
```

## Alternative: Manual Installation

If the automated script doesn't work, here's the manual process:

```bash
# Step 1: Install pip3
curl -sS https://bootstrap.pypa.io/get-pip.py | python3

# Step 2: Create directories
mkdir -p /storage/usbdisk1/mikopbx/python-libs
mkdir -p /storage/usbdisk1/mikopbx/python-tests
mkdir -p /storage/usbdisk1/mikopbx/python-tests/.pytest_cache
mkdir -p /storage/usbdisk1/mikopbx/python-tests/.hypothesis

# Step 3: Download Python stdlib
cd /storage/usbdisk1/mikopbx/python-libs
curl -sL https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz
tar -xzf python.tar.gz python/lib/python3.11
rm python.tar.gz

# Step 4: Install pytest dependencies
pip3 install pytest pytest-order pytest-dependency pytest-xdist \
    requests urllib3 schemathesis pytest-cov pytest-timeout \
    pytest-html pytest-json-report --root-user-action=ignore

# Step 5: Create run script
cat > /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh << 'SCRIPT'
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
SCRIPT

chmod +x /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh

# Step 6: Verify
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh --version
```

## Complete Installation Script

If you want a single script to copy and paste, here it is:

```bash
#!/bin/sh
# Complete MikoPBX Python Test Environment Installation
# Run this on the MikoPBX VM via SSH

set -e

echo "==================================="
echo "MikoPBX Python Test Environment"
echo "Installation for VM"
echo "==================================="
echo ""

# Install pip3
echo "[1/6] Installing pip3..."
if ! command -v pip3 >/dev/null 2>&1; then
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3
    echo "✓ pip3 installed"
else
    echo "✓ pip3 already installed"
fi

# Create directories
echo "[2/6] Creating directories..."
mkdir -p /storage/usbdisk1/mikopbx/python-libs
mkdir -p /storage/usbdisk1/mikopbx/python-tests
mkdir -p /storage/usbdisk1/mikopbx/python-tests/.pytest_cache
mkdir -p /storage/usbdisk1/mikopbx/python-tests/.hypothesis
mkdir -p /storage/usbdisk1/mikopbx/python-tests/reboot-states
echo "✓ Directories created"

# Download Python stdlib
echo "[3/6] Downloading Python stdlib (25MB)..."
if [ ! -d "/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11" ]; then
    cd /storage/usbdisk1/mikopbx/python-libs
    curl -sL https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz
    tar -xzf python.tar.gz python/lib/python3.11
    rm python.tar.gz
    echo "✓ Python stdlib installed"
else
    echo "✓ Python stdlib already installed"
fi

# Install dependencies
echo "[4/6] Installing pytest and dependencies..."
pip3 install pytest pytest-order pytest-dependency pytest-xdist \
    requests urllib3 schemathesis pytest-cov pytest-timeout \
    pytest-html pytest-json-report --root-user-action=ignore -q
echo "✓ Dependencies installed"

# Create run script
echo "[5/6] Creating run script..."
cat > /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh << 'RUNSCRIPT'
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
RUNSCRIPT
chmod +x /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh
echo "✓ Run script created"

# Verify
echo "[6/6] Verifying installation..."
export PYTHONPATH="/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11"
if python3 -c "import unittest" 2>/dev/null; then
    echo "✓ unittest available"
else
    echo "✗ unittest NOT available"
    exit 1
fi

if python3 -m pytest --version >/dev/null 2>&1; then
    echo "✓ pytest available"
else
    echo "✗ pytest NOT available"
    exit 1
fi

echo ""
echo "==================================="
echo "✓ Installation Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Copy your test files to: /offload/rootfs/usr/www/tests/api/"
echo "2. Run tests with: /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh <test_file> -v"
echo ""
```

## Quick Start: Copy This One Script

Save this to your workstation, then copy and run it on the VM:

```bash
# On your workstation
cat > install-pytest-vm.sh << 'FULLSCRIPT'
[... paste the complete script above ...]
FULLSCRIPT

# Copy to VM
scp install-pytest-vm.sh root@<VM_IP>:/tmp/

# SSH to VM and run
ssh root@<VM_IP>
chmod +x /tmp/install-pytest-vm.sh
/tmp/install-pytest-vm.sh
```

## Transferring Test Files

After installation, you need to copy your test files:

### Method 1: Using SCP

```bash
# From your workstation
cd /path/to/mikopbx/Core/tests/api

# Copy all test files
scp -r *.py helpers/ fixtures/ conftest.py pytest.ini requirements.txt \
    root@<VM_IP>:/offload/rootfs/usr/www/tests/api/
```

### Method 2: Using rsync (if available)

```bash
# From your workstation
rsync -avz --exclude '__pycache__' --exclude '.pytest_cache' \
    tests/api/ root@<VM_IP>:/offload/rootfs/usr/www/tests/api/
```

### Method 3: Manual File-by-File

```bash
# From your workstation
scp tests/api/test_08_license.py root@<VM_IP>:/offload/rootfs/usr/www/tests/api/
scp tests/api/conftest.py root@<VM_IP>:/offload/rootfs/usr/www/tests/api/
scp tests/api/pytest.ini root@<VM_IP>:/offload/rootfs/usr/www/tests/api/
# ... etc
```

## Running Tests on VM

Once everything is installed and test files are copied:

```bash
# SSH to VM
ssh root@<VM_IP>

# Run a simple test
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh test_08_license.py -v

# Run all tests
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -v

# Run specific test pattern
/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh -k "test_auth" -v
```

## Troubleshooting

### Can't connect via SSH

```bash
# Check if SSH is running on VM
# From VM console:
netstat -tln | grep 22

# Or check MikoPBX web interface:
# System → SSH Settings → Enable SSH
```

### Permission denied during file copy

```bash
# From VM - make sure directory is writable
chmod 755 /offload/rootfs/usr/www/tests
mkdir -p /offload/rootfs/usr/www/tests/api
chmod 755 /offload/rootfs/usr/www/tests/api
```

### Tests can't find modules

```bash
# Verify PYTHONPATH is set correctly
export PYTHONPATH="/storage/usbdisk1/mikopbx/python-libs/python/lib/python3.11"
python3 -c "import unittest; print('OK')"
```

### Network issues downloading stdlib

If the VM doesn't have internet access, you can download on your workstation and transfer:

```bash
# On workstation
curl -sL https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz

# Copy to VM
scp python.tar.gz root@<VM_IP>:/storage/usbdisk1/mikopbx/python-libs/

# On VM
cd /storage/usbdisk1/mikopbx/python-libs
tar -xzf python.tar.gz python/lib/python3.11
rm python.tar.gz
```

## Configuration for Different VM IP

If your VM has a different IP address, update the API URL:

```bash
# On VM - set before running tests
export MIKOPBX_API_URL="http://127.0.0.1:8081/pbxcore/api/v3"

# Or permanently in run script
vi /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh
# Change the default API URL
```

## Testing from External Machine

If you want to run tests from your workstation against the VM:

```bash
# On your workstation
export MIKOPBX_API_URL="https://<VM_IP>:8445/pbxcore/api/v3"
export MIKOPBX_API_USERNAME="admin"
export MIKOPBX_API_PASSWORD="your_password"

cd tests/api
python3 -m pytest test_08_license.py -v
```

But remember: tests running inside the VM have advantages:
- Direct filesystem access for creating CDR records, MP3 files
- No network latency
- Can test reboot scenarios

## Summary

1. **Install environment**: Run setup script on VM (one-time)
2. **Copy test files**: Use SCP to transfer files from workstation
3. **Run tests**: Use the wrapper script on VM

The environment persists across VM reboots and is stored on `/storage/usbdisk1/`.
