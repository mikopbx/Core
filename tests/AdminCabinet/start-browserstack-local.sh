#!/bin/bash

# Script to start BrowserStack Local on macOS host
# This is required because tests run in container but BrowserStackLocal must run on host

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load configuration
CONFIG_FILE="${CONFIG_FILE:-config/local.conf.json}"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="../config/local.conf.json"
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found${NC}"
    exit 1
fi

# Extract BrowserStack key from config
BROWSERSTACK_KEY=$(grep -o '"key"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)

if [ -z "$BROWSERSTACK_KEY" ]; then
    echo -e "${RED}Error: BrowserStack key not found in config${NC}"
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
    echo "  BROWSERSTACK_DAEMON_STARTED=true BROWSERSTACK_LOCAL_IDENTIFIER=$LOCAL_IDENTIFIER docker exec -t mikopbx_php83 ..."
else
    echo -e "${RED}Failed to start BrowserStack Local${NC}"
    exit 1
fi