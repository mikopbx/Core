#!/bin/bash
# MikoPBX Database Query Helper Script
# Simplifies querying MikoPBX SQLite databases in Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_PATH="/cf/conf/mikopbx.db"
OUTPUT_FORMAT="column"
CONTAINER_ID=""

# Function to print usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <query>

OPTIONS:
    -c, --container ID      Docker container ID (auto-detect if not specified)
    -d, --database PATH     Database path (default: /cf/conf/mikopbx.db)
    -f, --format FORMAT     Output format: column, json, csv, html (default: column)
    -h, --help              Show this help message

EXAMPLES:
    # Simple query with auto-detected container
    $0 "SELECT * FROM m_Extensions LIMIT 5"

    # Query with specific container and JSON output
    $0 -c abc123 -f json "SELECT * FROM m_Users"

    # Query CDR database
    $0 -d /storage/usbdisk1/mikopbx/astlogs/asterisk_cdr/master.db "SELECT * FROM cdr LIMIT 10"

    # Export to CSV
    $0 -f csv "SELECT * FROM m_Extensions" > extensions.csv

COMMON QUERIES:
    # List all tables
    $0 ".tables"

    # Show table schema
    $0 ".schema m_Extensions"

    # Count extensions
    $0 "SELECT COUNT(*) FROM m_Extensions"

EOF
}

# Function to detect MikoPBX container
detect_container() {
    echo -e "${YELLOW}Detecting MikoPBX container...${NC}" >&2

    # Try to find mikopbx container
    CONTAINER_ID=$(docker ps --filter "ancestor=*mikopbx*" --format "{{.ID}}" | head -1)

    if [ -z "$CONTAINER_ID" ]; then
        # Try alternative pattern
        CONTAINER_ID=$(docker ps --filter "name=mikopbx" --format "{{.ID}}" | head -1)
    fi

    if [ -z "$CONTAINER_ID" ]; then
        echo -e "${RED}Error: Could not detect MikoPBX container${NC}" >&2
        echo -e "${YELLOW}Please specify container ID with -c option${NC}" >&2
        echo "" >&2
        echo "Available containers:" >&2
        docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}" >&2
        exit 1
    fi

    CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER_ID" --format "{{.Names}}")
    echo -e "${GREEN}✓ Using container: $CONTAINER_ID ($CONTAINER_NAME)${NC}" >&2
}

# Function to execute query
execute_query() {
    local query="$1"
    local format_args=""

    # Build format arguments
    case "$OUTPUT_FORMAT" in
        column)
            format_args="-header -column"
            ;;
        json)
            format_args="-json"
            ;;
        csv)
            format_args="-csv -header"
            ;;
        html)
            format_args="-html"
            ;;
        *)
            echo -e "${RED}Error: Invalid format '$OUTPUT_FORMAT'${NC}" >&2
            exit 1
            ;;
    esac

    # Check if database exists
    if ! docker exec "$CONTAINER_ID" test -f "$DB_PATH" 2>/dev/null; then
        echo -e "${RED}Error: Database not found at $DB_PATH${NC}" >&2
        exit 1
    fi

    # Execute query
    docker exec "$CONTAINER_ID" sqlite3 "$DB_PATH" "$query" $format_args
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--container)
            CONTAINER_ID="$2"
            shift 2
            ;;
        -d|--database)
            DB_PATH="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}" >&2
            usage
            exit 1
            ;;
        *)
            # First non-option argument is the query
            QUERY="$1"
            shift
            break
            ;;
    esac
done

# Check if query was provided
if [ -z "$QUERY" ]; then
    echo -e "${RED}Error: No query specified${NC}" >&2
    usage
    exit 1
fi

# Auto-detect container if not specified
if [ -z "$CONTAINER_ID" ]; then
    detect_container
fi

# Execute the query
execute_query "$QUERY"
