#!/bin/bash
# get-container-info.sh
# Retrieve connection parameters for MikoPBX containers

set -e

CONTAINER_NAME="${1:-}"

# Function to get info for a single container
get_container_info() {
    local name="$1"

    # Check if container exists
    if ! docker ps -a --format "{{.Names}}" | grep -q "^${name}$"; then
        echo "❌ ERROR: Container '${name}' not found"
        echo ""
        echo "Available containers:"
        docker ps -a --filter "name=mikopbx" --format "  {{.Names}}  ({{.Status}})"
        return 1
    fi

    # Check if container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${name}$"; then
        echo "❌ ERROR: Container '${name}' exists but is not running"
        echo ""
        echo "Start the container:"
        echo "  docker start ${name}"
        return 2
    fi

    # Get container details
    CONTAINER_ID=$(docker ps --filter "name=${name}" --format "{{.ID}}")
    STATUS=$(docker ps --filter "name=${name}" --format "{{.Status}}")
    IP_ADDRESS=$(docker inspect "${name}" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

    # Determine API version based on container name
    if [[ "$name" == *"php83"* ]]; then
        API_VERSION="v3"
        API_PATH="/pbxcore/api/v3"
        VERSION_INFO="develop (API v3)"
    else
        API_VERSION="v1"
        API_PATH="/pbxcore/api"
        VERSION_INFO="old release (API v1)"
    fi

    # Get port mappings
    HTTP_PORT=$(docker port "${name}" | grep "8081/tcp" | head -1 | awk -F: '{print $2}' || echo "")
    HTTPS_PORT=$(docker port "${name}" | grep "8443/tcp\|8444/tcp\|8445/tcp" | head -1 | awk -F: '{print $2}' || echo "")
    SIP_PORT=$(docker port "${name}" | grep "5060/tcp" | head -1 | awk -F: '{print $2}' || echo "")
    SSH_PORT=$(docker port "${name}" | grep "8023/tcp\|8024/tcp" | head -1 | awk -F: '{print $2}' || echo "")

    # If ports not found from docker port, try to extract from port mappings
    if [ -z "$HTTP_PORT" ]; then
        HTTP_PORT=$(docker inspect "${name}" --format '{{range $p, $conf := .NetworkSettings.Ports}}{{if eq $p "80/tcp"}}{{(index $conf 0).HostPort}}{{end}}{{end}}')
    fi

    if [ -z "$HTTPS_PORT" ]; then
        # Try common HTTPS ports
        for port in 8443 8444 8445; do
            HTTPS_PORT=$(docker inspect "${name}" --format "{{range \$p, \$conf := .NetworkSettings.Ports}}{{if eq \$p \"${port}/tcp\"}}{{(index \$conf 0).HostPort}}{{end}}{{end}}")
            [ -n "$HTTPS_PORT" ] && break
        done
    fi

    # Get internal ports from database
    DB_PORTS=$(docker exec "${name}" sqlite3 /cf/conf/mikopbx.db "SELECT key, value FROM m_PBXSettings WHERE key IN ('WEBPort', 'WEBHTTPSPort', 'SIPPort', 'IAXPort')" 2>/dev/null || echo "")

    # Parse database ports
    WEB_PORT_INTERNAL=$(echo "$DB_PORTS" | grep "WEBPort|" | cut -d'|' -f2)
    WEB_HTTPS_PORT_INTERNAL=$(echo "$DB_PORTS" | grep "WEBHTTPSPort|" | cut -d'|' -f2)
    SIP_PORT_INTERNAL=$(echo "$DB_PORTS" | grep "^SIPPort|" | cut -d'|' -f2)
    IAX_PORT_INTERNAL=$(echo "$DB_PORTS" | grep "IAXPort|" | cut -d'|' -f2)

    # Determine hostname pattern
    if [[ "$name" == *"php83"* ]]; then
        HOSTNAME="mikopbx_php83.localhost"
    elif [[ "$name" == *"php74"* ]]; then
        HOSTNAME="mikopbx_php74.localhost"
    else
        HOSTNAME="${name}.localhost"
    fi

    # Print info
    echo "==================================="
    echo "MikoPBX Container Info"
    echo "==================================="
    echo ""
    echo "Container: ${name}"
    echo "Status: ${STATUS}"
    echo "Container ID: ${CONTAINER_ID}"
    echo "Version: ${VERSION_INFO}"
    echo ""
    echo "Network:"
    echo "  IP Address: ${IP_ADDRESS}"
    echo ""
    echo "Ports (Host → Container):"
    [ -n "$HTTP_PORT" ] && echo "  HTTP:  ${HTTP_PORT} → ${WEB_PORT_INTERNAL:-80} (http://${IP_ADDRESS}:${WEB_PORT_INTERNAL:-80})"
    [ -n "$HTTPS_PORT" ] && echo "  HTTPS: ${HTTPS_PORT} → ${WEB_HTTPS_PORT_INTERNAL:-443} (https://${IP_ADDRESS}:${WEB_HTTPS_PORT_INTERNAL:-443})"
    [ -n "$SIP_PORT" ] && echo "  SIP:   ${SIP_PORT} → ${SIP_PORT_INTERNAL:-5060}"
    [ -n "$SSH_PORT" ] && echo "  SSH:   ${SSH_PORT} (ssh root@${IP_ADDRESS} -p ${SSH_PORT})"
    [ -n "$IAX_PORT_INTERNAL" ] && echo "  IAX:   ${IAX_PORT_INTERNAL} (internal)"
    echo ""
    echo "Access URLs:"
    [ -n "$HTTPS_PORT" ] && echo "  Web Interface: https://${HOSTNAME}:${HTTPS_PORT}"
    [ -n "$HTTPS_PORT" ] && echo "  API Endpoint:  https://${HOSTNAME}:${HTTPS_PORT}${API_PATH}"
    [ -n "$HTTP_PORT" ] && echo "  Web (HTTP):    http://${HOSTNAME}:${HTTP_PORT}"
    [ -n "$HTTP_PORT" ] && echo "  API (HTTP):    http://${HOSTNAME}:${HTTP_PORT}${API_PATH}"
    echo ""
    echo "Direct IP Access:"
    [ -n "$IP_ADDRESS" ] && [ -n "$WEB_PORT_INTERNAL" ] && echo "  Web (HTTP):    http://${IP_ADDRESS}:${WEB_PORT_INTERNAL}"
    [ -n "$IP_ADDRESS" ] && [ -n "$WEB_HTTPS_PORT_INTERNAL" ] && echo "  Web (HTTPS):   https://${IP_ADDRESS}:${WEB_HTTPS_PORT_INTERNAL}"
    [ -n "$IP_ADDRESS" ] && [ -n "$WEB_HTTPS_PORT_INTERNAL" ] && echo "  API:           https://${IP_ADDRESS}:${WEB_HTTPS_PORT_INTERNAL}${API_PATH}"
    echo ""
    echo "Database:"
    echo "  Path: /cf/conf/mikopbx.db"
    echo ""
    echo "Credentials:"
    echo "  Username: admin"
    echo "  Password: 123456789MikoPBX#1"
    echo ""
    echo "Common Commands:"
    echo "  Shell Access:  docker exec -it ${name} /bin/sh"
    echo "  View Logs:     docker logs ${name}"
    echo "  System Log:    docker exec ${name} tail -f /storage/usbdisk1/mikopbx/log/system/messages"
    echo "  PHP Errors:    docker exec ${name} tail -f /storage/usbdisk1/mikopbx/log/php/error.log"
    echo "  Asterisk CLI:  docker exec -it ${name} asterisk -rvvv"
    echo ""

    return 0
}

# Main execution
if [ -z "$CONTAINER_NAME" ]; then
    # No container specified, show all mikopbx containers
    echo "Scanning for MikoPBX containers..."
    echo ""

    CONTAINERS=$(docker ps --filter "name=mikopbx" --format "{{.Names}}" | sort)

    if [ -z "$CONTAINERS" ]; then
        echo "❌ No running MikoPBX containers found"
        echo ""
        echo "Available stopped containers:"
        docker ps -a --filter "name=mikopbx" --format "  {{.Names}}  ({{.Status}})"
        exit 1
    fi

    FIRST=1
    for container in $CONTAINERS; do
        if [ $FIRST -eq 0 ]; then
            echo ""
            echo "-----------------------------------"
            echo ""
        fi
        get_container_info "$container"
        FIRST=0
    done
else
    # Specific container requested
    get_container_info "$CONTAINER_NAME"
fi

exit 0
