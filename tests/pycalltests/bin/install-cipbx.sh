#!/bin/bash
# cipbx Installation Script for MikoPBX Testing
# Repository: https://github.com/arthur-s/cipbx

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIPBX_BIN="$SCRIPT_DIR/cipbx"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "🔍 Detecting platform..."
echo "   OS: $OS"
echo "   Architecture: $ARCH"

# Map architecture names
case "$ARCH" in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64)
        ARCH="arm64"
        ;;
    arm64)
        ARCH="arm64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Map OS names
case "$OS" in
    Darwin)
        OS="darwin"
        ;;
    Linux)
        OS="linux"
        ;;
    *)
        echo "❌ Unsupported operating system: $OS"
        exit 1
        ;;
esac

PLATFORM="${OS}-${ARCH}"
echo "   Platform: $PLATFORM"

# GitHub release URL
REPO="arthur-s/cipbx"
RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"

echo ""
echo "📡 Fetching latest cipbx release..."

# Get latest release info
RELEASE_INFO=$(curl -s "$RELEASE_URL")
TAG=$(echo "$RELEASE_INFO" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
    echo "❌ Failed to fetch latest release"
    echo "   Trying direct download from main branch..."

    # Fallback: try to build from source
    echo ""
    echo "🔧 Building cipbx from source..."

    if ! command -v go &> /dev/null; then
        echo "❌ Go is not installed. Please install Go 1.21+ or download pre-built binary manually"
        echo "   Manual download: https://github.com/$REPO/releases"
        exit 1
    fi

    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    echo "   Cloning repository..."
    git clone "https://github.com/$REPO.git" cipbx_source
    cd cipbx_source

    echo "   Building binary..."
    go build -o "$CIPBX_BIN" ./cmd/cipbx

    cd "$SCRIPT_DIR"
    rm -rf "$TEMP_DIR"

else
    echo "   Latest version: $TAG"

    # Construct download URL
    BINARY_NAME="cipbx-${PLATFORM}"
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$BINARY_NAME"

    echo ""
    echo "📥 Downloading cipbx..."
    echo "   URL: $DOWNLOAD_URL"

    # Download binary
    if curl -L -f "$DOWNLOAD_URL" -o "$CIPBX_BIN"; then
        echo "   ✅ Download successful"
    else
        echo "   ❌ Download failed"
        echo ""
        echo "🔧 Attempting to build from source..."

        if ! command -v go &> /dev/null; then
            echo "❌ Go is not installed. Please install Go 1.21+ or download pre-built binary manually"
            echo "   Manual download: https://github.com/$REPO/releases"
            exit 1
        fi

        TEMP_DIR=$(mktemp -d)
        cd "$TEMP_DIR"

        echo "   Cloning repository..."
        git clone "https://github.com/$REPO.git" cipbx_source
        cd cipbx_source

        echo "   Building binary..."
        go build -o "$CIPBX_BIN" ./cmd/cipbx

        cd "$SCRIPT_DIR"
        rm -rf "$TEMP_DIR"
    fi
fi

# Make executable
chmod +x "$CIPBX_BIN"

# Verify installation
echo ""
echo "✅ cipbx installed successfully!"
echo "   Location: $CIPBX_BIN"
echo ""
echo "🧪 Testing installation..."

if "$CIPBX_BIN" --help &> /dev/null; then
    echo "   ✅ cipbx is working correctly"
    echo ""
    echo "📋 Usage examples:"
    echo "   # Start as provider with authentication:"
    echo "   ./cipbx -l 127.0.0.1 -p 5070 -u testuser -w testpass"
    echo ""
    echo "   # Start without authentication (IP-based trust):"
    echo "   ./cipbx -l 127.0.0.1 -p 5070"
    echo ""
    echo "   # With timeout (auto-hangup after 60s):"
    echo "   ./cipbx -l 127.0.0.1 -p 5070 -t 60"
    echo ""
    echo "   # See all options:"
    echo "   ./cipbx --help"
else
    echo "   ⚠️  cipbx installed but help command failed"
    echo "   Please verify manually: $CIPBX_BIN --help"
fi

echo ""
echo "✨ Installation complete!"
