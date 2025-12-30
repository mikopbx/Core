#!/usr/bin/env python3
"""
CDR Fixtures Generator - Dynamic Date Generation

This script generates CDR seed data with dates relative to the current date,
ensuring tests always have recent data regardless of when they run.

Usage:
    python3 generate_cdr_fixtures.py                    # Generate SQL to stdout
    python3 generate_cdr_fixtures.py --output FILE     # Write SQL to file
    python3 generate_cdr_fixtures.py --fixtures-dir DIR # Specify fixtures directory

The script reads cdr_test_data.json as a template and generates cdr_seed_data.sql
with dates distributed across the current month.

Date Distribution Strategy:
- All 30 records are distributed across the current month
- start dates: spread from day 1-28 of current month
- endtime: start + duration + small offset (for realism)
- answer: between start and endtime (for ANSWERED calls)
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional


def get_fixtures_dir() -> Path:
    """Determine fixtures directory based on environment and file location."""
    # Priority 1: Command line argument
    for i, arg in enumerate(sys.argv):
        if arg == '--fixtures-dir' and i + 1 < len(sys.argv):
            return Path(sys.argv[i + 1])

    # Priority 2: FIXTURES_DIR environment variable
    if os.getenv('FIXTURES_DIR'):
        return Path(os.getenv('FIXTURES_DIR'))

    # Priority 3: Relative to script location
    script_dir = Path(__file__).parent
    fixtures_dir = script_dir.parent / 'fixtures'
    if fixtures_dir.exists():
        return fixtures_dir

    # Priority 4: Common paths
    common_paths = [
        Path('/usr/www/tests/api/fixtures'),
        Path('/storage/usbdisk1/mikopbx/python-tests/fixtures'),
    ]
    for path in common_paths:
        if path.exists():
            return path

    # Fallback to relative path
    return fixtures_dir


def generate_dynamic_dates(record_index: int, total_records: int,
                           disposition: str, duration: int) -> Dict[str, str]:
    """
    Generate dynamic dates for a CDR record.

    Args:
        record_index: 0-based index of the record
        total_records: Total number of records
        disposition: Call disposition (ANSWERED, NOANSWER, BUSY, etc.)
        duration: Call duration in seconds

    Returns:
        Dictionary with 'start', 'endtime', 'answer' fields
    """
    now = datetime.now()

    # Distribute records across the current month (days 1-28 to be safe)
    day_of_month = 1 + (record_index * 27) // total_records

    # Vary the hour (9-17 business hours mostly, some evening)
    hour = 9 + (record_index * 3) % 9  # 9-17
    minute = (record_index * 17) % 60
    second = (record_index * 31) % 60

    # Create start datetime for current month
    start_dt = now.replace(
        day=min(day_of_month, 28),
        hour=hour,
        minute=minute,
        second=second,
        microsecond=0
    )

    # Calculate endtime based on duration
    end_dt = start_dt + timedelta(seconds=duration + 10)  # Add small overhead

    # Calculate answer time (only for ANSWERED calls)
    if disposition == 'ANSWERED':
        # Answer happens shortly after start (ring time)
        ring_time = 3 + (record_index % 8)  # 3-10 seconds ring time
        answer_dt = start_dt + timedelta(seconds=ring_time)
        answer_str = answer_dt.strftime('%Y-%m-%d %H:%M:%S.000')
    else:
        answer_str = ''

    return {
        'start': start_dt.strftime('%Y-%m-%d %H:%M:%S.000'),
        'endtime': end_dt.strftime('%Y-%m-%d %H:%M:%S.000'),
        'answer': answer_str
    }


def escape_sql_string(value: str) -> str:
    """Escape string for SQL insertion."""
    if value is None:
        return ''
    return str(value).replace("'", "''")


def generate_sql_insert(record: Dict[str, Any], dates: Dict[str, str]) -> str:
    """Generate SQL INSERT statement for a single CDR record."""
    return f"""-- Record {record['id']}: {record['disposition']} | {record['src_num']} -> {record['dst_num']} | {record['billsec']}s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    {record['id']},
    '{dates['start']}',
    '{dates['endtime']}',
    '{dates['answer']}',
    '{escape_sql_string(record['src_num'])}',
    '{escape_sql_string(record['dst_num'])}',
    '{escape_sql_string(record['disposition'])}',
    '{escape_sql_string(record['recordingfile'])}',
    {record['billsec']},
    {record['duration']},
    '{escape_sql_string(record['UNIQUEID'])}',
    '{escape_sql_string(record['linkedid'])}'
);
"""


def generate_sql(records: List[Dict[str, Any]]) -> str:
    """Generate complete SQL file content."""
    now = datetime.now()

    header = f"""-- CDR Test Data
-- Auto-generated with dynamic dates
-- Generated: {now.isoformat()}
-- Total records: {len(records)}

-- Clear existing test data
DELETE FROM cdr_general WHERE id BETWEEN 1 AND 1000;

-- Reset SQLite autoincrement counter for cdr_general table
-- WHY: Without this, SQLite continues counting from the highest previous ID
-- Example: If ID 50 existed before, next INSERT gets ID 51 even if we specify ID 1
DELETE FROM sqlite_sequence WHERE name='cdr_general';
INSERT INTO sqlite_sequence (name, seq) VALUES ('cdr_general', 0);

BEGIN TRANSACTION;

"""

    # Generate INSERT statements for each record
    inserts = []
    for i, record in enumerate(records):
        dates = generate_dynamic_dates(
            record_index=i,
            total_records=len(records),
            disposition=record['disposition'],
            duration=record['duration']
        )
        inserts.append(generate_sql_insert(record, dates))

    # Count statistics
    stats = {}
    with_recordings = 0
    for record in records:
        disp = record['disposition']
        stats[disp] = stats.get(disp, 0) + 1
        if record.get('recordingfile'):
            with_recordings += 1

    footer = f"""
COMMIT;

-- Summary:
"""
    for disp, count in sorted(stats.items()):
        footer += f"--   {disp}: {count}\n"
    footer += f"--   With recordings: {with_recordings}\n"

    return header + '\n'.join(inserts) + footer


def main():
    """Main entry point."""
    fixtures_dir = get_fixtures_dir()
    json_file = fixtures_dir / 'cdr_test_data.json'

    # Determine output
    output_file: Optional[Path] = None
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output_file = Path(sys.argv[i + 1])
            break

    # If no explicit output, default to cdr_seed_data.sql in fixtures dir
    if output_file is None and '--stdout' not in sys.argv:
        output_file = fixtures_dir / 'cdr_seed_data.sql'

    # Read JSON template
    if not json_file.exists():
        print(f"Error: JSON template not found: {json_file}", file=sys.stderr)
        sys.exit(1)

    with open(json_file, 'r') as f:
        records = json.load(f)

    # Generate SQL
    sql_content = generate_sql(records)

    # Output
    if output_file:
        with open(output_file, 'w') as f:
            f.write(sql_content)
        print(f"Generated {output_file} with {len(records)} records")
        print(f"Dates are relative to current date: {datetime.now().strftime('%Y-%m-%d')}")
    else:
        print(sql_content)


if __name__ == '__main__':
    main()
