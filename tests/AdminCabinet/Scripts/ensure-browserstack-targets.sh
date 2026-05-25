#!/bin/bash

#
# MikoPBX - free phone system for small business
# Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
#

###############################################################################
# Script: ensure-browserstack-targets.sh
# Purpose: Create/start isolated ARM64 and AMD64 MikoPBX containers for
#          BrowserStack AdminCabinet e2e tests.
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STATE_ROOT="${MIKOPBX_E2E_STATE_ROOT:-/tmp/mikopbx-browserstack-targets}"
READY_ATTEMPTS="${MIKOPBX_E2E_READY_ATTEMPTS:-120}"

ARM64_CONTAINER="${MIKOPBX_E2E_ARM64_CONTAINER:-mikopbx-e2e-arm64}"
AMD64_CONTAINER="${MIKOPBX_E2E_AMD64_CONTAINER:-mikopbx-e2e-amd64}"
ARM64_IMAGE="${MIKOPBX_E2E_ARM64_IMAGE:-mikopbx/mikopbx:2026.1.223-arm64}"
AMD64_IMAGE="${MIKOPBX_E2E_AMD64_IMAGE:-mikopbx/mikopbx:2026.1.223-amd64}"

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

container_exists() {
    docker inspect "$1" >/dev/null 2>&1
}

container_running() {
    [ "$(docker inspect "$1" --format '{{.State.Running}}' 2>/dev/null || true)" = "true" ]
}

ensure_dirs() {
    local arch="$1"
    mkdir -p "$STATE_ROOT/$arch/cf" \
        "$STATE_ROOT/$arch/storage" \
        "$STATE_ROOT/$arch/storage/usbdisk1/mikopbx/tmp/www_cache/files_cache"
}

run_container() {
    local arch="$1"
    local platform="$2"
    local container="$3"
    local image="$4"

    print_step "Ensuring $arch target: $container"
    ensure_dirs "$arch"

    if container_running "$container"; then
        print_info "$container is already running"
        return 0
    fi

    if container_exists "$container"; then
        print_info "Starting existing $container"
        docker start "$container" >/dev/null
        return 0
    fi

    print_info "Creating $container from $image"
    docker run -d \
        --name "$container" \
        --hostname "$container" \
        --platform "$platform" \
        --entrypoint /sbin/docker-entrypoint \
        -v "$STATE_ROOT/$arch/cf:/cf" \
        -v "$STATE_ROOT/$arch/storage:/storage" \
        -v "$STATE_ROOT/$arch/storage/usbdisk1/mikopbx/tmp/www_cache/files_cache:/offload/rootfs/usr/www/sites/pbxcore/files/cache:rw" \
        -v "$REPO_ROOT/sites/admin-cabinet:/offload/rootfs/usr/www/sites/admin-cabinet:ro" \
        -v "$REPO_ROOT/sites/admin-cabinet/assets/js:/offload/rootfs/usr/www/sites/admin-cabinet/assets/js:rw" \
        -v "$REPO_ROOT/sites/admin-cabinet/assets/css:/offload/rootfs/usr/www/sites/admin-cabinet/assets/css:rw" \
        -v "$REPO_ROOT/sites/admin-cabinet/assets/img:/offload/rootfs/usr/www/sites/admin-cabinet/assets/img:rw" \
        -v "$REPO_ROOT/src:/offload/rootfs/usr/www/src:ro" \
        -v "$REPO_ROOT/src/AdminCabinet/Views/Modules:/offload/rootfs/usr/www/src/AdminCabinet/Views/Modules:rw" \
        -v "$REPO_ROOT/vendor:/offload/rootfs/usr/www/vendor:ro" \
        -v "$REPO_ROOT/tests:/offload/rootfs/usr/www/tests:ro" \
        -e "PBX_NAME=MikoPBX e2e $arch" \
        -e "PBX_DESCRIPTION=MikoPBX BrowserStack e2e $arch pass 123456789MikoPBX#1" \
        -e "WEB_ADMIN_PASSWORD=123456789MikoPBX#1" \
        -e "SSH_PASSWORD=123456789MikoPBX#1" \
        -e "SSH_DISABLE_SSH_PASSWORD=0" \
        -e "AUTO_UPDATE_EXTERNAL_IP=0" \
        -e "SEND_METRICS=0" \
        -e "PBX_FIREWALL_ENABLED=1" \
        -e "PBX_FAIL2BAN_ENABLED=1" \
        -e "SSH_PORT=8023" \
        -e "WEB_PORT=8081" \
        -e "WEB_HTTPS_PORT=8445" \
        -e "ID_WWW_USER=$(id -u)" \
        -e "ID_WWW_GROUP=$(id -g)" \
        -e "MIKOPBX_RATE_LIMIT_ENABLED=0" \
        -e "SCHEMA_VALIDATION_STRICT=1" \
        "$image" >/dev/null
}

target_urls() {
    local ip="$1"

    printf 'https://%s:8445\n' "$ip"
    printf 'https://%s\n' "$ip"
    printf 'http://%s:8081\n' "$ip"
    printf 'http://%s\n' "$ip"
}

wait_for_target() {
    local container="$1"
    local ip
    local status
    local url

    ip="$(docker inspect "$container" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
    if [ -z "$ip" ]; then
        print_error "$container has no Docker IP"
        return 1
    fi

    for _ in $(seq 1 "$READY_ATTEMPTS"); do
        while IFS= read -r url; do
            status="$(curl -k -sS -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
            if [ "$status" = "200" ] || [ "$status" = "301" ] || [ "$status" = "302" ]; then
                print_info "$container is ready at $url"
                return 0
            fi
        done < <(target_urls "$ip")
        sleep 2
    done

    print_error "$container did not become ready"
    docker logs --tail 80 "$container" || true
    return 1
}

main() {
    if ! command -v docker >/dev/null 2>&1; then
        print_error "docker is not installed or not in PATH"
        exit 1
    fi

    print_info "State root: $STATE_ROOT"

    run_container "arm64" "linux/arm64" "$ARM64_CONTAINER" "$ARM64_IMAGE"
    run_container "amd64" "linux/amd64" "$AMD64_CONTAINER" "$AMD64_IMAGE"

    wait_for_target "$ARM64_CONTAINER"
    wait_for_target "$AMD64_CONTAINER"

    echo ""
    print_info "Use this matrix:"
    echo "MIKOPBX_BROWSERSTACK_MATRIX=\"arm64:$ARM64_CONTAINER amd64:$AMD64_CONTAINER\""
}

main "$@"
