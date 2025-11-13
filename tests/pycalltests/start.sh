#!/usr/bin/env bash
###############################################################################
# cipbx Startup Script
#
# Starts cipbx server with configuration for MikoPBX testing
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIPBX_BIN="$SCRIPT_DIR/cipbx"
LOG_FILE="$SCRIPT_DIR/logs/cipbx.log"
PID_FILE="$SCRIPT_DIR/cipbx.pid"

# Default configuration
LISTEN_IP="${CIPBX_LISTEN_IP:-0.0.0.0}"
LISTEN_PORT="${CIPBX_PORT:-5090}"
TRANSPORT="${CIPBX_TRANSPORT:-udp}"
TIMEOUT="${CIPBX_TIMEOUT:-60}"

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# Check if cipbx is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "cipbx is already running (PID: $OLD_PID)"
        exit 0
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Check if cipbx binary exists
if [ ! -f "$CIPBX_BIN" ]; then
    echo "ERROR: cipbx binary not found at $CIPBX_BIN"
    echo "Please run install.sh first"
    exit 1
fi

echo "Starting cipbx server..."
echo "  Listen: $LISTEN_IP:$LISTEN_PORT"
echo "  Transport: $TRANSPORT"
echo "  Timeout: ${TIMEOUT}s"
echo "  Log: $LOG_FILE"

# Start cipbx in background
"$CIPBX_BIN" server \
    -l "$LISTEN_IP" \
    -p "$LISTEN_PORT" \
    --transport "$TRANSPORT" \
    -t "$TIMEOUT" \
    > "$LOG_FILE" 2>&1 &

CIPBX_PID=$!
echo "$CIPBX_PID" > "$PID_FILE"

# Wait a moment and check if process started successfully
sleep 2
if ps -p "$CIPBX_PID" > /dev/null 2>&1; then
    echo "✓ cipbx started successfully (PID: $CIPBX_PID)"
    echo "  View logs: tail -f $LOG_FILE"
    exit 0
else
    echo "✗ cipbx failed to start"
    echo "  Check logs: cat $LOG_FILE"
    rm "$PID_FILE"
    exit 1
fi
