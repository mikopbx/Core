#!/bin/bash
# restart-container.sh
# Gracefully restart MikoPBX container with optional service wait

set -e

CONTAINER_NAME="$1"
WAIT_MODE="${2:---wait-services}"

if [ -z "$CONTAINER_NAME" ]; then
    echo "Usage: $0 <container_name> [--wait-services|--no-wait]"
    echo ""
    echo "Examples:"
    echo "  $0 mikopbx_php83"
    echo "  $0 mikopbx_php83 --wait-services"
    echo "  $0 mikopbx_php74 --no-wait"
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

echo "🔄 Restarting container '${CONTAINER_NAME}'..."

# Restart container
if ! docker restart "$CONTAINER_NAME" > /dev/null 2>&1; then
    echo "❌ ERROR: Failed to restart container"
    echo ""
    echo "Check logs:"
    echo "  docker logs ${CONTAINER_NAME}"
    exit 2
fi

echo "✅ Container restart command sent"

# Wait for container to be running
echo "⏳ Waiting for container to start..."
sleep 5

# Verify container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ ERROR: Container failed to start"
    echo ""
    echo "Check logs:"
    echo "  docker logs ${CONTAINER_NAME}"
    exit 2
fi

echo "✅ Container is running"

# Skip service wait if requested
if [ "$WAIT_MODE" = "--no-wait" ]; then
    echo ""
    echo "✅ Container restarted successfully (no service wait)"
    exit 0
fi

# Wait for services
echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for PHP-FPM
echo -n "  PHP-FPM: "
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec "$CONTAINER_NAME" pgrep php-fpm > /dev/null 2>&1; then
        echo "✅ Ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Timeout"
    echo ""
    echo "ERROR: PHP-FPM failed to start after 60 seconds"
    echo ""
    echo "Check logs:"
    echo "  docker exec ${CONTAINER_NAME} tail -100 /storage/usbdisk1/mikopbx/log/system/messages"
    exit 3
fi

# Wait for Redis
echo -n "  Redis: "
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec "$CONTAINER_NAME" redis-cli ping > /dev/null 2>&1; then
        echo "✅ Ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Timeout"
    echo ""
    echo "ERROR: Redis failed to start after 60 seconds"
    exit 3
fi

# Wait for Asterisk
echo -n "  Asterisk: "
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec "$CONTAINER_NAME" asterisk -rx "core show version" > /dev/null 2>&1; then
        echo "✅ Ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "⚠️  Timeout (non-critical)"
fi

# Determine hostname and HTTPS port
if [[ "$CONTAINER_NAME" == *"php83"* ]]; then
    WEB_URL="https://mikopbx_php83.localhost:8445"
elif [[ "$CONTAINER_NAME" == *"php74"* ]]; then
    WEB_URL="https://mikopbx_php74.localhost:8444"
else
    # Try to get IP address as fallback
    IP_ADDRESS=$(docker inspect "$CONTAINER_NAME" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    WEB_URL="http://${IP_ADDRESS}"
fi

# Wait for web interface
echo -n "  Web Interface: "
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -k -s "$WEB_URL" > /dev/null 2>&1; then
        echo "✅ Ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "⚠️  Timeout (non-critical)"
fi

# All done
echo ""
echo "✅ All services are ready!"
echo ""
echo "Container '${CONTAINER_NAME}' restarted successfully"
echo ""
echo "Access the web interface at:"
echo "  ${WEB_URL}"
echo ""

exit 0
