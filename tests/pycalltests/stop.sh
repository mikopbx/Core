#!/usr/bin/env bash
###############################################################################
# cipbx Stop Script
#
# Stops running cipbx server
#
# Usage:
#   chmod +x stop.sh
#   ./stop.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/cipbx.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "cipbx is not running (no PID file)"
    exit 0
fi

CIPBX_PID=$(cat "$PID_FILE")

if ! ps -p "$CIPBX_PID" > /dev/null 2>&1; then
    echo "cipbx is not running (stale PID file)"
    rm "$PID_FILE"
    exit 0
fi

echo "Stopping cipbx (PID: $CIPBX_PID)..."
kill "$CIPBX_PID"

# Wait for process to stop (max 5 seconds)
for i in {1..10}; do
    if ! ps -p "$CIPBX_PID" > /dev/null 2>&1; then
        echo "✓ cipbx stopped successfully"
        rm "$PID_FILE"
        exit 0
    fi
    sleep 0.5
done

# Force kill if still running
if ps -p "$CIPBX_PID" > /dev/null 2>&1; then
    echo "Force killing cipbx..."
    kill -9 "$CIPBX_PID"
    rm "$PID_FILE"
    echo "✓ cipbx force killed"
fi

exit 0
