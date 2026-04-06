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
# Script: upload-junit-to-browserstack.sh
# Purpose: Upload JUnit XML test reports to BrowserStack Test Observability
# Usage: ./upload-junit-to-browserstack.sh [junit_xml_file]
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
JUNIT_REPORT="${1:-tests/AdminCabinet/reports/junit.xml}"
BROWSERSTACK_USERNAME="${BROWSERSTACK_USERNAME:-}"
BROWSERSTACK_ACCESS_KEY="${BROWSERSTACK_ACCESS_KEY:-}"
PROJECT_NAME="${BROWSERSTACK_PROJECT_NAME:-MikoPBX AdminCabinet Tests}"
BUILD_NUMBER="${BUILD_NUMBER:-local-$(date +%Y%m%d-%H%M%S)}"
BUILD_NAME="${BROWSERSTACK_BUILD_NAME:-Build $BUILD_NUMBER}"
CI_LINK="${CI_JOB_URL:-}"
FRAMEWORK_VERSION="phpunit, 9.6.22"
TAGS="${BROWSERSTACK_TAGS:-phpunit,selenium,admin-cabinet,automated}"

# API endpoint
API_ENDPOINT="https://upload-automation.browserstack.com/upload"

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

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed. Please install curl to use this script."
        exit 1
    fi

    # Check if JUnit report exists
    if [ ! -f "$JUNIT_REPORT" ]; then
        print_error "JUnit report not found: $JUNIT_REPORT"
        print_info "Make sure to run PHPUnit with --log-junit option first"
        exit 1
    fi

    # Check file size (max 100MB)
    FILE_SIZE=$(stat -f%z "$JUNIT_REPORT" 2>/dev/null || stat -c%s "$JUNIT_REPORT" 2>/dev/null)
    MAX_SIZE=$((100 * 1024 * 1024)) # 100MB in bytes

    if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
        print_error "File size ($FILE_SIZE bytes) exceeds maximum allowed size (100MB)"
        exit 1
    fi

    # Check BrowserStack credentials
    if [ -z "$BROWSERSTACK_USERNAME" ] || [ -z "$BROWSERSTACK_ACCESS_KEY" ]; then
        print_error "BrowserStack credentials not set!"
        echo ""
        echo "Please set the following environment variables:"
        echo "  export BROWSERSTACK_USERNAME='your_username'"
        echo "  export BROWSERSTACK_ACCESS_KEY='your_access_key'"
        echo ""
        echo "You can find your credentials at: https://www.browserstack.com/accounts/settings"
        exit 1
    fi

    print_info "All prerequisites met ✓"
}

print_configuration() {
    print_info "Upload Configuration:"
    echo "  API Endpoint:     $API_ENDPOINT"
    echo "  JUnit Report:     $JUNIT_REPORT"
    echo "  Project Name:     $PROJECT_NAME"
    echo "  Build Name:       $BUILD_NAME"
    echo "  Build Identifier: $BUILD_NUMBER"
    echo "  Tags:             $TAGS"
    echo "  Framework:        $FRAMEWORK_VERSION"
    if [ -n "$CI_LINK" ]; then
        echo "  CI Link:          $CI_LINK"
    fi
    echo ""
}

upload_report() {
    print_info "Uploading JUnit report to BrowserStack..."

    # Build curl command
    CURL_CMD=(
        curl -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY"
        -X POST
        -F "data=@$JUNIT_REPORT"
        -F "projectName=$PROJECT_NAME"
        -F "buildName=$BUILD_NAME"
        -F "buildIdentifier=$BUILD_NUMBER"
        -F "tags=$TAGS"
        -F "frameworkVersion=$FRAMEWORK_VERSION"
    )

    # Add optional CI link if provided
    if [ -n "$CI_LINK" ]; then
        CURL_CMD+=(-F "ci=$CI_LINK")
    fi

    # Add API endpoint
    CURL_CMD+=("$API_ENDPOINT")

    # Execute upload
    RESPONSE=$("${CURL_CMD[@]}" -w "\n%{http_code}" -s)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    # Check response
    if [ "$HTTP_CODE" -eq 200 ]; then
        print_info "Upload successful! ✓"
        echo ""
        echo "Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        echo ""
        print_info "View your test results at: https://observability.browserstack.com/"
        return 0
    else
        print_error "Upload failed with HTTP code: $HTTP_CODE"
        echo ""
        echo "Response:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        return 1
    fi
}

###############################################################################
# Main
###############################################################################

main() {
    echo ""
    print_info "=== BrowserStack JUnit Report Upload ===="
    echo ""

    check_prerequisites
    print_configuration

    if upload_report; then
        print_info "Done!"
        exit 0
    else
        print_error "Upload failed"
        exit 1
    fi
}

# Run main function
main "$@"
