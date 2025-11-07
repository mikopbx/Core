#!/bin/sh
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
# convert-lost-recordings.sh - Convert orphaned WAV files to WebM format
#
# This script finds WAV recordings without matching WebM files and converts them.
# Useful for recovering recordings that were missed by the automatic conversion process.
#
# Usage: convert-lost-recordings.sh <directory>
#
# Environment Variables:
#   DELETE_SOURCE_FILES  - Delete WAV after successful conversion (default: 0)
#   MAX_PARALLEL_JOBS    - Maximum parallel conversion jobs (default: 1)
#   CONVERSION_PRIORITY  - Nice priority level (default: 19, lowest priority)
#
# Note: CONVERSION_FORMAT is now hardcoded to "webm" (no longer configurable)
#
# Exit Codes:
#   0 - Success (all files processed)
#   1 - Invalid directory
#   2 - Another instance already running
#   3 - No conversion script found
#

# Check for required parameters
if [ $# -lt 1 ]; then
    echo "Usage: $0 <directory>"
    echo "Example: $0 /storage/usbdisk1/mikopbx/voicemailarchive"
    exit 1
fi

DIR="$1"

# Environment variables with defaults
DELETE_SOURCE="${DELETE_SOURCE_FILES:-0}"
MAX_PARALLEL="${MAX_PARALLEL_JOBS:-1}"
CONVERSION_PRIORITY="${CONVERSION_PRIORITY:-19}"

# Hardcoded constants (no longer configurable)
CONVERSION_FORMAT="webm"  # Always WebM/Opus (optimal for small business)

# Process ID for singleton check
SCRIPT_NAME=$(basename "$0")
CURRENT_PID=$$

# Logging function
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if command -v logger > /dev/null 2>&1; then
        logger -t "convert-lost-recordings" -p "user.$level" "$message"
    fi

    echo "[$timestamp] [$level] $message"
}

# Check if another process is already running (singleton pattern)
log_message "info" "Checking for existing conversion processes"

# Use ps and grep to find other instances
EXISTING_PROCESSES=$(/bin/ps -A -f | grep "$SCRIPT_NAME" | grep -v "$$" | grep -v grep | wc -l)

if [ "$EXISTING_PROCESSES" -gt 0 ]; then
    log_message "warn" "Another conversion process is already running"
    exit 2
fi

# Validate directory exists
if [ ! -d "$DIR" ]; then
    log_message "error" "Directory not found: $DIR"
    exit 1
fi

log_message "info" "Starting conversion scan in: $DIR"
log_message "info" "Configuration: format=webm (hardcoded), priority=$CONVERSION_PRIORITY, parallel=$MAX_PARALLEL"

# Use WebM converter (hardcoded)
CONVERTER_SCRIPT="/sbin/wav2webm.sh"
TARGET_EXT=".webm"

# Check if converter script exists
if [ ! -f "$CONVERTER_SCRIPT" ]; then
    log_message "error" "Conversion script not found: $CONVERTER_SCRIPT"
    exit 3
fi

log_message "info" "Using converter: $CONVERTER_SCRIPT"

# Statistics
TOTAL_FOUND=0
TOTAL_CONVERTED=0
TOTAL_SKIPPED=0
TOTAL_FAILED=0
ACTIVE_JOBS=0

# Find all WAV files (excluding split files _in.wav and _out.wav)
log_message "info" "Scanning for WAV files..."

# Use find to locate WAV files, then process them
find "$DIR" -type f -name "*.wav" ! -name "*_in.wav" ! -name "*_out.wav" | while read -r WAV_FILE; do
    # Extract basename without extension
    BASENAME=$(echo "$WAV_FILE" | rev | cut -f 2- -d '.' | rev)
    TARGET_FILE="${BASENAME}${TARGET_EXT}"

    TOTAL_FOUND=$((TOTAL_FOUND + 1))

    # Check if target file already exists
    if [ -f "$TARGET_FILE" ]; then
        log_message "debug" "Skipping (target exists): $(basename "$WAV_FILE")"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        continue
    fi

    # Check if file is being used (open by another process)
    if command -v lsof > /dev/null 2>&1; then
        lsof "$WAV_FILE" > /dev/null 2>&1
        LSOF_RESULT=$?

        if [ $LSOF_RESULT -eq 0 ]; then
            log_message "debug" "Skipping (file locked): $(basename "$WAV_FILE")"
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
            continue
        fi
    fi

    # Check if wav2webm/wav2mp3 is already processing this file
    if /bin/busybox ps | /bin/busybox grep -E "wav2webm|wav2mp3" | /bin/busybox grep "$BASENAME" > /dev/null 2>&1; then
        log_message "debug" "Skipping (already converting): $(basename "$WAV_FILE")"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        continue
    fi

    # Wait if max parallel jobs reached
    while [ $ACTIVE_JOBS -ge $MAX_PARALLEL ]; do
        sleep 0.5
        # Count active conversion processes
        ACTIVE_JOBS=$(/bin/busybox ps | /bin/busybox grep -c "$CONVERTER_SCRIPT" | grep -v grep || echo 0)
    done

    # Start conversion with low priority
    log_message "info" "Converting: $(basename "$WAV_FILE")"

    if [ "$DELETE_SOURCE" = "1" ]; then
        export DELETE_SOURCE_FILES="1"
    fi

    # Launch conversion in background
    /usr/bin/nice -n "$CONVERSION_PRIORITY" "$CONVERTER_SCRIPT" "$BASENAME" > /dev/null 2>&1 &
    CONVERSION_PID=$!
    ACTIVE_JOBS=$((ACTIVE_JOBS + 1))

    # Give it a moment to start
    sleep 0.1

    # Check if conversion started successfully
    if kill -0 $CONVERSION_PID 2>/dev/null; then
        log_message "info" "Conversion started (PID: $CONVERSION_PID): $(basename "$WAV_FILE")"
    else
        log_message "error" "Failed to start conversion: $(basename "$WAV_FILE")"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        ACTIVE_JOBS=$((ACTIVE_JOBS - 1))
        continue
    fi

    # Wait for completion if running synchronously
    if [ $MAX_PARALLEL -eq 1 ]; then
        wait $CONVERSION_PID
        EXIT_CODE=$?

        if [ $EXIT_CODE -eq 0 ]; then
            log_message "info" "Conversion successful: $(basename "$TARGET_FILE")"
            TOTAL_CONVERTED=$((TOTAL_CONVERTED + 1))
        else
            log_message "error" "Conversion failed (exit: $EXIT_CODE): $(basename "$WAV_FILE")"
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
        fi

        ACTIVE_JOBS=0
    else
        TOTAL_CONVERTED=$((TOTAL_CONVERTED + 1))
    fi

    # Rate limiting (avoid overwhelming system)
    sleep 0.1
done

# Wait for remaining background jobs
if [ $MAX_PARALLEL -gt 1 ]; then
    log_message "info" "Waiting for remaining conversion jobs to complete..."
    wait
fi

# Print summary statistics
log_message "info" "=== Conversion Summary ==="
log_message "info" "Total WAV files found: $TOTAL_FOUND"
log_message "info" "Successfully converted: $TOTAL_CONVERTED"
log_message "info" "Skipped (existing/locked): $TOTAL_SKIPPED"
log_message "info" "Failed: $TOTAL_FAILED"

# Exit with appropriate status
if [ $TOTAL_FAILED -gt 0 ]; then
    log_message "warn" "Conversion completed with errors"
else
    log_message "info" "Conversion completed successfully"
fi

exit 0
