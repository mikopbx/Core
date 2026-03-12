#!/usr/bin/env python3
"""
Test suite for post-test log analysis

Runs near the end of the test session (after all functional tests, before cleanup).
Analyzes MikoPBX system logs for PHP errors, exceptions, and fatal crashes
that occurred during the test run but were not caught by API-level assertions.

Why this matters:
- Background workers (S3 upload, wav2webm, CDR) can fail silently
- API endpoints may return 'success' while backend logs PHP Fatal errors
- Missing vendor files cause include() failures only visible in logs
- Broken system libraries (ffmpeg, etc.) produce errors only in worker logs

Strategy:
- Each test run records a timestamp marker at session start (via conftest fixture)
- This test reads logs from that timestamp forward
- Categorizes errors: Fatal, Exception, Warning, vendor/autoload issues
- Reports all findings with context for debugging

Total: 5 tests
"""

import re
from typing import List, Tuple

import pytest
from conftest import assert_api_success


# Conversion task directory inside MikoPBX container
CONVERSION_TASKS_DIR = '/storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks'

# Log files to analyze
LOG_FILES = {
    'system': '/storage/usbdisk1/mikopbx/log/system/messages',
    'php_error': '/storage/usbdisk1/mikopbx/log/php/error.log',
}

# Error patterns categorized by severity
FATAL_PATTERNS = [
    r'PHP Fatal error',
    r'Fatal error:',
    r'Segmentation fault',
    r'core dumped',
]

EXCEPTION_PATTERNS = [
    r'Uncaught Exception',
    r'Uncaught Error',
    r'Uncaught TypeError',
    r'Uncaught ValueError',
    r'Failed to open stream: No such file or directory',
]

WARNING_PATTERNS = [
    r'PHP Warning',
    r'PHP Deprecated',
]

# Known acceptable patterns that should NOT trigger test failure.
# Each entry is (regex_pattern, reason).
# Extend this list as legitimate errors are identified.
KNOWN_ACCEPTABLE = [
    # Template: (r'pattern', 'reason why this is expected'),
]


def exec_bash(api_client, command: str, timeout: int = 30) -> dict:
    """Execute bash command on MikoPBX and return response data."""
    response = api_client.post('system:executeBashCommand', {
        'command': command,
        'timeout': timeout,
    })
    assert_api_success(response, f"Failed to execute: {command[:80]}")
    return response['data']


def get_log_line_count(api_client, log_path: str) -> int:
    """Get current line count of a log file."""
    result = exec_bash(api_client, f'wc -l < "{log_path}" 2>/dev/null || echo 0')
    return int(result['output'].strip())


def get_new_log_lines(api_client, log_path: str, since_line: int) -> str:
    """Get log lines added after `since_line`."""
    result = exec_bash(
        api_client,
        f'tail -n +{since_line + 1} "{log_path}" 2>/dev/null || true',
        timeout=60,
    )
    return result['output']


def categorize_errors(
    log_lines: str,
) -> Tuple[List[str], List[str], List[str]]:
    """Categorize log lines into fatals, exceptions, warnings.

    Returns (fatals, exceptions, warnings) — each a list of matching lines.
    Lines matching KNOWN_ACCEPTABLE are excluded.
    """
    fatals = []
    exceptions = []
    warnings = []

    for line in log_lines.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Skip known acceptable patterns
        skip = False
        for pattern, _ignored_reason in KNOWN_ACCEPTABLE:
            if re.search(pattern, line):
                skip = True
                break
        if skip:
            continue

        # Categorize
        for pattern in FATAL_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                fatals.append(line)
                break
        else:
            for pattern in EXCEPTION_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    exceptions.append(line)
                    break
            else:
                for pattern in WARNING_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        warnings.append(line)
                        break

    # Deduplicate while preserving order
    return (
        list(dict.fromkeys(fatals)),
        list(dict.fromkeys(exceptions)),
        list(dict.fromkeys(warnings)),
    )


def format_error_report(errors: List[str], max_show: int = 20) -> str:
    """Format error list for assertion message."""
    if not errors:
        return '  (none)'
    shown = errors[:max_show]
    lines = [f'  [{i+1}] {e[:200]}' for i, e in enumerate(shown)]
    if len(errors) > max_show:
        lines.append(f'  ... and {len(errors) - max_show} more')
    return '\n'.join(lines)


@pytest.fixture(scope='module')
def log_baselines(api_client):
    """Record current log positions as baseline.

    In a full test session, the baseline should be set at session start
    (see session_log_baseline fixture). This module-level fixture is a
    fallback for standalone execution.
    """
    baselines = {}
    for name, path in LOG_FILES.items():
        baselines[name] = get_log_line_count(api_client, path)
        print(f"  Log baseline — {name}: line {baselines[name]}")
    return baselines


class TestLogAnalysis:
    """Post-test analysis of system and PHP logs"""

    def test_01_no_php_fatal_errors(self, api_client, log_baselines):
        """Verify no PHP Fatal errors occurred during test session.

        Fatal errors indicate broken code paths: missing files,
        class not found, out of memory, etc.
        """
        all_fatals = []

        for name, path in LOG_FILES.items():
            baseline = log_baselines.get(name, 0)
            log_text = get_new_log_lines(api_client, path, baseline)
            fatals, _, _ = categorize_errors(log_text)

            for f in fatals:
                all_fatals.append(f'[{name}] {f}')

        print(f"\n  PHP Fatal errors found: {len(all_fatals)}")

        if all_fatals:
            report = format_error_report(all_fatals)
            pytest.fail(
                f"PHP Fatal errors detected during test session "
                f"({len(all_fatals)} total):\n{report}\n\n"
                f"These indicate broken system components that need investigation."
            )

    def test_02_no_uncaught_exceptions(self, api_client, log_baselines):
        """Verify no uncaught PHP exceptions during test session.

        Uncaught exceptions in workers (S3Upload, Wav2Webm, CDR)
        indicate runtime failures that API endpoints don't report.
        """
        all_exceptions = []

        for name, path in LOG_FILES.items():
            baseline = log_baselines.get(name, 0)
            log_text = get_new_log_lines(api_client, path, baseline)
            _, exceptions, _ = categorize_errors(log_text)

            for e in exceptions:
                all_exceptions.append(f'[{name}] {e}')

        print(f"\n  Uncaught exceptions found: {len(all_exceptions)}")

        if all_exceptions:
            report = format_error_report(all_exceptions)
            pytest.fail(
                f"Uncaught exceptions detected during test session "
                f"({len(all_exceptions)} total):\n{report}\n\n"
                f"Background workers may be failing silently."
            )

    def test_03_no_missing_vendor_files(self, api_client, log_baselines):
        """Specifically check for 'Failed to open stream' errors.

        These indicate missing vendor/composer files — a packaging
        regression that breaks features silently.
        Known case: aws-sdk-php/src/DefaultsMode/ConfigurationProvider.php
        """
        missing_files = []

        for name, path in LOG_FILES.items():
            baseline = log_baselines.get(name, 0)
            log_text = get_new_log_lines(api_client, path, baseline)

            for line in log_text.split('\n'):
                if 'Failed to open stream: No such file or directory' in line:
                    # Extract the missing file path
                    match = re.search(r'include\(([^)]+)\)', line)
                    file_path = match.group(1) if match else 'unknown'
                    if file_path not in [f for f, _ in missing_files]:
                        missing_files.append((file_path, line.strip()[:200]))

        print(f"\n  Missing vendor files: {len(missing_files)}")

        if missing_files:
            details = '\n'.join(
                f'  [{i+1}] {path}' for i, (path, _) in enumerate(missing_files)
            )
            pytest.fail(
                f"Missing vendor/library files detected ({len(missing_files)}):\n"
                f"{details}\n\n"
                f"Run: composer install --no-dev inside the container."
            )

    def test_04_no_failed_conversion_tasks(self, api_client):
        """Check for .failed.json files in conversion-tasks directory.

        Each .failed.json represents a call recording that could not
        be converted from wav to webm. Common causes:
        - ffmpeg without libopus encoder
        - Corrupted source audio
        - Disk full
        """
        result = exec_bash(
            api_client,
            f'find {CONVERSION_TASKS_DIR} -name "*.failed.json" -type f '
            f'-newer /tmp/.mikopbx_test_start 2>/dev/null | head -20; '
            f'echo "---"; '
            f'find {CONVERSION_TASKS_DIR} -name "*.failed.json" -type f '
            f'-newer /tmp/.mikopbx_test_start 2>/dev/null | wc -l'
        )

        output = result['output'].strip()
        parts = output.split('---')

        # If no marker file, fall back to checking all recent failed tasks
        if len(parts) >= 2:
            count = int(parts[1].strip())
        else:
            # Fallback: check all failed tasks
            result2 = exec_bash(
                api_client,
                f'ls -1 {CONVERSION_TASKS_DIR}/*.failed.json 2>/dev/null | wc -l'
            )
            count = int(result2['output'].strip())

        print(f"\n  Failed conversion tasks: {count}")

        if count > 0:
            # Get details of first few failures
            detail_result = exec_bash(
                api_client,
                f'for f in $(ls {CONVERSION_TASKS_DIR}/*.failed.json 2>/dev/null | head -3); do '
                f'echo "=== $f ==="; cat "$f" | head -20; echo; done'
            )
            details = detail_result['output'].strip()

            # This is a warning, not a hard fail — old failures may pre-exist.
            # But we log it prominently for investigation.
            print(f"\n  ATTENTION: {count} failed conversion task(s) found.")
            print(f"  Sample details:\n{details}")

            # Check if any contain error_code 3 (encoder issue)
            if '"last_error_code": 3' in details or '"last_error_code":3' in details:
                pytest.fail(
                    f"{count} conversion tasks failed with error_code:3 "
                    f"(encoder failure).\n"
                    f"This typically means ffmpeg lacks libopus support.\n"
                    f"Details:\n{details}"
                )

    def test_05_php_warnings_summary(self, api_client, log_baselines):
        """Report PHP warnings (non-blocking, informational).

        Warnings don't fail the test but are printed for visibility.
        Consistent warnings may indicate degraded functionality.
        """
        all_warnings = []

        for name, path in LOG_FILES.items():
            baseline = log_baselines.get(name, 0)
            log_text = get_new_log_lines(api_client, path, baseline)
            _, _, warnings = categorize_errors(log_text)

            for w in warnings:
                all_warnings.append(f'[{name}] {w}')

        # Deduplicate
        unique_warnings = list(dict.fromkeys(all_warnings))

        print(f"\n  PHP warnings found: {len(unique_warnings)}")

        if unique_warnings:
            for i, w in enumerate(unique_warnings[:10]):
                print(f"  [{i+1}] {w[:150]}")
            if len(unique_warnings) > 10:
                print(f"  ... and {len(unique_warnings) - 10} more")
        else:
            print(f"  No PHP warnings detected during test session.")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
