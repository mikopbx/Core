#!/usr/bin/env python3
"""
Test Runner Helper for test-fix-loop-agent

This helper script facilitates automated test execution with log monitoring
for the test-fix-loop-agent. It provides utilities to:
- Run pytest tests and capture results
- Monitor Docker container logs during test execution
- Extract error information from logs
- Provide structured output for the agent

Usage:
    from helpers.test_runner import TestRunner

    runner = TestRunner()
    result = runner.run_tests()
    errors = runner.get_recent_errors()
"""

import subprocess
import sys
import os
import re
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from pathlib import Path


class TestRunner:
    """Helper class for running tests and analyzing logs"""

    def __init__(self, container_name: str = 'mikopbx-php83'):
        """
        Initialize test runner

        Args:
            container_name: Docker container name (default: mikopbx-php83)
        """
        self.container_name = container_name
        self.container_id = self._get_container_id()
        self.test_start_time = None
        self.test_end_time = None

    def _get_container_id(self) -> Optional[str]:
        """Get Docker container ID"""
        try:
            result = subprocess.run(
                ['docker', 'ps', '--filter', f'name={self.container_name}', '--format', '{{.ID}}'],
                capture_output=True,
                text=True,
                check=True
            )
            container_id = result.stdout.strip()
            if container_id:
                return container_id
            else:
                print(f"⚠️  Container '{self.container_name}' not found", file=sys.stderr)
                return None
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to get container ID: {e}", file=sys.stderr)
            return None

    def run_tests(
        self,
        test_path: str = '.',
        pytest_args: Optional[List[str]] = None,
        verbose: bool = True
    ) -> Dict:
        """
        Run pytest tests and capture results

        Args:
            test_path: Path to tests (default: current directory)
            pytest_args: Additional pytest arguments (e.g., ['-k', 'auth'])
            verbose: Enable verbose output

        Returns:
            Dictionary with test results:
            {
                'exit_code': int,
                'passed': int,
                'failed': int,
                'skipped': int,
                'errors': int,
                'duration': float,
                'stdout': str,
                'stderr': str,
                'start_time': str,
                'end_time': str
            }
        """
        # Build pytest command
        cmd = ['pytest', test_path]

        if verbose:
            cmd.append('-v')

        cmd.extend(['--tb=short', '-ra'])

        if pytest_args:
            cmd.extend(pytest_args)

        # Record start time
        self.test_start_time = datetime.now()

        print(f"🔄 Running tests: {' '.join(cmd)}")
        print(f"⏱️  Start time: {self.test_start_time.strftime('%H:%M:%S')}")

        # Run pytest
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent  # tests/api directory
            )
        except Exception as e:
            print(f"❌ Failed to run tests: {e}", file=sys.stderr)
            return {
                'exit_code': -1,
                'passed': 0,
                'failed': 0,
                'skipped': 0,
                'errors': 1,
                'duration': 0.0,
                'stdout': '',
                'stderr': str(e),
                'start_time': self.test_start_time.isoformat(),
                'end_time': datetime.now().isoformat()
            }

        # Record end time
        self.test_end_time = datetime.now()
        duration = (self.test_end_time - self.test_start_time).total_seconds()

        print(f"⏱️  End time: {self.test_end_time.strftime('%H:%M:%S')}")
        print(f"⏱️  Duration: {duration:.1f}s")

        # Parse results from pytest output
        results = self._parse_pytest_output(result.stdout)
        results.update({
            'exit_code': result.returncode,
            'duration': duration,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'start_time': self.test_start_time.isoformat(),
            'end_time': self.test_end_time.isoformat()
        })

        # Print summary
        print(f"\n📊 TEST RESULTS")
        print(f"   Exit Code: {results['exit_code']}")
        print(f"   Passed: {results['passed']}")
        print(f"   Failed: {results['failed']}")
        print(f"   Skipped: {results['skipped']}")
        print(f"   Errors: {results['errors']}")

        return results

    def _parse_pytest_output(self, output: str) -> Dict:
        """
        Parse pytest output to extract test counts

        Args:
            output: Pytest stdout

        Returns:
            Dictionary with test counts
        """
        results = {
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'errors': 0
        }

        # Look for pytest summary line
        # Example: "= 10 passed, 2 failed, 1 skipped in 5.23s ="
        summary_pattern = r'(\d+)\s+passed|(\d+)\s+failed|(\d+)\s+skipped|(\d+)\s+error'
        matches = re.findall(summary_pattern, output)

        for match in matches:
            passed, failed, skipped, errors = match
            if passed:
                results['passed'] = int(passed)
            if failed:
                results['failed'] = int(failed)
            if skipped:
                results['skipped'] = int(skipped)
            if errors:
                results['errors'] = int(errors)

        return results

    def get_failed_tests(self, stdout: str) -> List[Dict]:
        """
        Extract failed test information from pytest output

        Args:
            stdout: Pytest stdout

        Returns:
            List of failed tests with details
        """
        failed_tests = []

        # Pattern for failed test lines
        # Example: "FAILED test_file.py::TestClass::test_method - AssertionError: ..."
        failed_pattern = r'FAILED\s+([\w/.]+::\S+)\s+-\s+(.+?)(?=\n|$)'
        matches = re.finditer(failed_pattern, stdout, re.MULTILINE)

        for match in matches:
            test_name = match.group(1)
            error_msg = match.group(2).strip()

            failed_tests.append({
                'test': test_name,
                'error': error_msg
            })

        return failed_tests

    def get_recent_errors(
        self,
        lines: int = 500,
        since_test_start: bool = True
    ) -> Dict[str, List[str]]:
        """
        Get recent errors from container logs

        Args:
            lines: Number of log lines to check
            since_test_start: Only get errors since test start time

        Returns:
            Dictionary with error lists by log type:
            {
                'system_errors': [...],
                'php_errors': [...],
                'exceptions': [...]
            }
        """
        if not self.container_id:
            print("⚠️  No container ID available", file=sys.stderr)
            return {'system_errors': [], 'php_errors': [], 'exceptions': []}

        errors = {
            'system_errors': [],
            'php_errors': [],
            'exceptions': []
        }

        # Check system log
        print(f"🔍 Checking system log (last {lines} lines)...")
        system_errors = self._get_log_errors(
            '/storage/usbdisk1/mikopbx/log/system/messages',
            lines
        )
        errors['system_errors'] = system_errors

        # Check PHP error log
        print(f"🔍 Checking PHP error log (last {lines} lines)...")
        php_errors = self._get_log_errors(
            '/storage/usbdisk1/mikopbx/log/php/error.log',
            lines
        )
        errors['php_errors'] = php_errors

        # Extract exceptions from system log
        print(f"🔍 Extracting exceptions from logs...")
        exceptions = self._extract_exceptions(system_errors + php_errors)
        errors['exceptions'] = exceptions

        # Print summary
        print(f"\n🐛 ERRORS FOUND:")
        print(f"   System Errors: {len(errors['system_errors'])}")
        print(f"   PHP Errors: {len(errors['php_errors'])}")
        print(f"   Exceptions: {len(errors['exceptions'])}")

        return errors

    def _get_log_errors(self, log_path: str, lines: int) -> List[str]:
        """
        Get errors from a specific log file

        Args:
            log_path: Path to log file inside container
            lines: Number of lines to check

        Returns:
            List of error lines
        """
        try:
            # Tail log and grep for errors
            result = subprocess.run(
                [
                    'docker', 'exec', self.container_id,
                    'sh', '-c',
                    f'tail -{lines} {log_path} | grep -i error || true'
                ],
                capture_output=True,
                text=True,
                check=True
            )

            error_lines = [
                line.strip()
                for line in result.stdout.split('\n')
                if line.strip()
            ]

            return error_lines

        except subprocess.CalledProcessError as e:
            print(f"⚠️  Failed to read log {log_path}: {e}", file=sys.stderr)
            return []

    def _extract_exceptions(self, error_lines: List[str]) -> List[str]:
        """
        Extract exception information from error lines

        Args:
            error_lines: List of error log lines

        Returns:
            List of unique exceptions
        """
        exceptions = set()

        # Pattern for PHP exceptions
        exception_pattern = r'(Fatal error|Exception|Error):\s+(.+?)(?:\s+in\s+(.+?):(\d+))?'

        for line in error_lines:
            match = re.search(exception_pattern, line)
            if match:
                error_type = match.group(1)
                error_msg = match.group(2)
                file_path = match.group(3) if match.group(3) else 'unknown'
                line_num = match.group(4) if match.group(4) else 'unknown'

                exception_info = f"{error_type}: {error_msg} (at {file_path}:{line_num})"
                exceptions.add(exception_info)

        return sorted(list(exceptions))

    def check_workers(self) -> Dict[str, any]:
        """
        Check status of worker processes

        Returns:
            Dictionary with worker status:
            {
                'WorkerApiCommands': {'count': int, 'pids': [...]},
                'WorkerModelsEvents': {...},
                ...
            }
        """
        if not self.container_id:
            print("⚠️  No container ID available", file=sys.stderr)
            return {}

        try:
            result = subprocess.run(
                ['docker', 'exec', self.container_id, 'ps', 'aux'],
                capture_output=True,
                text=True,
                check=True
            )

            workers = {}
            worker_names = [
                'WorkerApiCommands',
                'WorkerModelsEvents',
                'WorkerCdr',
                'WorkerNotifyByEmail'
            ]

            for worker_name in worker_names:
                # Find processes matching worker name
                pids = []
                for line in result.stdout.split('\n'):
                    if worker_name in line and 'grep' not in line:
                        # Extract PID (second column)
                        parts = line.split()
                        if len(parts) > 1:
                            pids.append(parts[1])

                workers[worker_name] = {
                    'count': len(pids),
                    'pids': pids,
                    'status': '✅' if len(pids) > 0 else '❌'
                }

            # Print summary
            print(f"\n🔄 WORKER STATUS:")
            for name, info in workers.items():
                status_icon = info['status']
                print(f"   {status_icon} {name}: {info['count']} instances (PIDs: {', '.join(info['pids']) if info['pids'] else 'none'})")

            return workers

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to check workers: {e}", file=sys.stderr)
            return {}

    def restart_container(self) -> bool:
        """
        Restart Docker container

        Returns:
            True if restart successful, False otherwise
        """
        if not self.container_id:
            print("⚠️  No container ID available", file=sys.stderr)
            return False

        try:
            print(f"🔄 Restarting container {self.container_name}...")

            subprocess.run(
                ['docker', 'restart', self.container_id],
                check=True,
                capture_output=True
            )

            print("✅ Container restarted")

            # Wait for services to be ready
            import time
            print("⏳ Waiting for services to start (10s)...")
            time.sleep(10)

            # Verify workers started
            workers = self.check_workers()
            if workers.get('WorkerApiCommands', {}).get('count', 0) >= 1:
                print("✅ Workers started successfully")
                return True
            else:
                print("⚠️  Workers may not have started correctly", file=sys.stderr)
                return False

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to restart container: {e}", file=sys.stderr)
            return False


def main():
    """
    CLI interface for test runner

    Usage:
        python test_runner.py                    # Run all tests
        python test_runner.py -k auth            # Run auth tests
        python test_runner.py --check-logs       # Only check logs
        python test_runner.py --check-workers    # Only check workers
    """
    import argparse

    parser = argparse.ArgumentParser(description='MikoPBX Test Runner Helper')
    parser.add_argument('test_path', nargs='?', default='.', help='Path to tests')
    parser.add_argument('-k', '--keyword', help='Pytest keyword filter')
    parser.add_argument('--check-logs', action='store_true', help='Only check logs for errors')
    parser.add_argument('--check-workers', action='store_true', help='Only check worker status')
    parser.add_argument('--restart', action='store_true', help='Restart container')
    parser.add_argument('--lines', type=int, default=500, help='Number of log lines to check')
    parser.add_argument('--container', default='mikopbx-php83', help='Container name')

    args = parser.parse_args()

    runner = TestRunner(container_name=args.container)

    # Check workers only
    if args.check_workers:
        runner.check_workers()
        return

    # Restart container only
    if args.restart:
        success = runner.restart_container()
        sys.exit(0 if success else 1)

    # Check logs only
    if args.check_logs:
        errors = runner.get_recent_errors(lines=args.lines)
        if errors['system_errors'] or errors['php_errors']:
            print("\n❌ Errors found in logs")
            sys.exit(1)
        else:
            print("\n✅ No errors found in logs")
            sys.exit(0)

    # Run tests
    pytest_args = []
    if args.keyword:
        pytest_args.extend(['-k', args.keyword])

    result = runner.run_tests(
        test_path=args.test_path,
        pytest_args=pytest_args
    )

    # Check logs after tests
    if result['exit_code'] != 0:
        print("\n🔍 Checking logs for errors (tests failed)...")
        runner.get_recent_errors(lines=args.lines)

    # Check workers
    runner.check_workers()

    # Exit with pytest exit code
    sys.exit(result['exit_code'])


if __name__ == '__main__':
    main()
