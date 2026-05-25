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

###############################################################################
# Script: run-browserstack-arch-matrix.sh
# Purpose: Run the same AdminCabinet BrowserStack tests against AMD64 and ARM64
#          MikoPBX Docker targets.
#
# Matrix format:
#   MIKOPBX_BROWSERSTACK_MATRIX="arch:container[:server_pbx] [arch:container[:server_pbx] ...]"
#
# Example:
#   MIKOPBX_BROWSERSTACK_MATRIX="amd64:mikopbx-amd64 arm64:mikopbx-arm64" \
#     tests/AdminCabinet/Scripts/run-browserstack-arch-matrix.sh
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RUNNER_SCRIPT="tests/AdminCabinet/Scripts/run-tests-and-upload.sh"
TESTSUITE="${1:-}"
BUILD_NUMBER_BASE="${BUILD_NUMBER:-local-$(date +%Y%m%d-%H%M%S)}"
DEFAULT_MATRIX="amd64:mikopbx-amd64 arm64:mikopbx-arm64"
MATRIX="${MIKOPBX_BROWSERSTACK_MATRIX:-$DEFAULT_MATRIX}"
RESULTS_DIR="${BROWSERSTACK_ARCH_RESULTS_DIR:-tests/AdminCabinet/reports/arch-matrix}"
SERVER_SCHEME="${MIKOPBX_BROWSERSTACK_SCHEME:-https}"
START_BROWSERSTACK_LOCAL="${START_BROWSERSTACK_LOCAL:-0}"
START_BROWSERSTACK_SCRIPT="tests/AdminCabinet/start-browserstack-local.sh"

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

usage() {
    cat << EOF
Usage: $0 [testsuite_name]

Run AdminCabinet BrowserStack tests for each architecture target in
MIKOPBX_BROWSERSTACK_MATRIX.

Environment:
  MIKOPBX_BROWSERSTACK_MATRIX  Space-separated entries: arch:container[:server_pbx]
                               Default: $DEFAULT_MATRIX
  MIKOPBX_BROWSERSTACK_SCHEME  Scheme for auto SERVER_PBX from container IP.
                               Default: $SERVER_SCHEME
  MIKOPBX_BROWSERSTACK_PORT    Port for auto SERVER_PBX. If omitted, the runner
                               reads WEB_HTTPS_PORT or WEB_PORT from container env.
  BUILD_NUMBER                 Base build identifier. The script appends arch.
  BROWSERSTACK_TAGS            Base BrowserStack tags. The script appends arch.
  BROWSERSTACK_ARCH_RESULTS_DIR Host directory for per-arch JUnit reports.
  SKIP_BROWSERSTACK_UPLOAD     Set to 1 to skip BrowserStack Observability upload.
  DRY_RUN                      Set to 1 to resolve targets without running tests.
  START_BROWSERSTACK_LOCAL     Set to 1 to start BrowserStack Local if needed.

Examples:
  $0
  $0 PBXSettings
  MIKOPBX_BROWSERSTACK_MATRIX="arm64:mikopbx-arm64" $0
EOF
}

validate_entry() {
    local entry="$1"
    if [ "$(printf '%s' "$entry" | awk -F: '{print NF}')" -lt 2 ]; then
        print_error "Invalid matrix entry: $entry"
        print_error "Expected format: arch:container[:server_pbx]"
        exit 1
    fi
}

container_ip() {
    local container="$1"
    docker inspect "$container" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
}

container_env() {
    local container="$1"
    local key="$2"
    docker inspect "$container" --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= -v key="$key" '$1 == key {print $2; exit}'
}

container_port_listening() {
    local container="$1"
    local port="$2"
    docker exec "$container" /bin/sh -c "(ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null || busybox netstat -ltn) | grep -Eq '[:.]$port[[:space:]]'"
}

container_server_url() {
    local container="$1"
    local ip_address="$2"
    local port="${MIKOPBX_BROWSERSTACK_PORT:-}"
    local candidate

    if [ -z "$port" ]; then
        if [ "$SERVER_SCHEME" = "https" ]; then
            port="$(container_env "$container" WEB_HTTPS_PORT)"
        else
            port="$(container_env "$container" WEB_PORT)"
        fi
    fi

    if [ -n "$port" ] && container_port_listening "$container" "$port"; then
        printf '%s://%s:%s\n' "$SERVER_SCHEME" "$ip_address" "$port"
        return 0
    fi

    for candidate in 443 8445 80 8081; do
        if container_port_listening "$container" "$candidate"; then
            if [ "$candidate" = "443" ] && [ "$SERVER_SCHEME" = "https" ]; then
                printf '%s://%s\n' "$SERVER_SCHEME" "$ip_address"
            elif [ "$candidate" = "80" ] && [ "$SERVER_SCHEME" = "http" ]; then
                printf '%s://%s\n' "$SERVER_SCHEME" "$ip_address"
            elif [ "$candidate" = "80" ] || [ "$candidate" = "8081" ]; then
                printf 'http://%s:%s\n' "$ip_address" "$candidate"
            else
                printf 'https://%s:%s\n' "$ip_address" "$candidate"
            fi
            return 0
        fi
    done

    printf '%s://%s\n' "$SERVER_SCHEME" "$ip_address"
}

browserstack_local_running() {
    ps aux 2>/dev/null | grep -q '[B]rowserStackLocal'
}

ensure_browserstack_local() {
    if [ "${BROWSERSTACK_DAEMON_STARTED:-}" = "true" ]; then
        print_info "Using externally managed BrowserStack Local"
        return 0
    fi

    if browserstack_local_running; then
        print_info "BrowserStack Local is running"
        return 0
    fi

    if [ "$START_BROWSERSTACK_LOCAL" != "1" ]; then
        print_error "BrowserStack Local is not running"
        print_error "Start it with tests/AdminCabinet/start-browserstack-local.sh or set START_BROWSERSTACK_LOCAL=1"
        return 1
    fi

    print_info "Starting BrowserStack Local"
    bash "$START_BROWSERSTACK_SCRIPT"
}

main() {
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        usage
        exit 0
    fi

    if [ ! -f "$RUNNER_SCRIPT" ]; then
        print_error "Runner not found: $RUNNER_SCRIPT"
        exit 1
    fi

    mkdir -p "$RESULTS_DIR"

    if [ "${DRY_RUN:-0}" != "1" ]; then
        ensure_browserstack_local
    fi

    print_info "=== MikoPBX BrowserStack Architecture Matrix ==="
    print_info "Matrix: $MATRIX"
    if [ -n "$TESTSUITE" ]; then
        print_info "Testsuite: $TESTSUITE"
    else
        print_info "Testsuite: all"
    fi

    failures=0

    for entry in $MATRIX; do
        validate_entry "$entry"

        arch="${entry%%:*}"
        rest="${entry#*:}"
        if [ "$rest" = "${rest#*:}" ]; then
            container="$rest"
            ip_address="$(container_ip "$container")"
            if [ -z "$ip_address" ] || [ "$ip_address" = "<no value>" ]; then
                print_error "Container $container has no IP address. Is it running?"
                failures=$((failures + 1))
                continue
            fi
            server_pbx="$(container_server_url "$container" "$ip_address")"
        else
            container="${rest%%:*}"
            server_pbx="${rest#*:}"
        fi

        print_step "Running $arch tests against $container ($server_pbx)"

        junit_container="/tmp/mikopbx-admincabinet-junit-$arch.xml"
        junit_host="$RESULTS_DIR/junit-$arch.xml"
        base_tags="${BROWSERSTACK_TAGS:-phpunit,selenium,admin-cabinet,automated}"

        if [ "${DRY_RUN:-0}" = "1" ]; then
            print_info "Dry run: $arch -> CONTAINER_NAME=$container SERVER_PBX=$server_pbx"
            continue
        fi

        if CONTAINER_NAME="$container" \
            SERVER_PBX="$server_pbx" \
            MIKOPBX_TEST_ARCH="$arch" \
            JUNIT_REPORT="$junit_container" \
            HOST_JUNIT_REPORT="$junit_host" \
            BUILD_NUMBER="$BUILD_NUMBER_BASE-$arch" \
            BROWSERSTACK_BUILD_NAME="${BROWSERSTACK_BUILD_NAME:-MikoPBX AdminCabinet e2e} [$arch]" \
            BROWSERSTACK_TAGS="$base_tags,$arch,docker" \
            bash "$RUNNER_SCRIPT" "$TESTSUITE"; then
            print_info "$arch tests passed"
        else
            print_error "$arch tests failed"
            failures=$((failures + 1))
        fi
    done

    echo ""
    if [ "$failures" -eq 0 ]; then
        print_info "Architecture matrix completed successfully"
        exit 0
    fi

    print_error "Architecture matrix completed with $failures failed target(s)"
    exit 1
}

main "$@"
