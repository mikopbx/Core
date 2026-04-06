#!/bin/bash
#
# Setup pytest environment inside MikoPBX Docker container
# Installs packages to /storage for persistence across restarts
#
# Usage (from host):
#   docker cp tests/pycalltests/setup_pytest.sh mikopbx_tests-refactoring:/tmp/
#   docker exec mikopbx_tests-refactoring sh /tmp/setup_pytest.sh
#
# Or run directly inside container:
#   sh /offload/rootfs/usr/www/tests/pycalltests/setup_pytest.sh
#

set -e

PACKAGES_DIR="/storage/usbdisk1/python_packages"
UNITTEST_DIR="/usr/lib64/python3.11/unittest"

echo "=================================================="
echo "MikoPBX Pytest Setup Script"
echo "=================================================="

# Create packages directory
if [ ! -d "$PACKAGES_DIR" ]; then
    echo "Creating packages directory: $PACKAGES_DIR"
    mkdir -p "$PACKAGES_DIR"
fi

# Check if pip is installed in packages dir
if [ ! -f "$PACKAGES_DIR/bin/pip3" ] && ! command -v pip3 &> /dev/null; then
    echo ""
    echo "Installing pip..."
    curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    python3 /tmp/get-pip.py --target="$PACKAGES_DIR" --quiet
    rm /tmp/get-pip.py
    echo "pip installed to $PACKAGES_DIR"
else
    echo "pip already available"
fi

# Add packages dir to PYTHONPATH for pip install
export PYTHONPATH="$PACKAGES_DIR:$PYTHONPATH"
export PATH="$PACKAGES_DIR/bin:$PATH"

# Install required packages
echo ""
echo "Installing pytest and dependencies..."

REQUIRED_PACKAGES="pytest pytest-asyncio requests python-dotenv"

for pkg in $REQUIRED_PACKAGES; do
    pkg_import=$(echo "$pkg" | sed 's/-/_/g')
    if ! python3 -c "import $pkg_import" 2>/dev/null; then
        echo "  Installing $pkg..."
        python3 -m pip install --target="$PACKAGES_DIR" --quiet "$pkg" 2>/dev/null || \
        python3 "$PACKAGES_DIR/pip" install --target="$PACKAGES_DIR" --quiet "$pkg"
    else
        echo "  $pkg already installed"
    fi
done

# Check and copy unittest if missing
echo ""
if [ ! -d "$UNITTEST_DIR" ]; then
    echo "WARNING: unittest module missing in /usr/lib64/python3.11/"
    echo "Run from host:"
    echo "  docker cp /Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/unittest mikopbx_tests-refactoring:/usr/lib64/python3.11/"
    echo ""
else
    echo "unittest already installed"
fi

# Create run_pytest.sh wrapper script
WRAPPER_SCRIPT="$PACKAGES_DIR/run_pytest.sh"
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
#
# Run pytest with correct environment for MikoPBX PJSUA2 tests
#
# Usage:
#   /storage/usbdisk1/python_packages/run_pytest.sh [pytest args...]
#
# Examples:
#   run_pytest.sh test_66_ivr_navigation.py -v
#   run_pytest.sh test_67_voicemail.py::test_01_leave_voicemail -v -s
#   run_pytest.sh --collect-only
#

PACKAGES_DIR="/storage/usbdisk1/python_packages"
TESTS_DIR="/offload/rootfs/usr/www/tests/pycalltests"
API_DIR="/offload/rootfs/usr/www/tests/api"

cd "$TESTS_DIR"

# Map legacy Docker env vars to current names
export MIKOPBX_API_URL="${MIKOPBX_API_URL:-${API_BASE_URL:+${API_BASE_URL}/pbxcore/api/v3}}"
export MIKOPBX_API_USERNAME="${MIKOPBX_API_USERNAME:-$API_LOGIN}"
export MIKOPBX_API_PASSWORD="${MIKOPBX_API_PASSWORD:-$API_PASSWORD}"

export LD_LIBRARY_PATH="$TESTS_DIR/bin/pjsua2/linux-arm64:$LD_LIBRARY_PATH"
export PYTHONPATH="$PACKAGES_DIR:$TESTS_DIR/bin/pjsua2/linux-arm64:$TESTS_DIR/helpers:$API_DIR:$PYTHONPATH"

exec python3 -m pytest "$@"
EOF

chmod +x "$WRAPPER_SCRIPT"

echo ""
echo "=================================================="
echo "Setup complete!"
echo "=================================================="
echo ""
echo "To run tests inside container:"
echo "  /storage/usbdisk1/python_packages/run_pytest.sh test_66_ivr_navigation.py -v"
echo ""
echo "Or from host:"
echo "  docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh test_66_ivr_navigation.py -v"
echo ""

# Verify installation
echo "Verifying installation..."
export PYTHONPATH="$PACKAGES_DIR:$PYTHONPATH"
python3 -c "import pytest; print(f'  pytest version: {pytest.__version__}')"
python3 -c "import pytest_asyncio; print(f'  pytest-asyncio: OK')"
python3 -c "import requests; print(f'  requests: OK')"
python3 -c "import dotenv; print(f'  python-dotenv: OK')"
python3 -c "import unittest; print(f'  unittest: OK')" 2>/dev/null || echo "  WARNING: unittest not available - see instructions above"

echo ""
echo "Done!"
