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
# wav2webm.sh - Convert WAV recordings to WebM/Opus format
#
# Usage: wav2webm.sh <filename_without_extension>
#
# Environment Variables:
#   DELETE_SOURCE_FILES - Set to "1" to delete source WAV files after conversion (default: 0)
#
#   Call Metadata (for Opus tags):
#   CALL_LINKEDID     - Unique call identifier
#   CALL_SRC_NUM      - Source phone number
#   CALL_DST_NUM      - Destination phone number
#   CALL_START        - Call start timestamp (ISO 8601 or UNIX timestamp)
#   CALL_ANSWER       - Call answer timestamp
#   CALL_DURATION     - Total call duration in seconds
#   CALL_BILLSEC      - Billable seconds
#   CALL_DISPOSITION  - Call disposition (ANSWERED, NO ANSWER, BUSY, etc.)
#   CALL_UNIQUEID     - Asterisk unique ID
#
# Note: All other parameters are hardcoded as constants (optimal values for small business):
#   - Opus bitrate 8kHz: 48k (optimal for G.711)
#   - Opus bitrate 16kHz+: 64k (optimal for G.722+)
#   - Loudnorm mode: single-pass (99% accuracy, 2x faster)
#   - FFmpeg timeout: 120 seconds (sufficient for most recordings)
#   - Output format: webm/opus (always)
#
# Exit Codes:
#   0 - Success
#   1 - Source file not found
#   2 - FFmpeg not available
#   3 - Conversion failed
#   4 - Stereo merge failed
#   5 - Output validation failed
#

# Input filename without extension
BASENAME="$1"

# Check if basename provided
if [ -z "$BASENAME" ]; then
  echo "ERROR: No filename provided"
  echo "Usage: $0 <filename_without_extension>"
  exit 1
fi

# Source files
SRC_FILE="${BASENAME}.wav"
SRC_IN="${BASENAME}_in.wav"
SRC_OUT="${BASENAME}_out.wav"
DST_FILE="${BASENAME}.webm"

# Temporary files
TEMP_MERGED="/tmp/merged_$$.wav"

# Environment variables (only DELETE_SOURCE_FILES is configurable)
DELETE_SOURCE="${DELETE_SOURCE_FILES:-0}"

# Hardcoded constants (optimal for small business, no need to configure)
OPUS_BITRATE_8K="48k"    # Optimal for G.711 (8kHz) codec
OPUS_BITRATE_16K="64k"   # Optimal for G.722+ (16kHz+) codecs
LOUDNORM_MODE="single"   # Single-pass normalization (99% accuracy, 2x faster)
FFMPEG_TIMEOUT="120"     # Timeout in seconds

# Logging function (to syslog if available)
log_message() {
    local level="$1"
    local message="$2"
    if command -v logger > /dev/null 2>&1; then
        logger -t "wav2webm" -p "user.$level" "$message"
    fi
    echo "[$level] $message"
}

# Check if FFmpeg is available
if ! command -v ffmpeg > /dev/null 2>&1; then
    log_message "error" "FFmpeg not found"
    exit 2
fi

if ! command -v ffprobe > /dev/null 2>&1; then
    log_message "error" "ffprobe not found"
    exit 2
fi

log_message "info" "Starting conversion: $BASENAME"

# Step 1: Merge stereo channels if split files exist
if [ -f "$SRC_IN" ] && [ -f "$SRC_OUT" ]; then
    log_message "info" "Merging split audio files (stereo mode)"

    # Use sox to merge external (left) and internal (right) channels
    if command -v sox > /dev/null 2>&1; then
        /usr/bin/sox -M "$SRC_OUT" "$SRC_IN" "$TEMP_MERGED"
        MERGE_RESULT=$?

        if [ $MERGE_RESULT -eq 0 ]; then
            # Use merged file as source
            SRC_FILE="$TEMP_MERGED"
            log_message "info" "Stereo merge successful"
        else
            log_message "error" "Failed to merge stereo files with sox"
            rm -f "$TEMP_MERGED"
            exit 4
        fi
    else
        log_message "warn" "sox not available, using external channel only"
        SRC_FILE="$SRC_OUT"
    fi
elif [ ! -f "$SRC_FILE" ]; then
    log_message "error" "Source file not found: $SRC_FILE"
    exit 1
fi

# Step 2: Detect sample rate with ffprobe
log_message "info" "Detecting audio properties"
SAMPLE_RATE=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "$SRC_FILE" 2>/dev/null)

if [ -z "$SAMPLE_RATE" ]; then
    log_message "error" "Failed to detect sample rate"
    rm -f "$TEMP_MERGED"
    exit 3
fi

log_message "info" "Detected sample rate: ${SAMPLE_RATE}Hz"

# Step 3: Select appropriate Opus bitrate
if [ "$SAMPLE_RATE" -le 8000 ]; then
    OPUS_BITRATE="$OPUS_BITRATE_8K"
    log_message "info" "Using bitrate $OPUS_BITRATE for narrow-band audio (8kHz)"
else
    OPUS_BITRATE="$OPUS_BITRATE_16K"
    log_message "info" "Using bitrate $OPUS_BITRATE for wide-band audio (>8kHz)"
fi

# Step 4: Build FFmpeg command
log_message "info" "Building FFmpeg command"

# Base command with -vn flag (audio-only, no video stream)
FFMPEG_CMD="ffmpeg -i \"$SRC_FILE\" -vn -y"

# Add loudnorm filter (EBU R128)
if [ "$LOUDNORM_MODE" = "two-pass" ]; then
    log_message "info" "Using two-pass loudnorm"
    # Two-pass loudnorm (more accurate, slower)
    # First pass: measure loudness
    LOUDNORM_PARAMS=$(ffmpeg -i "$SRC_FILE" -af "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | tail -n 12)
    # Second pass: apply measured values
    FFMPEG_CMD="$FFMPEG_CMD -af loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(echo "$LOUDNORM_PARAMS" | grep input_i | cut -d':' -f2 | tr -d ' \",')"
else
    log_message "info" "Using single-pass loudnorm"
    # Single-pass loudnorm (faster, good enough)
    FFMPEG_CMD="$FFMPEG_CMD -af loudnorm=I=-16:TP=-1.5:LRA=11"
fi

# Add Opus encoding parameters
FFMPEG_CMD="$FFMPEG_CMD -c:a libopus -b:a $OPUS_BITRATE -vbr on -compression_level 10 -application voip"

# Step 3a: Extract metadata from environment variables or filename
log_message "info" "Processing call metadata"

# Priority 1: Use environment variables if provided
if [ -n "$CALL_LINKEDID" ]; then
    log_message "info" "Using metadata from environment variables"

    LINKEDID="$CALL_LINKEDID"
    SRC_NUM="$CALL_SRC_NUM"
    DST_NUM="$CALL_DST_NUM"
    TIMESTAMP="$CALL_START"
    DURATION="$CALL_DURATION"
    BILLSEC="$CALL_BILLSEC"
    DISPOSITION="$CALL_DISPOSITION"
    UNIQUEID="$CALL_UNIQUEID"
    DIRECTION=""  # Not available from CDR

# Priority 2: Extract from filename if environment variables not set
# Format: out-{linkedid}-{src}-{dst}-{YYYYMMDD-HHMMSS}
else
    BASENAME_ONLY=$(basename "$BASENAME")
    if echo "$BASENAME_ONLY" | grep -qE '^(in|out)-'; then
        log_message "info" "Extracting metadata from filename"

        # Parse filename components
        DIRECTION=$(echo "$BASENAME_ONLY" | cut -d'-' -f1)
        LINKEDID=$(echo "$BASENAME_ONLY" | cut -d'-' -f2)
        SRC_NUM=$(echo "$BASENAME_ONLY" | cut -d'-' -f4)
        DST_NUM=$(echo "$BASENAME_ONLY" | cut -d'-' -f5)
        DATE_PART=$(echo "$BASENAME_ONLY" | cut -d'-' -f6)
        TIME_PART=$(echo "$BASENAME_ONLY" | cut -d'-' -f7)

        # Convert to ISO 8601 timestamp
        if [ -n "$DATE_PART" ] && [ -n "$TIME_PART" ]; then
            YEAR=$(echo "$DATE_PART" | cut -c1-4)
            MONTH=$(echo "$DATE_PART" | cut -c5-6)
            DAY=$(echo "$DATE_PART" | cut -c7-8)
            HOUR=$(echo "$TIME_PART" | cut -c1-2)
            MINUTE=$(echo "$TIME_PART" | cut -c3-4)
            SECOND=$(echo "$TIME_PART" | cut -c5-6)
            TIMESTAMP="${YEAR}-${MONTH}-${DAY}T${HOUR}:${MINUTE}:${SECOND}Z"
        fi
    else
        log_message "warn" "No metadata available from environment or filename"
    fi
fi

# Step 3b: Build metadata tags for FFmpeg
if [ -n "$LINKEDID" ]; then
    log_message "info" "Adding metadata tags to output"

    # Standard tags (compatible with audio players)
    FFMPEG_CMD="$FFMPEG_CMD -metadata title=\"Call $LINKEDID\""
    [ -n "$SRC_NUM" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata artist=\"$SRC_NUM\""
    [ -n "$DST_NUM" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata album=\"$DST_NUM\""
    [ -n "$TIMESTAMP" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata date=\"$TIMESTAMP\""
    [ -n "$DISPOSITION" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata comment=\"Status: $DISPOSITION\""

    # Custom tags (for MikoPBX)
    FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_LINKEDID=\"$LINKEDID\""
    [ -n "$SRC_NUM" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_SRC_NUM=\"$SRC_NUM\""
    [ -n "$DST_NUM" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_DST_NUM=\"$DST_NUM\""
    [ -n "$DIRECTION" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_DIRECTION=\"$DIRECTION\""
    [ -n "$DURATION" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_DURATION=\"$DURATION\""
    [ -n "$BILLSEC" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_BILLSEC=\"$BILLSEC\""
    [ -n "$DISPOSITION" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_DISPOSITION=\"$DISPOSITION\""
    [ -n "$UNIQUEID" ] && FFMPEG_CMD="$FFMPEG_CMD -metadata CALL_UNIQUEID=\"$UNIQUEID\""

    # Technical metadata
    FFMPEG_CMD="$FFMPEG_CMD -metadata AUDIO_FORMAT=\"webm\""
    FFMPEG_CMD="$FFMPEG_CMD -metadata AUDIO_CODEC=\"opus\""
    FFMPEG_CMD="$FFMPEG_CMD -metadata AUDIO_BITRATE=\"$OPUS_BITRATE\""
    FFMPEG_CMD="$FFMPEG_CMD -metadata AUDIO_SAMPLERATE=\"$SAMPLE_RATE\""
    FFMPEG_CMD="$FFMPEG_CMD -metadata AUDIO_NORMALIZED=\"yes\""
    FFMPEG_CMD="$FFMPEG_CMD -metadata RECORDING_SOURCE_FILE=\"$(basename "$SRC_FILE")\""
fi

# Output file
FFMPEG_CMD="$FFMPEG_CMD \"$DST_FILE\""

# Step 5: Execute conversion with timeout
log_message "info" "Starting FFmpeg conversion (timeout: ${FFMPEG_TIMEOUT}s)"

# Use timeout if available
if command -v timeout > /dev/null 2>&1; then
    eval "timeout $FFMPEG_TIMEOUT $FFMPEG_CMD" > /dev/null 2>&1
    FFMPEG_RESULT=$?
else
    eval "$FFMPEG_CMD" > /dev/null 2>&1
    FFMPEG_RESULT=$?
fi

# Check conversion result
if [ $FFMPEG_RESULT -ne 0 ]; then
    log_message "error" "FFmpeg conversion failed (exit code: $FFMPEG_RESULT)"
    rm -f "$TEMP_MERGED" "$DST_FILE"
    exit 3
fi

log_message "info" "Conversion completed successfully"

# Step 6: Validate output file
log_message "info" "Validating output file"

# Check if output file exists and is not empty
if [ ! -f "$DST_FILE" ]; then
    log_message "error" "Output file not created"
    rm -f "$TEMP_MERGED"
    exit 5
fi

FILE_SIZE=$(stat -f%z "$DST_FILE" 2>/dev/null || stat -c%s "$DST_FILE" 2>/dev/null)
if [ -z "$FILE_SIZE" ] || [ "$FILE_SIZE" -lt 1000 ]; then
    log_message "error" "Output file too small (possibly corrupt)"
    rm -f "$TEMP_MERGED" "$DST_FILE"
    exit 5
fi

# Validate with ffprobe
ffprobe -v error "$DST_FILE" > /dev/null 2>&1
PROBE_RESULT=$?

if [ $PROBE_RESULT -ne 0 ]; then
    log_message "error" "Output file validation failed"
    rm -f "$TEMP_MERGED" "$DST_FILE"
    exit 5
fi

# Set read permissions
chmod o+r "$DST_FILE" 2>/dev/null

log_message "info" "Output file validated successfully (size: ${FILE_SIZE} bytes)"

# Step 7: Cleanup source files if requested
if [ "$DELETE_SOURCE" = "1" ]; then
    log_message "info" "Deleting source files"
    rm -f "$SRC_FILE" "$SRC_IN" "$SRC_OUT" "$TEMP_MERGED"
else
    log_message "info" "Preserving source files (DELETE_SOURCE_FILES not set)"
    rm -f "$TEMP_MERGED"
fi

log_message "info" "Conversion completed: $DST_FILE"

exit 0
