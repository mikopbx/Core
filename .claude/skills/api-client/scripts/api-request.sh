#!/bin/bash
#
# MikoPBX REST API Client
#
# Universal script for executing REST API requests with automatic authentication
# Runs requests inside Docker container for network isolation testing
#
# Usage:
#   ./api-request.sh <METHOD> <ENDPOINT> [OPTIONS]
#
# Examples:
#   ./api-request.sh GET extensions
#   ./api-request.sh GET "cdr?search=Ivan&limit=5"
#   ./api-request.sh POST extensions --data "number=201&username=test"
#   ./api-request.sh PATCH "extensions/201" --data "mobile=1234567890"
#   ./api-request.sh DELETE "extensions/201"
#
# Options:
#   --data "key=value"    Form data for POST/PATCH
#   --json '{"key":"v"}'  JSON payload for POST/PATCH
#   --container NAME      Specific container (default: auto-detect)
#   --lines N             Limit output to N lines (default: 80, 0 = no limit)
#   --debug               Show debug information
#
# Environment Variables:
#   MIKOPBX_LOGIN         Username (default: admin)
#   MIKOPBX_PASSWORD      Password (default: 123456789MikoPBX#1)
#   MIKOPBX_CONTAINER     Container name (default: auto-detect)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Container not found
#   3 - Authentication failed
#   4 - API request failed
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Default values
DEFAULT_CONTAINER="${MIKOPBX_CONTAINER:-}"
DEFAULT_LINES=80
API_BASE_PATH="/pbxcore/api/v3"
INTERNAL_URL="http://127.0.0.1:8081"

# Script directory (for locating auth-token-manager and container detection)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$(dirname "$SKILL_DIR")"
CLAUDE_DIR="$(dirname "$SKILLS_DIR")"
AUTH_TOKEN_SCRIPT="$SKILLS_DIR/auth-token-manager/get-auth-token.sh"
CONTAINER_DETECT_SCRIPT="$CLAUDE_DIR/scripts/get-container-name.sh"

# ============================================================================
# Parse Arguments
# ============================================================================

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <METHOD> <ENDPOINT> [OPTIONS]" >&2
    echo "" >&2
    echo "Methods: GET, POST, PATCH, DELETE, PUT" >&2
    echo "" >&2
    echo "Examples:" >&2
    echo "  $0 GET extensions" >&2
    echo "  $0 GET 'cdr?search=Ivan&limit=5'" >&2
    echo "  $0 POST extensions --data 'number=201&username=test'" >&2
    echo "  $0 PATCH 'extensions/201' --data 'mobile=1234567890'" >&2
    echo "  $0 DELETE 'extensions/201'" >&2
    echo "" >&2
    echo "Options:" >&2
    echo "  --data 'key=value'    Form data for POST/PATCH" >&2
    echo "  --json '{\"key\":\"v\"}'  JSON payload for POST/PATCH" >&2
    echo "  --container NAME      Specific container (default: auto-detect)" >&2
    echo "  --lines N             Limit output to N lines (default: 80, 0 = no limit)" >&2
    echo "  --debug               Show debug information" >&2
    exit 1
fi

METHOD="$1"
ENDPOINT="$2"
shift 2

# Validate HTTP method
case "$METHOD" in
    GET|POST|PATCH|DELETE|PUT)
        ;;
    *)
        echo "❌ ERROR: Invalid HTTP method: $METHOD" >&2
        echo "Supported methods: GET, POST, PATCH, DELETE, PUT" >&2
        exit 1
        ;;
esac

# Parse options
DATA=""
JSON_PAYLOAD=""
CONTAINER_NAME="$DEFAULT_CONTAINER"
LINE_LIMIT=$DEFAULT_LINES
DEBUG=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --data)
            DATA="$2"
            shift 2
            ;;
        --json)
            JSON_PAYLOAD="$2"
            shift 2
            ;;
        --container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --lines)
            LINE_LIMIT="$2"
            shift 2
            ;;
        --debug)
            DEBUG=1
            shift
            ;;
        *)
            echo "❌ ERROR: Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# ============================================================================
# Functions
# ============================================================================

debug() {
    if [[ "$DEBUG" == "1" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

error() {
    echo "❌ ERROR: $*" >&2
}

info() {
    echo "ℹ️  $*" >&2
}

# ============================================================================
# Container Detection
# ============================================================================

debug "Starting container detection..."

if [[ -z "$CONTAINER_NAME" ]]; then
    # Auto-detect running MikoPBX container based on current worktree
    debug "No container specified, auto-detecting based on worktree..."

    if [[ -x "$CONTAINER_DETECT_SCRIPT" ]]; then
        # Use smart detection script
        CONTAINER_NAME=$("$CONTAINER_DETECT_SCRIPT" 2>&1) || {
            error "Failed to auto-detect container"
            echo "" >&2
            echo "Available containers:" >&2
            docker ps -a --filter "name=mikopbx" --format "  {{.Names}}  ({{.Status}})" >&2
            echo "" >&2
            echo "Specify container explicitly with --container or check get-container-name.sh" >&2
            exit 2
        }
        debug "Auto-detected container: $CONTAINER_NAME"
    else
        # Fallback to old behavior
        debug "Container detection script not found, using fallback..."

        # Prefer mikopbx_php83 (main develop)
        if docker ps --format "{{.Names}}" | grep -q "^mikopbx_php83$"; then
            CONTAINER_NAME="mikopbx_php83"
            debug "Found mikopbx_php83 (develop)"
        elif docker ps --format "{{.Names}}" | grep -q "^mikopbx_php74$"; then
            CONTAINER_NAME="mikopbx_php74"
            debug "Found mikopbx_php74 (old release)"
        else
            # Try any mikopbx container
            CONTAINER_NAME=$(docker ps --filter "name=mikopbx" --format "{{.Names}}" | head -1)
            if [[ -z "$CONTAINER_NAME" ]]; then
                error "No running MikoPBX containers found"
                echo "" >&2
                echo "Available containers:" >&2
                docker ps -a --filter "name=mikopbx" --format "  {{.Names}}  ({{.Status}})" >&2
                echo "" >&2
                echo "Start a container or specify one with --container" >&2
                exit 2
            fi
            debug "Found container: $CONTAINER_NAME"
        fi
    fi
fi

# Verify container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    error "Container '$CONTAINER_NAME' is not running"
    echo "" >&2
    echo "Start the container:" >&2
    echo "  docker start $CONTAINER_NAME" >&2
    exit 2
fi

CONTAINER_ID=$(docker ps --filter "name=${CONTAINER_NAME}" --format "{{.ID}}")
debug "Container ID: $CONTAINER_ID"

# ============================================================================
# Authentication
# ============================================================================

debug "Getting authentication token..."

# Check if auth-token-manager script exists
if [[ ! -f "$AUTH_TOKEN_SCRIPT" ]]; then
    error "Authentication script not found: $AUTH_TOKEN_SCRIPT"
    echo "" >&2
    echo "Make sure auth-token-manager skill is installed" >&2
    exit 3
fi

# Copy auth script to container
TEMP_AUTH_SCRIPT="/tmp/get-auth-token-$$.sh"
docker cp "$AUTH_TOKEN_SCRIPT" "${CONTAINER_ID}:${TEMP_AUTH_SCRIPT}" >/dev/null 2>&1 || {
    error "Failed to copy authentication script to container"
    exit 3
}

# Execute auth script inside container with environment variables
# Redirect stderr only in non-debug mode
if [[ "$DEBUG" == "1" ]]; then
    TOKEN=$(docker exec "$CONTAINER_ID" \
        env \
        MIKOPBX_API_URL="${INTERNAL_URL}${API_BASE_PATH}" \
        MIKOPBX_LOGIN="${MIKOPBX_LOGIN:-admin}" \
        MIKOPBX_PASSWORD="${MIKOPBX_PASSWORD:-123456789MikoPBX#1}" \
        bash "$TEMP_AUTH_SCRIPT") || {
        error "Failed to obtain authentication token"
        docker exec "$CONTAINER_ID" rm -f "$TEMP_AUTH_SCRIPT" 2>/dev/null || true
        exit 3
    }
else
    TOKEN=$(docker exec "$CONTAINER_ID" \
        env \
        MIKOPBX_API_URL="${INTERNAL_URL}${API_BASE_PATH}" \
        MIKOPBX_LOGIN="${MIKOPBX_LOGIN:-admin}" \
        MIKOPBX_PASSWORD="${MIKOPBX_PASSWORD:-123456789MikoPBX#1}" \
        bash "$TEMP_AUTH_SCRIPT" 2>/dev/null) || {
        error "Failed to obtain authentication token"
        echo "" >&2
        echo "Check credentials:" >&2
        echo "  MIKOPBX_LOGIN=${MIKOPBX_LOGIN:-admin}" >&2
        echo "  MIKOPBX_PASSWORD=***" >&2
        echo "" >&2
        echo "Try running with --debug to see more details" >&2
        docker exec "$CONTAINER_ID" rm -f "$TEMP_AUTH_SCRIPT" 2>/dev/null || true
        exit 3
    }
fi

# Cleanup auth script
docker exec "$CONTAINER_ID" rm -f "$TEMP_AUTH_SCRIPT" 2>/dev/null || true

debug "Token obtained: ${TOKEN:0:50}..."

# ============================================================================
# Build API Request
# ============================================================================

# Remove leading slash from endpoint if present
ENDPOINT="${ENDPOINT#/}"

# Build full URL
FULL_URL="${INTERNAL_URL}${API_BASE_PATH}/${ENDPOINT}"

debug "Method: $METHOD"
debug "URL: $FULL_URL"

# Build curl command
CURL_CMD="curl -s -X $METHOD"
CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $TOKEN'"

# Add content based on method and payload
if [[ "$METHOD" == "POST" || "$METHOD" == "PATCH" || "$METHOD" == "PUT" ]]; then
    if [[ -n "$JSON_PAYLOAD" ]]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json'"
        CURL_CMD="$CURL_CMD --data-raw '$JSON_PAYLOAD'"
        debug "JSON payload: $JSON_PAYLOAD"
    elif [[ -n "$DATA" ]]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/x-www-form-urlencoded'"
        CURL_CMD="$CURL_CMD --data-raw '$DATA'"
        debug "Form data: $DATA"
    fi
fi

CURL_CMD="$CURL_CMD '$FULL_URL'"

debug "Curl command: $CURL_CMD"

# ============================================================================
# Execute API Request
# ============================================================================

info "Executing: $METHOD $ENDPOINT"

# Execute request inside container
RESPONSE=$(docker exec "$CONTAINER_ID" bash -c "$CURL_CMD" 2>&1) || {
    error "API request failed"
    echo "" >&2
    echo "Response:" >&2
    echo "$RESPONSE" >&2
    exit 4
}

debug "Response received (${#RESPONSE} bytes)"

# ============================================================================
# Format and Output Response
# ============================================================================

# Check if response is valid JSON
if echo "$RESPONSE" | python3 -m json.tool >/dev/null 2>&1; then
    # Pretty-print JSON
    if [[ "$LINE_LIMIT" -gt 0 ]]; then
        echo "$RESPONSE" | python3 -m json.tool | head -n "$LINE_LIMIT"

        # Show truncation notice if needed
        TOTAL_LINES=$(echo "$RESPONSE" | python3 -m json.tool | wc -l)
        if [[ "$TOTAL_LINES" -gt "$LINE_LIMIT" ]]; then
            echo "" >&2
            echo "ℹ️  Output truncated at $LINE_LIMIT lines (total: $TOTAL_LINES)" >&2
            echo "ℹ️  Use --lines $TOTAL_LINES or --lines 0 to see full output" >&2
        fi
    else
        # No limit
        echo "$RESPONSE" | python3 -m json.tool
    fi
else
    # Not JSON, output as-is
    if [[ "$LINE_LIMIT" -gt 0 ]]; then
        echo "$RESPONSE" | head -n "$LINE_LIMIT"
    else
        echo "$RESPONSE"
    fi

    debug "Response is not valid JSON"
fi

# ============================================================================
# Check Response Status
# ============================================================================

# Try to extract result status from JSON
RESULT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('result', 'unknown'))" 2>/dev/null || echo "unknown")

if [[ "$RESULT" == "False" ]]; then
    echo "" >&2
    error "API request returned result: false"

    # Try to extract error messages
    MESSAGES=$(echo "$RESPONSE" | python3 -c "import sys, json; import pprint; pprint.pprint(json.load(sys.stdin).get('messages', {}))" 2>/dev/null || echo "")
    if [[ -n "$MESSAGES" ]]; then
        echo "" >&2
        echo "Messages:" >&2
        echo "$MESSAGES" >&2
    fi

    exit 4
fi

debug "Request completed successfully"
exit 0
