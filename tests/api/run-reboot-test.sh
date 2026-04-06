#!/bin/bash
#
# Wrapper script to run reboot tests from host machine
#
# This script orchestrates reboot tests by:
# 1. Running pre-reboot phase inside MikoPBX
# 2. Waiting for system to reboot and come back online
# 3. Running post-reboot phase inside MikoPBX
#
# Usage:
#   ./run-reboot-test.sh <container_name> <test_file> [api_url]
#
# Examples:
#   ./run-reboot-test.sh mikopbx-php83 test_47_system.py::test_system_reboot
#   ./run-reboot-test.sh mikopbx-php83 examples/test_reboot_example.py::test_simple_reboot http://192.168.107.2:8081/pbxcore/api/v3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
CONTAINER="${1:-mikopbx-php83}"
TEST_FILE="${2}"
API_URL="${3:-http://127.0.0.1:8081/pbxcore/api/v3}"

# Configuration
MAX_WAIT_TIME=300  # 5 minutes
CHECK_INTERVAL=5   # 5 seconds
PYTEST_RUNNER="/storage/usbdisk1/mikopbx/python-tests/run-pytest.sh"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_api_ready() {
    local url="$1"
    curl -s -f -k "${url}/system/ping" > /dev/null 2>&1
    return $?
}

wait_for_reboot() {
    local start_time=$(date +%s)
    local elapsed=0

    log_info "Waiting for system to come back online..."

    # First, wait for system to go down (give it 10 seconds to start rebooting)
    sleep 10

    # Then wait for it to come back up
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        if check_api_ready "$API_URL"; then
            log_info "System is responding to API calls"
            # Give it extra time for services to fully start
            log_info "Waiting 15 seconds for services to fully initialize..."
            sleep 15
            return 0
        fi

        sleep $CHECK_INTERVAL
        elapsed=$(( $(date +%s) - start_time ))
        log_info "Waiting... (${elapsed}s / ${MAX_WAIT_TIME}s)"
    done

    log_error "System did not come back online within ${MAX_WAIT_TIME} seconds"
    return 1
}

run_test_phase() {
    local phase="$1"
    log_info "Running ${phase} phase: ${TEST_FILE}"

    if docker exec "$CONTAINER" "$PYTEST_RUNNER" "$TEST_FILE" -v; then
        log_success "${phase} phase completed"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 5 ]; then
            # Exit code 5 means pytest.skip() was called (expected for pre-reboot)
            log_warning "${phase} phase skipped (expected for reboot tests)"
            return 0
        else
            log_error "${phase} phase failed with exit code ${exit_code}"
            return 1
        fi
    fi
}

# Main script
main() {
    if [ -z "$TEST_FILE" ]; then
        log_error "Test file not specified"
        echo ""
        echo "Usage: $0 <container_name> <test_file> [api_url]"
        echo ""
        echo "Examples:"
        echo "  $0 mikopbx-php83 test_47_system.py::test_system_reboot"
        echo "  $0 mikopbx-php83 examples/test_reboot_example.py::test_simple_reboot"
        exit 1
    fi

    log_info "========================================"
    log_info "Reboot Test Runner"
    log_info "========================================"
    log_info "Container: ${CONTAINER}"
    log_info "Test: ${TEST_FILE}"
    log_info "API URL: ${API_URL}"
    log_info "========================================"
    echo ""

    # Check if container is running
    if ! docker ps | grep -q "$CONTAINER"; then
        log_error "Container ${CONTAINER} is not running"
        exit 1
    fi

    # Phase 1: Pre-reboot
    log_info "========== PHASE 1: PRE-REBOOT =========="
    if ! run_test_phase "pre-reboot"; then
        log_error "Pre-reboot phase failed"
        exit 1
    fi
    echo ""

    # Phase 2: Wait for reboot
    log_info "========== PHASE 2: WAITING FOR REBOOT =========="
    if ! wait_for_reboot; then
        log_error "System did not reboot successfully"
        exit 1
    fi
    log_success "System is back online"
    echo ""

    # Phase 3: Post-reboot
    log_info "========== PHASE 3: POST-REBOOT =========="
    if ! run_test_phase "post-reboot"; then
        log_error "Post-reboot phase failed"
        exit 1
    fi
    echo ""

    log_success "========================================"
    log_success "Reboot test completed successfully!"
    log_success "========================================"
}

# Run main
main "$@"
