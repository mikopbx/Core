#!/bin/bash
# Get MikoPBX container API URL based on current working directory
# This script retrieves the internal API URL for the container associated with current worktree

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get container name using detection script
CONTAINER_NAME=$("$SCRIPT_DIR/get-container-name.sh") || {
    echo "Error: Failed to detect container" >&2
    exit 1
}

# Get container IP (internal network)
CONTAINER_IP=$(docker inspect "$CONTAINER_NAME" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)

if [ -z "$CONTAINER_IP" ]; then
    echo "Error: Failed to get IP address for container $CONTAINER_NAME" >&2
    exit 1
fi

# Determine protocol and port based on environment
# Inside container: use HTTP on port 8081 (internal)
# Outside container: could use HTTPS on mapped port

# For internal container communication (default)
PROTOCOL="http"
PORT="8081"
API_PATH="/pbxcore/api/v3"

# Construct URL
API_URL="${PROTOCOL}://${CONTAINER_IP}:${PORT}${API_PATH}"

# Output URL
echo "$API_URL"
exit 0
