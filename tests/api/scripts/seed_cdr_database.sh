#!/bin/bash
##
## CDR Database Seeder Script for MikoPBX Test Environment
##
## This script is designed to run ON THE STATION (inside container, remote machine, or cloud)
## and can be invoked by Python tests via docker exec, SSH, or other remote execution methods.
##
## Usage:
##   ./seed_cdr_database.sh seed    - Load test CDR data
##   ./seed_cdr_database.sh cleanup - Remove test CDR data
##   ./seed_cdr_database.sh verify  - Verify test data exists
##   ./seed_cdr_database.sh ids     - Get list of test CDR IDs
##
## Environment Variables:
##   CDR_DB_PATH       - Path to CDR database (default: /storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db)
##   FIXTURES_DIR      - Path to fixtures directory (default: /usr/www/tests/api/fixtures)
##   MONITOR_BASE      - Path to recordings base (default: /storage/usbdisk1/mikopbx/astspool/monitor)
##   ENABLE_CDR_SEED   - Enable/disable seeding (default: 1)
##   ENABLE_CDR_CLEANUP - Enable/disable cleanup (default: 1)
##

set -e  # Exit on error

# Configuration
CDR_DB_PATH="${CDR_DB_PATH:-/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db}"

# Server-side logging for debugging remote execution issues (TeamCity, etc.)
LOG_DIR="/storage/usbdisk1/mikopbx/log"
LOG_FILE="${LOG_DIR}/cdr_seeder.log"
ENABLE_SERVER_LOG="${ENABLE_SERVER_LOG:-1}"

# Initialize server-side logging
init_server_log() {
    if [ "$ENABLE_SERVER_LOG" != "1" ]; then
        return
    fi

    # Create log directory if needed
    mkdir -p "$LOG_DIR" 2>/dev/null || true

    # Rotate log if too large (> 1MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 1048576 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old" 2>/dev/null || true
    fi

    # Write header
    {
        echo ""
        echo "========================================"
        echo "CDR Seeder Script Execution"
        echo "========================================"
        echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S.%N' 2>/dev/null || date '+%Y-%m-%d %H:%M:%S')"
        echo "Command: $0 $*"
        echo "PID: $$"
        echo "User: $(whoami)"
        echo "PWD: $(pwd)"
        echo "----------------------------------------"
    } >> "$LOG_FILE" 2>/dev/null || true
}

# Log to both stdout and server log file
log_server() {
    local msg="$1"
    local timestamp=$(date '+%H:%M:%S' 2>/dev/null || date '+%H:%M:%S')

    # Always print to stdout
    echo "$msg"

    # Also log to file if enabled
    if [ "$ENABLE_SERVER_LOG" = "1" ]; then
        echo "[$timestamp] $msg" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Log diagnostic info about environment
log_diagnostics() {
    if [ "$ENABLE_SERVER_LOG" != "1" ]; then
        return
    fi

    {
        echo "--- Environment Diagnostics ---"
        echo "CDR_DB_PATH: $CDR_DB_PATH"
        echo "FIXTURES_DIR: $FIXTURES_DIR"
        echo "SQL_FILE: $SQL_FILE"
        echo "JSON_FILE: $JSON_FILE"
        echo "MONITOR_BASE: $MONITOR_BASE"
        echo "ENABLE_CDR_SEED: $ENABLE_CDR_SEED"
        echo "--- File Checks ---"
        echo "DB exists: $([ -f "$CDR_DB_PATH" ] && echo 'yes' || echo 'NO')"
        echo "SQL exists: $([ -f "$SQL_FILE" ] && echo 'yes' || echo 'NO')"
        echo "JSON exists: $([ -f "$JSON_FILE" ] && echo 'yes' || echo 'NO')"
        echo "--- Disk Space ---"
        df -h "$LOG_DIR" 2>/dev/null | head -2 || echo "df failed"
        echo "--- SQLite version ---"
        sqlite3 --version 2>/dev/null || echo "sqlite3 not found"
        echo "--------------------------------"
    } >> "$LOG_FILE" 2>/dev/null || true
}

# Log error with context
log_error_server() {
    local msg="$1"
    local timestamp=$(date '+%H:%M:%S' 2>/dev/null || date '+%H:%M:%S')

    echo -e "${RED}✗${NC} $msg" >&2

    if [ "$ENABLE_SERVER_LOG" = "1" ]; then
        echo "[$timestamp] ERROR: $msg" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Log script completion
log_completion() {
    local status="$1"
    if [ "$ENABLE_SERVER_LOG" = "1" ]; then
        {
            echo "----------------------------------------"
            echo "Completion: $status"
            echo "End time: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "========================================"
        } >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Auto-detect fixtures directory
# Priority:
# 1. FIXTURES_DIR env variable (if set)
# 2. /usr/www/tests/api/fixtures (Docker containers with synced tests)
# 3. /storage/usbdisk1/mikopbx/python-tests/fixtures (Remote/VM persistent storage)
if [ -n "$FIXTURES_DIR" ]; then
    # User explicitly set FIXTURES_DIR
    :
elif [ -d "/usr/www/tests/api/fixtures" ]; then
    # Docker container with synced tests
    FIXTURES_DIR="/usr/www/tests/api/fixtures"
elif [ -d "/storage/usbdisk1/mikopbx/python-tests/fixtures" ]; then
    # Remote/VM persistent storage
    FIXTURES_DIR="/storage/usbdisk1/mikopbx/python-tests/fixtures"
else
    # Fallback to default
    FIXTURES_DIR="/usr/www/tests/api/fixtures"
fi

MONITOR_BASE="${MONITOR_BASE:-/storage/usbdisk1/mikopbx/astspool/monitor}"
ENABLE_CDR_SEED="${ENABLE_CDR_SEED:-1}"
ENABLE_CDR_CLEANUP="${ENABLE_CDR_CLEANUP:-1}"

SQL_FILE="${FIXTURES_DIR}/cdr_seed_data.sql"
JSON_FILE="${FIXTURES_DIR}/cdr_test_data.json"

# Script directory for generator
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GENERATOR_SCRIPT="${SCRIPT_DIR}/generate_cdr_fixtures.py"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if database exists
check_database() {
    if [ ! -f "$CDR_DB_PATH" ]; then
        log_error "CDR database not found: $CDR_DB_PATH"
        return 1
    fi
    return 0
}

# Check if fixtures exist
check_fixtures() {
    if [ ! -f "$SQL_FILE" ]; then
        log_error "SQL fixture not found: $SQL_FILE"
        return 1
    fi
    if [ ! -f "$JSON_FILE" ]; then
        log_error "JSON fixture not found: $JSON_FILE"
        return 1
    fi
    return 0
}

# Generate dynamic CDR fixtures with current dates
# This ensures test dates are always relative to the current date
generate_dynamic_fixtures() {
    # Check if Python3 is available
    if ! command -v python3 &> /dev/null; then
        log_warning "Python3 not available, using static SQL fixtures"
        return 1
    fi

    # Check if generator script exists
    if [ ! -f "$GENERATOR_SCRIPT" ]; then
        # Try alternative paths for remote execution
        local alt_paths=(
            "/storage/usbdisk1/mikopbx/python-tests/scripts/generate_cdr_fixtures.py"
            "/usr/www/tests/api/scripts/generate_cdr_fixtures.py"
        )
        for alt_path in "${alt_paths[@]}"; do
            if [ -f "$alt_path" ]; then
                GENERATOR_SCRIPT="$alt_path"
                break
            fi
        done
    fi

    if [ ! -f "$GENERATOR_SCRIPT" ]; then
        log_warning "Generator script not found, using static SQL fixtures"
        return 1
    fi

    # Check if JSON template exists
    if [ ! -f "$JSON_FILE" ]; then
        log_warning "JSON template not found, using static SQL fixtures"
        return 1
    fi

    log_info "Generating dynamic CDR fixtures with current dates..."

    # Try to write to fixtures dir first, fallback to /tmp if read-only
    local output_path="$SQL_FILE"
    if ! touch "$SQL_FILE" 2>/dev/null; then
        output_path="/tmp/cdr_seed_data.sql"
        log_info "Fixtures dir is read-only, using $output_path"
    fi

    if python3 "$GENERATOR_SCRIPT" --fixtures-dir "$FIXTURES_DIR" --output "$output_path" 2>/dev/null; then
        # Update SQL_FILE to point to the generated file
        SQL_FILE="$output_path"
        log_info "Dynamic fixtures generated successfully"
        return 0
    else
        log_warning "Failed to generate dynamic fixtures, using static SQL"
        return 1
    fi
}

# Create minimal MP3 file (417 bytes - valid MP3 format)
create_minimal_mp3() {
    local output_file="$1"
    local output_dir=$(dirname "$output_file")

    # Create directory if it doesn't exist
    mkdir -p "$output_dir"

    # Create minimal valid MP3: ID3v2 header (10 bytes) + MP3 frame (4 bytes) + silence (403 bytes)
    printf '\x49\x44\x33\x03\x00\x00\x00\x00\x00\x00' > "$output_file"
    printf '\xFF\xFB\x90\xC4' >> "$output_file"
    dd if=/dev/zero bs=1 count=403 >> "$output_file" 2>/dev/null
}

# Seed database with test data
seed_database() {
    # Initialize server-side logging first
    init_server_log "seed"

    if [ "$ENABLE_CDR_SEED" != "1" ]; then
        log_server "CDR seeding disabled (ENABLE_CDR_SEED=0)"
        log_completion "SKIPPED - disabled"
        return 1
    fi

    log_server "============================================================"
    log_server "CDR Database Seeding Started"
    log_server "============================================================"

    # Log environment diagnostics
    log_diagnostics

    # Check prerequisites
    log_server "Step 1: Checking database..."
    if ! check_database; then
        log_error_server "Database check failed"
        log_completion "FAILED - no database"
        return 1
    fi
    log_server "Step 1: Database OK"

    # Try to generate dynamic fixtures with current dates
    # This ensures tests always have recent data regardless of when they run
    log_server "Step 2: Generating dynamic fixtures..."
    generate_dynamic_fixtures || log_server "Using existing SQL fixtures"

    log_server "Step 3: Checking fixtures..."
    if ! check_fixtures; then
        log_error_server "Fixtures check failed"
        log_completion "FAILED - no fixtures"
        return 1
    fi
    log_server "Step 3: Fixtures OK"

    # Execute SQL seed file
    log_server "Step 4: Loading test CDR data from $SQL_FILE"
    local sql_start=$(date +%s 2>/dev/null || echo 0)
    if sqlite3 "$CDR_DB_PATH" < "$SQL_FILE" 2>&1; then
        local sql_end=$(date +%s 2>/dev/null || echo 0)
        local sql_duration=$((sql_end - sql_start))
        log_server "Step 4: Database seeded successfully (${sql_duration}s)"
    else
        log_error_server "Failed to seed database"
        log_completion "FAILED - sqlite3 error"
        return 1
    fi

    # Create MP3 recording files
    log_server "Step 5: Creating MP3 recording files..."
    local mp3_count=0

    # Parse JSON and create MP3 files for records with recordingfile
    # Using grep to extract recordingfile values (simple approach without jq dependency)
    while IFS= read -r recording_path; do
        if [ -n "$recording_path" ] && [ "$recording_path" != '""' ] && [ "$recording_path" != "null" ]; then
            # Remove quotes
            recording_path=$(echo "$recording_path" | tr -d '"')
            create_minimal_mp3 "$recording_path"
            mp3_count=$((mp3_count + 1))
        fi
    done < <(grep -o '"recordingfile": *"[^"]*"' "$JSON_FILE" | cut -d'"' -f4)

    log_server "Step 5: Created $mp3_count recording files"

    # Verify seeding
    log_server "Step 6: Verifying seeding..."
    local count=$(sqlite3 "$CDR_DB_PATH" "SELECT COUNT(*) FROM cdr_general WHERE id BETWEEN 1 AND 1000;" 2>/dev/null)
    if [ "$count" -gt 0 ]; then
        log_server "Step 6: Verification OK - $count records in database"
        log_server "============================================================"
        log_server "CDR Seeding Completed Successfully"
        log_server "============================================================"
        log_completion "SUCCESS - $count records"
        return 0
    else
        log_error_server "Verification failed: no records found"
        log_completion "FAILED - verification"
        return 1
    fi
}

# Cleanup test data
cleanup_database() {
    if [ "$ENABLE_CDR_CLEANUP" != "1" ]; then
        log_warning "CDR cleanup disabled (ENABLE_CDR_CLEANUP=0)"
        return 0
    fi

    echo "Cleaning up CDR test data..."

    # Delete test records from database
    if sqlite3 "$CDR_DB_PATH" "DELETE FROM cdr_general WHERE id BETWEEN 1 AND 1000;" 2>/dev/null; then
        log_info "Test records deleted from database"
    else
        log_warning "Failed to delete test records"
    fi

    # Remove test recording files
    if [ -d "$MONITOR_BASE" ]; then
        rm -rf "$MONITOR_BASE"
        log_info "Test recording files removed"
    fi

    log_info "CDR test data cleaned up"
}

# Verify test data exists
verify_seeding() {
    check_database || return 1

    local count=$(sqlite3 "$CDR_DB_PATH" "SELECT COUNT(*) FROM cdr_general WHERE id BETWEEN 1 AND 1000;" 2>/dev/null)
    echo "$count"
    return 0
}

# Get list of test CDR IDs
get_test_ids() {
    check_database || return 1

    sqlite3 "$CDR_DB_PATH" "SELECT id FROM cdr_general WHERE id BETWEEN 1 AND 1000 ORDER BY id;" 2>/dev/null
    return 0
}

# Main command dispatcher
case "${1:-}" in
    seed)
        seed_database
        ;;
    cleanup)
        cleanup_database
        ;;
    verify)
        verify_seeding
        ;;
    ids)
        get_test_ids
        ;;
    *)
        echo "Usage: $0 {seed|cleanup|verify|ids}"
        echo ""
        echo "Commands:"
        echo "  seed    - Load test CDR data into database and create MP3 files"
        echo "  cleanup - Remove test CDR data and MP3 files"
        echo "  verify  - Check if test data exists (returns count)"
        echo "  ids     - Get list of test CDR IDs"
        echo ""
        echo "Environment Variables:"
        echo "  CDR_DB_PATH       - Path to CDR database"
        echo "  FIXTURES_DIR      - Path to fixtures directory"
        echo "  MONITOR_BASE      - Path to recordings base"
        echo "  ENABLE_CDR_SEED   - Enable/disable seeding (1/0)"
        echo "  ENABLE_CDR_CLEANUP - Enable/disable cleanup (1/0)"
        exit 1
        ;;
esac
