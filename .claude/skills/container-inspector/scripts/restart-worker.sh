#!/bin/bash
# restart-worker.sh
# Restart specific worker process inside MikoPBX container

set -e

CONTAINER_NAME="$1"
WORKER_NAME="$2"

# Available workers
AVAILABLE_WORKERS=(
    "WorkerApiCommands"
    "WorkerAMI"
    "WorkerCdr"
    "WorkerModelsEvents"
    "WorkerNotifyError"
    "WorkerSafeScripts"
)

if [ -z "$CONTAINER_NAME" ] || [ -z "$WORKER_NAME" ]; then
    echo "Usage: $0 <container_name> <worker_name|list>"
    echo ""
    echo "Examples:"
    echo "  $0 mikopbx_php83 list"
    echo "  $0 mikopbx_php83 WorkerApiCommands"
    echo "  $0 mikopbx_php74 WorkerCdr"
    echo ""
    echo "Available workers:"
    for worker in "${AVAILABLE_WORKERS[@]}"; do
        echo "  - $worker"
    done
    exit 1
fi

# Check if container exists
if ! docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ ERROR: Container '${CONTAINER_NAME}' not found"
    echo ""
    echo "Available containers:"
    docker ps -a --filter "name=mikopbx" --format "  {{.Names}}  ({{.Status}})"
    exit 1
fi

# Check if container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ ERROR: Container '${CONTAINER_NAME}' exists but is not running"
    echo ""
    echo "Start the container:"
    echo "  docker start ${CONTAINER_NAME}"
    exit 1
fi

# List workers if requested
if [ "$WORKER_NAME" = "list" ]; then
    echo "Scanning for running workers in '${CONTAINER_NAME}'..."
    echo ""

    for worker in "${AVAILABLE_WORKERS[@]}"; do
        if docker exec "$CONTAINER_NAME" pgrep -f "$worker" > /dev/null 2>&1; then
            PID=$(docker exec "$CONTAINER_NAME" pgrep -f "$worker" | head -1)
            echo "  ✅ $worker (PID: $PID)"
        else
            echo "  ❌ $worker (not running)"
        fi
    done

    echo ""
    exit 0
fi

# Validate worker name
VALID_WORKER=0
for worker in "${AVAILABLE_WORKERS[@]}"; do
    if [ "$worker" = "$WORKER_NAME" ]; then
        VALID_WORKER=1
        break
    fi
done

if [ $VALID_WORKER -eq 0 ]; then
    echo "❌ ERROR: Unknown worker '${WORKER_NAME}'"
    echo ""
    echo "Available workers:"
    for worker in "${AVAILABLE_WORKERS[@]}"; do
        echo "  - $worker"
    done
    exit 2
fi

echo "🔄 Restarting worker '${WORKER_NAME}' in '${CONTAINER_NAME}'..."

# Find worker process
PID=$(docker exec "$CONTAINER_NAME" pgrep -f "$WORKER_NAME" | head -1 || echo "")

if [ -z "$PID" ]; then
    echo "❌ ERROR: Worker '${WORKER_NAME}' is not running"
    echo ""
    echo "Check system logs:"
    echo "  docker exec ${CONTAINER_NAME} tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep ${WORKER_NAME}"
    exit 2
fi

echo "✅ Found worker process (PID: $PID)"

# Send SIGHUP to restart worker gracefully
echo "📤 Sending SIGHUP signal..."
if ! docker exec "$CONTAINER_NAME" kill -HUP "$PID" 2>/dev/null; then
    echo "❌ ERROR: Failed to send signal to worker"
    exit 3
fi

# Wait a moment for worker to restart
sleep 2

# Verify worker restarted
NEW_PID=$(docker exec "$CONTAINER_NAME" pgrep -f "$WORKER_NAME" | head -1 || echo "")

if [ -z "$NEW_PID" ]; then
    echo "❌ ERROR: Worker '${WORKER_NAME}' not found after restart"
    echo ""
    echo "Worker may have crashed. Check logs:"
    echo "  docker exec ${CONTAINER_NAME} tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep ${WORKER_NAME}"
    echo ""
    echo "Fallback: Restart entire container"
    echo "  ./restart-container.sh ${CONTAINER_NAME} --wait-services"
    exit 3
fi

if [ "$NEW_PID" = "$PID" ]; then
    echo "✅ Worker reloaded (same PID: $PID)"
else
    echo "✅ Worker restarted (new PID: $NEW_PID)"
fi

echo ""
echo "Worker '${WORKER_NAME}' restarted successfully"
echo ""

exit 0
