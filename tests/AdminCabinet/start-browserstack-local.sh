#!/bin/bash

# Script to start BrowserStack Local on macOS host
# This is required because tests run in container but BrowserStackLocal must run on host

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load configuration. Prefer env credentials so CI can keep secrets outside files.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/config/local.conf.json}"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="$SCRIPT_DIR/../config/local.conf.json"
fi

BROWSERSTACK_KEY="${BROWSERSTACK_ACCESS_KEY:-}"
if [ -z "$BROWSERSTACK_KEY" ] && [ -f "$CONFIG_FILE" ]; then
    BROWSERSTACK_KEY=$(grep -o '"key"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
fi

if [ -z "$BROWSERSTACK_KEY" ]; then
    echo -e "${RED}Error: BrowserStack access key not found${NC}"
    echo "Set BROWSERSTACK_ACCESS_KEY or provide tests/AdminCabinet/config/local.conf.json"
    exit 1
fi

# Check if BrowserStackLocal is already running
if pgrep -f "BrowserStackLocal" > /dev/null; then
    echo -e "${YELLOW}BrowserStack Local is already running${NC}"
    echo "To restart, first stop it with: pkill -f BrowserStackLocal"
    exit 0
fi

# Local identifier
LOCAL_IDENTIFIER="${BROWSERSTACK_LOCAL_IDENTIFIER:-local_test}"

echo -e "${GREEN}Starting BrowserStack Local...${NC}"
echo "Local Identifier: $LOCAL_IDENTIFIER"

# Start BrowserStackLocal in background
/Users/nb/.browserstack/BrowserStackLocal --key "$BROWSERSTACK_KEY" \
    --local-identifier "$LOCAL_IDENTIFIER" \
    --force \
    --only-automate \
    --verbose 3 &

# Wait for it to start
sleep 3

# Check if it started successfully
if pgrep -f "BrowserStackLocal" > /dev/null; then
    echo -e "${GREEN}BrowserStack Local started successfully!${NC}"
    echo ""
    echo "To run tests in container, use:"
    echo "  export BROWSERSTACK_DAEMON_STARTED=true"
    echo "  export BROWSERSTACK_LOCAL_IDENTIFIER=$LOCAL_IDENTIFIER"
    echo ""
    echo "Or in one line:"
    echo "  BROWSERSTACK_DAEMON_STARTED=true BROWSERSTACK_LOCAL_IDENTIFIER=$LOCAL_IDENTIFIER docker exec -t mikopbx-php83 ..."
else
    echo -e "${RED}Failed to start BrowserStack Local${NC}"
    exit 1
fi
