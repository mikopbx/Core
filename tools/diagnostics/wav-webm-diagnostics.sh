#!/bin/sh

# Read-only diagnostics for MikoPBX WAV -> WebM recording processing.
# It writes only its report and temporary index files under /tmp.

set -u

MONITOR_DIR=${MONITOR_DIR:-/storage/usbdisk1/mikopbx/astspool/monitor}
TASK_DIR=${TASK_DIR:-$MONITOR_DIR/conversion-tasks}
CDR_DB=${CDR_DB:-/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db}
CONFIG_DB=${CONFIG_DB:-/cf/conf/mikopbx.db}
LOG_DIR=${LOG_DIR:-/storage/usbdisk1/mikopbx/log/system}
SAMPLE_LIMIT=${SAMPLE_LIMIT:-10}
FFPROBE_LIMIT=${FFPROBE_LIMIT:-3}
SYSTEM_CHECKS=${SYSTEM_CHECKS:-1}
REPORT_FILE=${REPORT_FILE:-/tmp/wav-webm-diagnostics-$(date +%Y%m%d-%H%M%S).log}

case "$SAMPLE_LIMIT" in
    ''|*[!0-9]*) SAMPLE_LIMIT=10 ;;
esac
case "$FFPROBE_LIMIT" in
    ''|*[!0-9]*) FFPROBE_LIMIT=3 ;;
esac

TMP_WORK=$(mktemp -d "${TMPDIR:-/tmp}/wav-webm-diagnostics.XXXXXX") || exit 1
trap 'rm -rf "$TMP_WORK"' EXIT HUP INT TERM

WAV_FILES="$TMP_WORK/wav-files"
BASES="$TMP_WORK/bases"
WITH_WEBM="$TMP_WORK/with-webm"
WITHOUT_WEBM="$TMP_WORK/without-webm"
MALFORMED="$TMP_WORK/malformed"
CDR_INDEXES="$TMP_WORK/cdr-indexes"

count_lines() {
    wc -l < "$1" | tr -d '[:space:]'
}

section() {
    printf '\n===== %s =====\n' "$1"
}

sql_quote() {
    printf '%s' "$1" | sed "s/'/''/g"
}

collect_files() {
    if [ ! -d "$MONITOR_DIR" ]; then
        : > "$WAV_FILES"
        : > "$BASES"
        : > "$WITH_WEBM"
        : > "$WITHOUT_WEBM"
        : > "$MALFORMED"
        return
    fi

    find "$MONITOR_DIR" -type f \
        \( -name '*.wav' -o -name '*.wav16' -o -name '*.wav48' \) \
        -print 2>/dev/null | sort > "$WAV_FILES"

    sed \
        -e 's/_in\.wav$//' -e 's/_out\.wav$//' \
        -e 's/_in\.wav16$//' -e 's/_out\.wav16$//' \
        -e 's/_in\.wav48$//' -e 's/_out\.wav48$//' \
        -e 's/\.wav$//' -e 's/\.wav16$//' -e 's/\.wav48$//' \
        "$WAV_FILES" | sort -u > "$BASES"

    : > "$WITH_WEBM"
    : > "$WITHOUT_WEBM"
    while IFS= read -r base; do
        if [ -f "${base}.webm" ]; then
            printf '%s\n' "$base" >> "$WITH_WEBM"
        else
            printf '%s\n' "$base" >> "$WITHOUT_WEBM"
        fi
    done < "$BASES"

    find "$MONITOR_DIR" -type f \
        \( -name '_in.wav' -o -name '_out.wav' \
        -o -name '_in.wav16' -o -name '_out.wav16' \
        -o -name '_in.wav48' -o -name '_out.wav48' \) \
        -print 2>/dev/null | sort > "$MALFORMED"
}

report_inventory() {
    section 'Recording inventory'
    printf 'Monitor directory: %s\n' "$MONITOR_DIR"
    printf 'Physical WAV-family files: %s\n' "$(count_lines "$WAV_FILES")"
    printf 'Logical recording bases: %s\n' "$(count_lines "$BASES")"
    printf 'Bases with WebM: %s\n' "$(count_lines "$WITH_WEBM")"
    printf 'Bases without WebM: %s\n' "$(count_lines "$WITHOUT_WEBM")"
    printf 'Malformed bare channel files: %s\n' "$(count_lines "$MALFORMED")"

    wav_kib=$(while IFS= read -r file; do du -k "$file" 2>/dev/null; done < "$WAV_FILES" \
        | awk '{ total += $1 } END { print total + 0 }')
    printf 'WAV-family allocated size: %s KiB\n' "$wav_kib"

    printf '\nOldest missing WebM bases (up to 10):\n'
    head -n 10 "$WITHOUT_WEBM"
    printf '\nNewest missing WebM bases (up to 10):\n'
    tail -n 10 "$WITHOUT_WEBM"

    if [ -s "$MALFORMED" ]; then
        printf '\nMalformed files:\n'
        head -n 30 "$MALFORMED"
    fi
}

report_tasks() {
    section 'Conversion task queue'
    if [ ! -d "$TASK_DIR" ]; then
        printf 'Task directory is absent: %s\n' "$TASK_DIR"
        return
    fi
    pending=$(find "$TASK_DIR" -type f -name '*.json' ! -name '*.failed.json' 2>/dev/null | wc -l | tr -d '[:space:]')
    failed=$(find "$TASK_DIR" -type f -name '*.failed.json' 2>/dev/null | wc -l | tr -d '[:space:]')
    printf 'Task directory: %s\n' "$TASK_DIR"
    printf 'Pending task files: %s\n' "$pending"
    printf 'Failed task files: %s\n' "$failed"
    printf 'Error codes: 1=empty input; 2=ffmpeg missing or source absent; 3=conversion failed; 4=stereo merge failed; 5=validation failed.\n'

    failed_list="$TMP_WORK/failed-tasks"
    find "$TASK_DIR" -type f -name '*.failed.json' -print 2>/dev/null | sort | tail -n 20 > "$failed_list"
    while IFS= read -r task_file; do
        [ -n "$task_file" ] || continue
        printf '\nFailed task: %s\n' "$task_file"
        grep -E '"(uniqueid|input_path|created_at|attempts|last_attempt_at|last_error_code)"' \
            "$task_file" 2>/dev/null | head -n 10
        input_path=$(sed -n 's/^[[:space:]]*"input_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$task_file" | head -n 1)
        if [ -n "$input_path" ]; then
            source_status='ABSENT'
            for ext in wav wav16 wav48; do
                if [ -f "${input_path}.${ext}" ]; then
                    source_status="PRESENT (${input_path}.${ext})"
                    break
                fi
            done
            printf 'Current source status: %s\n' "$source_status"
        fi
    done < "$failed_list"
}

report_settings() {
    section 'Conversion setting'
    if ! command -v sqlite3 >/dev/null 2>&1; then
        printf 'sqlite3 is unavailable\n'
        return
    fi
    if [ ! -r "$CONFIG_DB" ]; then
        printf 'Configuration database is unreadable: %s\n' "$CONFIG_DB"
        return
    fi
    setting=$(sqlite3 -cmd '.timeout 1000' "$CONFIG_DB" \
        "PRAGMA query_only=ON; SELECT key || '=' || value FROM m_PbxSettings WHERE key='PBXRecordDeleteSourceAfterConvert' LIMIT 1;" \
        2>&1)
    if [ -n "$setting" ]; then
        printf '%s\n' "$setting"
    else
        printf 'PBXRecordDeleteSourceAfterConvert is not set\n'
    fi
}

find_cdr_indexes() {
    : > "$CDR_INDEXES"
    sqlite3 -cmd '.timeout 1000' "$CDR_DB" \
        "PRAGMA query_only=ON; PRAGMA index_list(cdr_general);" \
        2>/dev/null | awk -F '|' '{ print $2 }' | while IFS= read -r index_name; do
            [ -n "$index_name" ] || continue
            quoted=$(sql_quote "$index_name")
            sqlite3 -cmd '.timeout 1000' "$CDR_DB" \
                "PRAGMA query_only=ON; PRAGMA index_info('$quoted');" \
                2>/dev/null | awk -F '|' -v idx="$index_name" '{ print idx "|" $3 }'
        done > "$CDR_INDEXES"
}

report_cdr_sample() {
    section 'Lightweight CDR correlation'
    printf 'Policy: at most %s recent samples; exact indexed equality only; no LIKE scans.\n' "$SAMPLE_LIMIT"

    if [ "$SAMPLE_LIMIT" -eq 0 ]; then
        printf 'CDR sampling disabled.\n'
        return
    fi
    if ! command -v sqlite3 >/dev/null 2>&1 || [ ! -r "$CDR_DB" ]; then
        printf 'CDR database or sqlite3 is unavailable: %s\n' "$CDR_DB"
        return
    fi

    find_cdr_indexes
    printf 'Relevant CDR indexes:\n'
    grep -Ei '\|(UNIQUEID|linkedid)$' "$CDR_INDEXES" 2>/dev/null || printf '(none detected)\n'

    if ! grep -Ei '\|UNIQUEID$' "$CDR_INDEXES" >/dev/null 2>&1; then
        printf 'Skipped CDR row lookup: UNIQUEID is not indexed.\n'
        return
    fi

    tail -n "$SAMPLE_LIMIT" "$WITHOUT_WEBM" | while IFS= read -r base; do
        uid=$(basename "$base")
        if [ -z "$uid" ]; then
            printf 'SKIP malformed empty recording basename: %s\n' "$base"
            continue
        fi
        quoted_uid=$(sql_quote "$uid")
        printf '\nCDR exact UNIQUEID=%s\n' "$uid"
        rows=$(sqlite3 -cmd '.timeout 1000' -separator '|' "$CDR_DB" \
            "PRAGMA query_only=ON; SELECT UNIQUEID,linkedid,recordingfile,start,answer,endtime,disposition,src_num,dst_num FROM cdr_general WHERE UNIQUEID='$quoted_uid' LIMIT 5;" \
            2>&1)
        if [ -n "$rows" ]; then
            printf '%s\n' "$rows"
            continue
        fi

        linkedid=${uid%_*}
        if [ "$linkedid" = "$uid" ] || ! grep -Ei '\|linkedid$' "$CDR_INDEXES" >/dev/null 2>&1; then
            printf '(no exact UNIQUEID row; indexed linkedid fallback unavailable)\n'
            continue
        fi
        quoted_linkedid=$(sql_quote "$linkedid")
        printf 'No exact UNIQUEID row; CDR exact linkedid=%s (up to 5 rows)\n' "$linkedid"
        sqlite3 -cmd '.timeout 1000' -separator '|' "$CDR_DB" \
            "PRAGMA query_only=ON; SELECT UNIQUEID,linkedid,recordingfile,start,answer,endtime,disposition,src_num,dst_num FROM cdr_general WHERE linkedid='$quoted_linkedid' LIMIT 5;" \
            2>&1
    done
}

report_media_probe() {
    section 'Media validation sample'
    printf 'Policy: ffprobe only, no conversion; at most %s recordings.\n' "$FFPROBE_LIMIT"
    if [ "$FFPROBE_LIMIT" -eq 0 ]; then
        printf 'Media probing disabled.\n'
        return
    fi
    if ! command -v ffprobe >/dev/null 2>&1; then
        printf 'ffprobe is unavailable\n'
        return
    fi

    probed=0
    tail -n "$FFPROBE_LIMIT" "$WITHOUT_WEBM" | while IFS= read -r base; do
        source=''
        for candidate in "${base}.wav" "${base}.wav16" "${base}.wav48" \
            "${base}_in.wav" "${base}_in.wav16" "${base}_in.wav48"; do
            if [ -f "$candidate" ]; then
                source=$candidate
                break
            fi
        done
        [ -n "$source" ] || continue
        printf '\nffprobe: %s\n' "$source"
        ffprobe -v error -show_entries format=duration,size \
            -show_entries stream=codec_name,sample_rate,channels \
            -of default=noprint_wrappers=1 "$source" 2>&1
        probed=$((probed + 1))
    done
    : "$probed"
}

report_logs() {
    section 'Relevant conversion logs'
    pattern='WorkerWav2Webm|Conversion failed|Stereo merge failed|No source file found|validation failed|Task failed|retry scheduled'
    matches="$TMP_WORK/log-matches"
    : > "$matches"

    for log_file in /var/log/messages "$LOG_DIR"/messages*; do
        [ -f "$log_file" ] || continue
        case "$log_file" in
            *.gz)
                if command -v zgrep >/dev/null 2>&1; then
                    zgrep -hiE "$pattern" "$log_file" 2>/dev/null >> "$matches" || true
                fi
                ;;
            *)
                grep -hiE "$pattern" "$log_file" 2>/dev/null >> "$matches" || true
                ;;
        esac
    done

    if [ -s "$matches" ]; then
        # Archive glob order is not chronological (for example messages.10.gz
        # sorts before messages.2.gz), so order by the timestamp in each line.
        sort -u "$matches" | tail -n 100
    else
        printf 'No matching conversion messages found in available current/archived logs.\n'
    fi
}

report_system() {
    [ "$SYSTEM_CHECKS" = 1 ] || return
    section 'System and worker status'
    printf 'Timestamp: '; date
    printf 'Hostname: '; hostname
    [ -r /etc/version ] && { printf 'MikoPBX version: '; head -n 1 /etc/version; }
    df -h "$MONITOR_DIR" 2>&1
    printf '\nWorker processes:\n'
    if command -v pgrep >/dev/null 2>&1; then
        worker_rows=$( { pgrep -af WorkerWav2Webm; pgrep -af WorkerCdr; } 2>/dev/null | sort -u)
    else
        worker_rows=$(ps auxww 2>/dev/null | grep -E '[W]orkerWav2Webm|[W]orkerCdr')
    fi
    if [ -n "$worker_rows" ]; then
        printf '%s\n' "$worker_rows"
    else
        printf '(not visible in process list)\n'
    fi
    printf '\nffmpeg:\n'
    if command -v ffmpeg >/dev/null 2>&1; then
        ffmpeg -version 2>&1 | head -n 3
    else
        printf 'ffmpeg is unavailable\n'
    fi
}

run_report() {
    printf 'MikoPBX WAV/WebM read-only diagnostics\n'
    printf 'Report file: %s\n' "$REPORT_FILE"
    collect_files
    report_system
    report_inventory
    report_tasks
    report_settings
    report_cdr_sample
    report_media_probe
    report_logs
    section 'End'
    printf 'No recordings, CDR rows, tasks, or configuration values were changed.\n'
}

mkdir -p "$(dirname "$REPORT_FILE")" || exit 1
run_report 2>&1 | tee "$REPORT_FILE"
