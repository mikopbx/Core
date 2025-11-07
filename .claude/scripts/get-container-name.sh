#!/bin/bash
# Get MikoPBX container name based on current working directory
# This script maps git worktree to the corresponding Docker container

set -euo pipefail

# Get current working directory
CURRENT_DIR="$(pwd)"

# Get all running MikoPBX containers
CONTAINERS=$(docker ps --format "{{.Names}}" | grep "^mikopbx_" || true)

if [ -z "$CONTAINERS" ]; then
    echo "Error: No running MikoPBX containers found" >&2
    exit 1
fi

# Try to find container by checking mounts
for container in $CONTAINERS; do
    # Check if this container has mounts from current directory
    MOUNT_CHECK=$(docker inspect "$container" --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' | grep -F "$CURRENT_DIR" | head -1 || true)

    if [ -n "$MOUNT_CHECK" ]; then
        echo "$container"
        exit 0
    fi
done

# Fallback: try to map by worktree name pattern
# Core -> mikopbx_php83
# project-tests-refactoring -> mikopbx_tests-refactoring
# project-modules-api-refactoring -> mikopbx_modules-api-refactoring
# project-s3-records-storage -> mikopbx_s3-records-storage

WORKTREE_NAME=$(basename "$CURRENT_DIR")

case "$WORKTREE_NAME" in
    "Core")
        CONTAINER_NAME="mikopbx_php83"
        ;;
    project-*)
        # Extract suffix after "project-"
        SUFFIX="${WORKTREE_NAME#project-}"
        CONTAINER_NAME="mikopbx_${SUFFIX}"
        ;;
    *)
        # Default to mikopbx_php83 if no match
        echo "Warning: Could not determine container for $WORKTREE_NAME, using mikopbx_php83" >&2
        CONTAINER_NAME="mikopbx_php83"
        ;;
esac

# Verify container exists and is running
if echo "$CONTAINERS" | grep -q "^${CONTAINER_NAME}$"; then
    echo "$CONTAINER_NAME"
    exit 0
else
    echo "Error: Container $CONTAINER_NAME not found in running containers" >&2
    echo "Available containers:" >&2
    echo "$CONTAINERS" >&2
    exit 1
fi
