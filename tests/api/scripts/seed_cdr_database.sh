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
    if [ "$ENABLE_CDR_SEED" != "1" ]; then
        log_warning "CDR seeding disabled (ENABLE_CDR_SEED=0)"
        return 1
    fi

    echo "============================================================"
    echo "CDR Database Seeding Started"
    echo "============================================================"

    # Check prerequisites
    check_database || return 1

    # Try to generate dynamic fixtures with current dates
    # This ensures tests always have recent data regardless of when they run
    generate_dynamic_fixtures || log_warning "Using existing SQL fixtures"

    check_fixtures || return 1

    # Execute SQL seed file
    log_info "Loading test CDR data from $SQL_FILE"
    if sqlite3 "$CDR_DB_PATH" < "$SQL_FILE" 2>/dev/null; then
        log_info "Database seeded successfully"
    else
        log_error "Failed to seed database"
        return 1
    fi

    # Create MP3 recording files
    log_info "Creating MP3 recording files..."
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

    log_info "Created $mp3_count recording files"

    # Verify seeding
    local count=$(sqlite3 "$CDR_DB_PATH" "SELECT COUNT(*) FROM cdr_general WHERE id BETWEEN 1 AND 1000;" 2>/dev/null)
    if [ "$count" -gt 0 ]; then
        log_info "Verification: $count records in database"
        echo "============================================================"
        echo "CDR Seeding Completed Successfully"
        echo "============================================================"
        return 0
    else
        log_error "Verification failed: no records found"
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
