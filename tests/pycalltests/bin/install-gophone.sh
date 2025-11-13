#!/bin/bash

# install-gophone.sh
# Installs gophone CLI SIP softphone for automated testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOPHONE_VERSION="v1.10.0"  # Latest stable version
GOPHONE_BIN="$SCRIPT_DIR/gophone"

echo "=========================================="
echo "gophone Installation Script"
echo "=========================================="
echo ""
echo "Installation directory: $SCRIPT_DIR"
echo "Version: $GOPHONE_VERSION"
echo ""

# Check if gophone already exists
if [ -f "$GOPHONE_BIN" ]; then
    echo "✓ gophone already installed at $GOPHONE_BIN"
    $GOPHONE_BIN --version || true
    echo ""
    read -p "Reinstall? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    rm -f "$GOPHONE_BIN"
fi

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "✗ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

case "$OS" in
    darwin)
        OS="darwin"
        ;;
    linux)
        OS="linux"
        ;;
    *)
        echo "✗ Unsupported OS: $OS"
        echo "  Supported: darwin (macOS), linux"
        exit 1
        ;;
esac

echo "Detected platform: $OS-$ARCH"
echo ""

# Download URL and filename
if [ "$OS" = "darwin" ]; then
    # macOS uses tar.gz archives
    DOWNLOAD_FILE="gophone-${OS}-${ARCH}.tar.gz"
    DOWNLOAD_URL="https://github.com/emiago/gophone/releases/download/${GOPHONE_VERSION}/${DOWNLOAD_FILE}"
else
    # Linux uses direct binaries
    DOWNLOAD_FILE="gophone-${OS}-${ARCH}"
    DOWNLOAD_URL="https://github.com/emiago/gophone/releases/download/${GOPHONE_VERSION}/${DOWNLOAD_FILE}"
fi

echo "Downloading gophone from GitHub releases..."
echo "URL: $DOWNLOAD_URL"
echo ""

# Download using curl
if command -v curl &> /dev/null; then
    curl -L -o "/tmp/${DOWNLOAD_FILE}" "$DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
    wget -O "/tmp/${DOWNLOAD_FILE}" "$DOWNLOAD_URL"
else
    echo "✗ Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Extract if tar.gz (macOS)
if [[ "$DOWNLOAD_FILE" == *.tar.gz ]]; then
    echo "Extracting archive..."
    tar -xzf "/tmp/${DOWNLOAD_FILE}" -C "$SCRIPT_DIR"
    rm "/tmp/${DOWNLOAD_FILE}"
else
    # Just move the binary (Linux)
    mv "/tmp/${DOWNLOAD_FILE}" "$GOPHONE_BIN"
fi

# Make executable
chmod +x "$GOPHONE_BIN"

# Verify installation
echo ""
echo "Verifying installation..."
if [ -f "$GOPHONE_BIN" ]; then
    echo "✓ gophone binary created successfully"

    # Test execution
    if $GOPHONE_BIN --version &> /dev/null; then
        echo "✓ gophone is working correctly"
        echo ""
        $GOPHONE_BIN --version
    else
        echo "✗ gophone binary exists but failed to execute"
        echo "  This might be due to missing dependencies or unsigned binary (macOS)"
        echo ""
        echo "On macOS, you may need to allow the binary in System Preferences:"
        echo "  System Preferences → Security & Privacy → Allow gophone"
        exit 1
    fi
else
    echo "✗ Installation failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ gophone installation completed!"
echo "=========================================="
echo ""
echo "Usage examples:"
echo ""
echo "  # Register to SIP server"
echo "  ./gophone register -username=201 -password=pass123 192.168.117.2:5060"
echo ""
echo "  # Make a call"
echo "  ./gophone dial -username=201 -password=pass123 sip:202@192.168.117.2:5060"
echo ""
echo "  # Answer incoming calls"
echo "  ./gophone answer -username=201 -password=pass123 -l 0.0.0.0:5080"
echo ""
echo "For more information:"
echo "  https://github.com/emiago/gophone"
echo ""
