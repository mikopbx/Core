#!/bin/bash
# MikoPBX SQLite Database Query Helper
# Usage: ./db-query.sh <container_id> <query> [output_format]
# Output formats: column (default), json, csv, line

set -e

CONTAINER_ID="${1:-}"
QUERY="${2:-}"
FORMAT="${3:-column}"

if [ -z "$CONTAINER_ID" ] || [ -z "$QUERY" ]; then
    echo "Usage: $0 <container_id> <query> [output_format]"
    echo ""
    echo "Output formats:"
    echo "  column - Column-aligned output with headers (default)"
    echo "  json   - JSON array output"
    echo "  csv    - CSV format with headers"
    echo "  line   - One value per line"
    echo ""
    echo "Example:"
    echo "  $0 abc123 \"SELECT * FROM m_Extensions LIMIT 5\" json"
    exit 1
fi

DB_PATH="/cf/conf/mikopbx.db"

case "$FORMAT" in
    json)
        docker exec "$CONTAINER_ID" sqlite3 "$DB_PATH" "$QUERY" -json
        ;;
    csv)
        docker exec "$CONTAINER_ID" sqlite3 "$DB_PATH" "$QUERY" -csv -header
        ;;
    line)
        docker exec "$CONTAINER_ID" sqlite3 "$DB_PATH" "$QUERY" -line
        ;;
    column|*)
        docker exec "$CONTAINER_ID" sqlite3 "$DB_PATH" "$QUERY" -header -column
        ;;
esac
