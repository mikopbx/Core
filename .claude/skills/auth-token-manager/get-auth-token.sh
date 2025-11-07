#!/bin/bash
#
# MikoPBX Authentication Token Manager
#
# Obtains JWT Bearer token from MikoPBX REST API v3
# Returns token to stdout for use in API requests
#
# Usage:
#   TOKEN=$(bash get-auth-token.sh)
#   curl -H "Authorization: Bearer $TOKEN" http://mikopbx_php83.localhost:8081/pbxcore/api/v3/extensions
#
# Environment Variables:
#   MIKOPBX_API_URL  - API base URL (default: http://mikopbx_php83.localhost:8081/pbxcore/api/v3)
#   MIKOPBX_LOGIN    - Username (default: admin)
#   MIKOPBX_PASSWORD - Password (default: 123456789MikoPBX#1)
#
# Exit Codes:
#   0 - Success (token printed to stdout)
#   1 - Authentication failed
#   2 - Connection failed
#   3 - Invalid response format
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# API endpoint (support both HTTP and HTTPS)
API_URL="${MIKOPBX_API_URL:-http://mikopbx_php83.localhost:8081/pbxcore/api/v3}"

# Credentials
LOGIN="${MIKOPBX_LOGIN:-admin}"
PASSWORD="${MIKOPBX_PASSWORD:-123456789MikoPBX#1}"

# Temporary cookie jar for session management
COOKIE_JAR="/tmp/mikopbx_auth_cookies_$$.txt"

# Cleanup on exit
trap "rm -f '$COOKIE_JAR' 2>/dev/null" EXIT

# Debug mode
DEBUG="${DEBUG:-0}"
if [[ "${1:-}" == "--debug" ]]; then
    DEBUG=1
fi

# ============================================================================
# Functions
# ============================================================================

debug() {
    if [[ "$DEBUG" == "1" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

error() {
    echo "[ERROR] $*" >&2
}

# ============================================================================
# Main
# ============================================================================

debug "API URL: $API_URL"
debug "Login: $LOGIN"
debug "Cookie jar: $COOKIE_JAR"

# Prepare curl options based on protocol
CURL_OPTS=(-s -c "$COOKIE_JAR")

# Add --insecure for HTTPS (self-signed certificates)
if [[ "$API_URL" == https://* ]]; then
    CURL_OPTS+=(--insecure)
    debug "HTTPS detected, adding --insecure flag"
fi

# URL encode password for form data
# Note: Using printf %s to handle special characters
PASSWORD_ENCODED=$(printf '%s' "$PASSWORD" | python3 -c "import sys; from urllib.parse import quote; print(quote(sys.stdin.read(), safe=''))")

# Prepare login data
LOGIN_DATA="login=${LOGIN}&password=${PASSWORD_ENCODED}&rememberMe=false"

debug "Making authentication request..."

# Make authentication request
RESPONSE=$(curl "${CURL_OPTS[@]}" \
    -X POST \
    -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
    --data-raw "$LOGIN_DATA" \
    "${API_URL}/auth:login" 2>/dev/null) || {
    error "Failed to connect to MikoPBX API"
    error "URL: ${API_URL}/auth:login"
    error "Check if MikoPBX container is running and accessible"
    exit 2
}

debug "Response received"

# Check if response is valid JSON
if ! echo "$RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin)" >/dev/null 2>&1; then
    error "Invalid JSON response from API"
    error "Response: $RESPONSE"
    exit 3
fi

# Extract result status
RESULT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('result', False))")

if [[ "$RESULT" != "True" ]]; then
    error "Authentication failed"
    MESSAGES=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('messages', {}))" 2>/dev/null || echo "Unknown error")
    error "Messages: $MESSAGES"
    exit 1
fi

# Extract access token
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null) || {
    error "Failed to extract access token from response"
    error "Response: $RESPONSE"
    exit 3
}

# Validate token format (JWT should have 3 parts)
TOKEN_PARTS=$(echo "$TOKEN" | tr '.' '\n' | wc -l)
if [[ "$TOKEN_PARTS" -ne 3 ]]; then
    error "Invalid token format (expected JWT with 3 parts, got $TOKEN_PARTS)"
    error "Token: $TOKEN"
    exit 3
fi

# Extract token metadata for debug
if [[ "$DEBUG" == "1" ]]; then
    EXPIRES_IN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('expiresIn', 'N/A'))" 2>/dev/null || echo "N/A")
    TOKEN_TYPE=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('tokenType', 'N/A'))" 2>/dev/null || echo "N/A")

    debug "Authentication successful"
    debug "Token type: $TOKEN_TYPE"
    debug "Expires in: $EXPIRES_IN seconds"
    debug "Token (first 50 chars): ${TOKEN:0:50}..."
    debug "Cookie jar saved to: $COOKIE_JAR"
fi

# Output token to stdout (for capture in scripts)
echo "$TOKEN"

exit 0
