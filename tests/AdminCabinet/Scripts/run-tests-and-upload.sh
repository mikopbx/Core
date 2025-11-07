#!/bin/bash

#
# MikoPBX - free phone system for small business
# Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see <https://www.gnu.org/licenses/>.
#

###############################################################################
# Script: run-tests-and-upload.sh
# Purpose: Run PHPUnit tests inside Docker container and upload results to BrowserStack
# Usage: ./run-tests-and-upload.sh [testsuite_name]
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-mikopbx_php83}"
TESTSUITE="${1:-}"
PHPUNIT_CONFIG="/offload/rootfs/usr/www/tests/AdminCabinet/phpunit.xml"
JUNIT_REPORT="/offload/rootfs/usr/www/tests/AdminCabinet/reports/junit.xml"
UPLOAD_SCRIPT="tests/AdminCabinet/Scripts/upload-junit-to-browserstack.sh"

###############################################################################
# Functions
###############################################################################

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

check_docker_container() {
    print_info "Checking if Docker container is running..."

    if ! docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
        print_error "Container $CONTAINER_NAME is not running"
        exit 1
    fi

    print_info "Container $CONTAINER_NAME is running ✓"
}

list_available_testsuites() {
    print_info "Available test suites:"
    docker exec "$CONTAINER_NAME" grep -A1 '<testsuite name=' "$PHPUNIT_CONFIG" | \
        grep 'name=' | \
        sed 's/.*name="\([^"]*\)".*/  - \1/'
}

run_phpunit_tests() {
    print_step "Running PHPUnit tests..."

    # Build PHPUnit command
    PHPUNIT_CMD="/offload/rootfs/usr/www/vendor/bin/phpunit"
    PHPUNIT_CMD="$PHPUNIT_CMD --configuration $PHPUNIT_CONFIG"
    PHPUNIT_CMD="$PHPUNIT_CMD --log-junit $JUNIT_REPORT"

    # Add testsuite filter if specified
    if [ -n "$TESTSUITE" ]; then
        PHPUNIT_CMD="$PHPUNIT_CMD --testsuite $TESTSUITE"
        print_info "Running testsuite: $TESTSUITE"
    else
        print_info "Running all test suites"
    fi

    # Execute tests
    echo ""
    if docker exec "$CONTAINER_NAME" /bin/sh -c "$PHPUNIT_CMD"; then
        print_info "Tests completed successfully ✓"
        TEST_RESULT=0
    else
        print_warning "Some tests failed, but continuing to upload results..."
        TEST_RESULT=1
    fi

    echo ""
    return $TEST_RESULT
}

check_junit_report() {
    print_step "Checking JUnit report..."

    if docker exec "$CONTAINER_NAME" test -f "$JUNIT_REPORT"; then
        print_info "JUnit report generated ✓"

        # Show report summary
        print_info "Report location (in container): $JUNIT_REPORT"
        print_info "Report location (on host): tests/AdminCabinet/reports/junit.xml"

        # Display report stats
        TESTS=$(docker exec "$CONTAINER_NAME" grep -o 'tests="[0-9]*"' "$JUNIT_REPORT" | head -1 | grep -o '[0-9]*')
        FAILURES=$(docker exec "$CONTAINER_NAME" grep -o 'failures="[0-9]*"' "$JUNIT_REPORT" | head -1 | grep -o '[0-9]*')
        ERRORS=$(docker exec "$CONTAINER_NAME" grep -o 'errors="[0-9]*"' "$JUNIT_REPORT" | head -1 | grep -o '[0-9]*')

        echo ""
        print_info "Test Summary:"
        echo "  Total tests: $TESTS"
        echo "  Failures:    $FAILURES"
        echo "  Errors:      $ERRORS"
        echo ""

        return 0
    else
        print_error "JUnit report not found: $JUNIT_REPORT"
        return 1
    fi
}

upload_to_browserstack() {
    print_step "Uploading to BrowserStack..."

    if [ ! -f "$UPLOAD_SCRIPT" ]; then
        print_error "Upload script not found: $UPLOAD_SCRIPT"
        return 1
    fi

    # Execute upload script
    if bash "$UPLOAD_SCRIPT" "tests/AdminCabinet/reports/junit.xml"; then
        return 0
    else
        return 1
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [testsuite_name]

Run PHPUnit tests inside Docker container and upload results to BrowserStack.

Options:
  testsuite_name    Optional. Name of the test suite to run.
                    If not specified, all test suites will be run.

Environment Variables:
  CONTAINER_NAME              Docker container name (default: mikopbx_php83)
  BROWSERSTACK_USERNAME       BrowserStack username (required for upload)
  BROWSERSTACK_ACCESS_KEY     BrowserStack access key (required for upload)
  BROWSERSTACK_PROJECT_NAME   Project name (default: MikoPBX AdminCabinet Tests)
  BROWSERSTACK_BUILD_NAME     Build name (default: Build <timestamp>)
  BROWSERSTACK_TAGS           Comma-separated tags (default: phpunit,selenium,admin-cabinet,automated)

Examples:
  # Run all tests
  $0

  # Run specific test suite
  $0 Extensions

  # With custom environment variables
  BROWSERSTACK_USERNAME=user123 BROWSERSTACK_ACCESS_KEY=key123 $0 PBXSettings

EOF
}

###############################################################################
# Main
###############################################################################

main() {
    # Handle help flag
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        show_usage
        exit 0
    fi

    echo ""
    print_info "=== MikoPBX Test Runner & BrowserStack Uploader ==="
    echo ""

    # Check prerequisites
    check_docker_container
    echo ""

    # Show available test suites if no argument provided
    if [ -z "$TESTSUITE" ]; then
        list_available_testsuites
        echo ""
    fi

    # Run tests
    TEST_EXIT_CODE=0
    if ! run_phpunit_tests; then
        TEST_EXIT_CODE=1
    fi

    # Check report generation
    if ! check_junit_report; then
        print_error "Cannot proceed without JUnit report"
        exit 1
    fi

    # Upload to BrowserStack
    UPLOAD_EXIT_CODE=0
    if ! upload_to_browserstack; then
        UPLOAD_EXIT_CODE=1
    fi

    # Final status
    echo ""
    print_step "Summary"
    if [ $TEST_EXIT_CODE -eq 0 ] && [ $UPLOAD_EXIT_CODE -eq 0 ]; then
        print_info "All operations completed successfully! ✓"
        exit 0
    elif [ $UPLOAD_EXIT_CODE -ne 0 ]; then
        print_error "Upload failed!"
        exit 1
    else
        print_warning "Tests had failures, but upload was successful"
        exit $TEST_EXIT_CODE
    fi
}

# Run main function
main "$@"
