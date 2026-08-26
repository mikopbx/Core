#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT_DIR/tools/diagnostics/wav-webm-diagnostics.sh"
FIXTURE=$(mktemp -d "${TMPDIR:-/tmp}/wav-webm-test.XXXXXX")
trap 'rm -rf "$FIXTURE"' EXIT HUP INT TERM

MON="$FIXTURE/monitor"
TASK="$MON/conversion-tasks"
LOG_DIR="$FIXTURE/log"
REPORT="$FIXTURE/report.log"
CDR_DB="$FIXTURE/cdr.db"
CONFIG_DB="$FIXTURE/mikopbx.db"

mkdir -p "$MON/2026/03/01/10" "$MON/2026/03/02/10" \
    "$MON/2026/03/03/10" "$TASK" "$LOG_DIR"

for suffix in '' '_in' '_out'; do
    printf 'wav-a%s\n' "$suffix" > "$MON/2026/03/01/10/mikopbx-100.1_A1${suffix}.wav"
done
printf 'wav-b\n' > "$MON/2026/03/02/10/mikopbx-200.2_B2.wav48"
printf 'webm-b\n' > "$MON/2026/03/02/10/mikopbx-200.2_B2.webm"
printf 'broken-in\n' > "$MON/2026/03/03/10/_in.wav"
printf 'broken-out\n' > "$MON/2026/03/03/10/_out.wav"
printf '{}\n' > "$TASK/pending.json"
printf '{}\n' > "$TASK/exhausted.failed.json"
printf '%s\n' 'WorkerWav2Webm: Conversion failed for fixture' > "$LOG_DIR/messages"

sqlite3 "$CDR_DB" <<'SQL'
CREATE TABLE cdr_general (
    id INTEGER PRIMARY KEY,
    UNIQUEID TEXT,
    linkedid TEXT,
    recordingfile TEXT,
    start TEXT,
    answer TEXT,
    endtime TEXT,
    disposition TEXT,
    src_num TEXT,
    dst_num TEXT
);
CREATE UNIQUE INDEX cdr_uniqueid_idx ON cdr_general(UNIQUEID);
CREATE INDEX cdr_linkedid_idx ON cdr_general(linkedid);
INSERT INTO cdr_general
    (UNIQUEID, linkedid, recordingfile, start, answer, endtime, disposition, src_num, dst_num)
VALUES
    ('mikopbx-100.1_A1', 'mikopbx-100.1', '', '2026-03-01 10:00:00',
     '2026-03-01 10:00:01', '2026-03-01 10:01:00', 'ANSWERED', '100', '200');
SQL

sqlite3 "$CONFIG_DB" <<'SQL'
CREATE TABLE m_PbxSettings (key TEXT PRIMARY KEY, value TEXT);
INSERT INTO m_PbxSettings VALUES ('PBXRecordDeleteSourceAfterConvert', '1');
SQL

before=$(find "$MON" -type f -exec shasum {} \; | sort)

MONITOR_DIR="$MON" \
TASK_DIR="$TASK" \
CDR_DB="$CDR_DB" \
CONFIG_DB="$CONFIG_DB" \
LOG_DIR="$LOG_DIR" \
REPORT_FILE="$REPORT" \
SAMPLE_LIMIT=5 \
FFPROBE_LIMIT=0 \
SYSTEM_CHECKS=0 \
    sh "$SCRIPT" >/dev/null

after=$(find "$MON" -type f -exec shasum {} \; | sort)
[ "$before" = "$after" ] || {
    echo "FAIL: diagnostic changed monitor files" >&2
    exit 1
}

assert_report() {
    grep -F "$1" "$REPORT" >/dev/null || {
        echo "FAIL: report does not contain: $1" >&2
        exit 1
    }
}

assert_report 'Physical WAV-family files: 6'
assert_report 'Logical recording bases: 3'
assert_report 'Bases with WebM: 1'
assert_report 'Bases without WebM: 2'
assert_report 'Malformed bare channel files: 2'
assert_report 'Pending task files: 1'
assert_report 'Failed task files: 1'
assert_report 'PBXRecordDeleteSourceAfterConvert=1'
assert_report 'mikopbx-100.1_A1|mikopbx-100.1||2026-03-01 10:00:00|2026-03-01 10:00:01|2026-03-01 10:01:00|ANSWERED|100|200'
assert_report 'WorkerWav2Webm: Conversion failed for fixture'

if grep -E 'recordingfile[[:space:]]+LIKE|linkedid[[:space:]]+LIKE|UNIQUEID[[:space:]]+LIKE' "$SCRIPT" >/dev/null; then
    echo 'FAIL: diagnostic contains a LIKE scan against CDR identifiers' >&2
    exit 1
fi

echo 'PASS: wav-webm diagnostics fixture'
