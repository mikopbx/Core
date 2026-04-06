#!/usr/bin/env python3
"""
CDR Database Seeder - Remote Execution Wrapper

This wrapper executes CDR seeding on MikoPBX station (container, remote machine, or cloud)
by invoking the bash script via docker exec, REST API, SSH, or other remote execution methods.

This approach works regardless of where MikoPBX is running and handles container restarts.

Execution modes:
- docker: Execute via 'docker exec' for local containers
- api: Execute via REST API /pbxcore/api/v3/system:executeBashCommand for remote hosts
- ssh: Execute via SSH for remote hosts (fallback when MIKOPBX_SSH_HOST is set)
- local: Execute directly on local filesystem

Usage:
    from helpers.cdr_seeder_remote import CDRSeederRemote

    # In conftest.py
    @pytest.fixture(scope="session", autouse=True)
    def seed_cdr_database():
        seeder = CDRSeederRemote()
        seeder.seed()
        yield
        seeder.cleanup()
"""

import os
import subprocess
from typing import List, Optional


class CDRSeederRemote:
    """
    Remote CDR database seeder that executes bash script on MikoPBX station

    This class detects the execution environment and uses the appropriate method:
    - Docker: Uses 'docker exec' to run script inside container
    - REST API: Uses REST API system:executeBashCommand for remote hosts (primary method)
    - SSH: Uses SSH to run script on remote machine (fallback method)
    - Local: Executes script directly

    Environment Variables:
        MIKOPBX_API_URL       - MikoPBX API URL (used to detect remote execution via API)
        MIKOPBX_API_USERNAME  - API login (default: admin)
        MIKOPBX_API_PASSWORD  - API password (default: admin)
        MIKOPBX_CONTAINER     - Docker container name (default: mikopbx-php83)
        MIKOPBX_SSH_HOST      - SSH hostname for remote execution (forces SSH mode)
        MIKOPBX_SSH_USER      - SSH username (default: root)
        MIKOPBX_EXECUTION_MODE - Force execution mode: docker|api|ssh|local
        ENABLE_CDR_SEED       - Enable/disable seeding (default: 1)
        ENABLE_CDR_CLEANUP    - Enable/disable cleanup (default: 1)
    """

    def __init__(self):
        # Execution mode detection
        self.container_name = os.getenv('MIKOPBX_CONTAINER', 'mikopbx-php83')
        self.ssh_host = os.getenv('MIKOPBX_SSH_HOST')
        self.ssh_user = os.getenv('MIKOPBX_SSH_USER', 'root')
        self.execution_mode = os.getenv('MIKOPBX_EXECUTION_MODE', self._detect_mode())

        # API configuration for REST API execution
        self.api_base_url = os.getenv('MIKOPBX_API_URL', '')
        self.api_login = os.getenv('MIKOPBX_API_USERNAME', 'admin')
        self.api_password = os.getenv('MIKOPBX_API_PASSWORD', 'admin')

        # Script path on station
        # Path priorities:
        # 1. Docker containers: /usr/www/tests/api/scripts/seed_cdr_database.sh (synced from host)
        # 2. Remote/VM hosts: /storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh
        # 3. REST API execution: /storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh
        if self.execution_mode in ['ssh', 'api']:
            # Remote execution via SSH or REST API - use persistent storage path
            self.script_path = '/storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh'
        else:
            # Docker/local execution - use synced test directory
            self.script_path = '/usr/www/tests/api/scripts/seed_cdr_database.sh'

    def _detect_mode(self) -> str:
        """Auto-detect execution mode"""
        if self.ssh_host:
            return 'ssh'

        # Check if MIKOPBX_API_URL points to remote host (not localhost/127.0.0.1)
        api_url = os.getenv('MIKOPBX_API_URL', '')
        if api_url:
            # Extract hostname from URL
            import re
            hostname_match = re.search(r'://([^:/]+)', api_url)
            if hostname_match:
                hostname = hostname_match.group(1)
                # If hostname is not localhost/127.0.0.1, use REST API mode (not SSH)
                if hostname not in ['localhost', '127.0.0.1', '::1'] and not hostname.endswith('.localhost'):
                    # Remote host detected - use REST API mode instead of SSH
                    return 'api'

        # Check if docker/orbstack is available and container exists
        try:
            result = subprocess.run(
                ['docker', 'ps', '-q', '-f', f'name={self.container_name}'],
                capture_output=True,
                timeout=5,
                env=dict(os.environ)  # Use current environment (OrbStack sets DOCKER_HOST)
            )
            if result.returncode == 0 and result.stdout.strip():
                return 'docker'
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        return 'local'

    def _execute_command(self, command: str, timeout: int = 120) -> subprocess.CompletedProcess:
        """Execute command on MikoPBX station"""
        if self.execution_mode == 'docker':
            # Execute via docker exec (works with both Docker and OrbStack)
            cmd = ['docker', 'exec', self.container_name, 'bash', '-c', command]
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=dict(os.environ)  # Use current environment (OrbStack sets DOCKER_HOST)
            )

        elif self.execution_mode == 'api':
            # Execute via REST API /pbxcore/api/v3/system:executeBashCommand
            return self._execute_via_api(command, timeout)

        elif self.execution_mode == 'ssh':
            # Execute via SSH
            cmd = ['ssh', f'{self.ssh_user}@{self.ssh_host}', command]
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=dict(os.environ)
            )

        else:  # local
            # Execute directly
            cmd = ['bash', '-c', command]
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=dict(os.environ)
            )

    def _execute_via_api(self, command: str, timeout: int = 60) -> subprocess.CompletedProcess:
        """
        Execute command via REST API system:executeBashCommand endpoint

        Returns subprocess.CompletedProcess-compatible object for consistency
        """
        import requests
        import time
        from collections import namedtuple

        # Create a CompletedProcess-like result object
        CompletedProcessLike = namedtuple('CompletedProcessLike', ['returncode', 'stdout', 'stderr'])

        # Enable verbose diagnostics for debugging TeamCity issues
        verbose = os.getenv('CDR_SEEDER_VERBOSE', '1') == '1'

        def log_diag(msg: str):
            """Print diagnostic message if verbose mode enabled"""
            if verbose:
                print(f"[CDR-DIAG] {msg}")

        try:
            log_diag("=" * 60)
            log_diag("Starting API execution diagnostics")
            log_diag("=" * 60)
            log_diag(f"API Base URL: {self.api_base_url}")
            log_diag(f"Command length: {len(command)} chars")
            log_diag(f"Timeout: {timeout} seconds")

            # Step 1: Network connectivity check
            step1_start = time.time()
            log_diag("")
            log_diag("STEP 1: Network connectivity check")
            try:
                # Extract host from URL for connectivity check
                import re
                hostname_match = re.search(r'://([^:/]+)', self.api_base_url)
                if hostname_match:
                    host = hostname_match.group(1)
                    log_diag(f"  Target host: {host}")

                    # Quick TCP check to port 443
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(5)
                    try:
                        result = sock.connect_ex((host, 443))
                        if result == 0:
                            log_diag(f"  ✓ Port 443 is reachable")
                        else:
                            log_diag(f"  ✗ Port 443 unreachable (error code: {result})")
                    finally:
                        sock.close()
            except Exception as e:
                log_diag(f"  ⚠ Connectivity check failed: {e}")
            step1_time = time.time() - step1_start
            log_diag(f"  Step 1 completed in {step1_time:.2f}s")

            # Step 2: Authentication
            step2_start = time.time()
            log_diag("")
            log_diag("STEP 2: Authentication")

            # Try to authenticate with configured password first, then try alternative passwords
            passwords_to_try = [self.api_password]
            # Add alternative passwords if not already in list
            if 'admin' not in passwords_to_try:
                passwords_to_try.append('admin')
            if '123456789MikoPBX#1' not in passwords_to_try:
                passwords_to_try.append('123456789MikoPBX#1')

            access_token = None
            auth_url = f'{self.api_base_url}/auth:login'
            last_error = None
            successful_password = None

            log_diag(f"  Auth URL: {auth_url}")
            log_diag(f"  Login: {self.api_login}")
            log_diag(f"  Passwords to try: {len(passwords_to_try)}")

            for idx, password in enumerate(passwords_to_try):
                masked_pwd = password[:2] + '*' * (len(password) - 4) + password[-2:] if len(password) > 4 else '****'
                log_diag(f"  Trying password {idx + 1}/{len(passwords_to_try)}: {masked_pwd}")

                auth_start = time.time()
                try:
                    auth_response = requests.post(
                        auth_url,
                        data={'login': self.api_login, 'password': password, 'rememberMe': 'true'},
                        headers={'Content-Type': 'application/x-www-form-urlencoded'},
                        timeout=10,
                        verify=False
                    )
                    auth_time = time.time() - auth_start

                    log_diag(f"    Response status: {auth_response.status_code}")
                    log_diag(f"    Response time: {auth_time:.2f}s")
                    log_diag(f"    Response size: {len(auth_response.text)} bytes")

                    if auth_response.status_code == 200:
                        auth_data = auth_response.json()
                        if auth_data.get('result'):
                            access_token = auth_data['data']['accessToken']
                            successful_password = masked_pwd
                            log_diag(f"    ✓ Authentication successful with password: {masked_pwd}")
                            log_diag(f"    Token length: {len(access_token)} chars")
                            break
                        else:
                            last_error = auth_data.get('messages', ['Unknown error'])
                            log_diag(f"    ✗ Auth failed: {last_error}")
                    else:
                        last_error = auth_response.text[:200]  # First 200 chars
                        log_diag(f"    ✗ HTTP error: {last_error}")

                except requests.exceptions.Timeout:
                    log_diag(f"    ✗ Auth request timed out after 10s")
                    last_error = "Authentication timeout"
                except Exception as e:
                    log_diag(f"    ✗ Auth request error: {e}")
                    last_error = str(e)

            step2_time = time.time() - step2_start
            log_diag(f"  Step 2 completed in {step2_time:.2f}s")

            if not access_token:
                log_diag("")
                log_diag("✗ AUTHENTICATION FAILED - cannot proceed")
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'Authentication failed with all passwords: {last_error}'
                )

            # Step 3: Execute bash command
            step3_start = time.time()
            log_diag("")
            log_diag("STEP 3: Execute bash command via API")

            exec_url = f'{self.api_base_url}/system:executeBashCommand'
            log_diag(f"  Exec URL: {exec_url}")
            log_diag(f"  Command (first 200 chars): {command[:200]}...")
            log_diag(f"  Server timeout: {timeout}s")
            log_diag(f"  HTTP timeout: {timeout + 5}s")

            try:
                exec_response = requests.post(
                    exec_url,
                    json={'command': command, 'timeout': timeout},
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=timeout + 5,  # HTTP timeout slightly longer than server timeout
                    verify=False
                )
                step3_time = time.time() - step3_start

                log_diag(f"  Response status: {exec_response.status_code}")
                log_diag(f"  Response time: {step3_time:.2f}s")
                log_diag(f"  Response size: {len(exec_response.text)} bytes")
                log_diag(f"  Response headers: {dict(exec_response.headers)}")

                if exec_response.status_code != 200:
                    log_diag(f"  ✗ HTTP error response (first 500 chars):")
                    log_diag(f"    {exec_response.text[:500]}")
                    return CompletedProcessLike(
                        returncode=1,
                        stdout='',
                        stderr=f'API request failed (HTTP {exec_response.status_code}): {exec_response.text[:500]}'
                    )

                result_data = exec_response.json()
                log_diag(f"  Response result: {result_data.get('result')}")

                # Extract output from API response
                if result_data.get('result') and 'data' in result_data:
                    data = result_data['data']
                    output = data.get('output', '')
                    exit_code = data.get('exitCode', 0)
                    log_diag(f"  ✓ Command executed successfully")
                    log_diag(f"  Exit code: {exit_code}")
                    log_diag(f"  Output length: {len(output)} chars")
                    log_diag(f"  Output (first 500 chars): {output[:500]}")
                    return CompletedProcessLike(
                        returncode=exit_code,
                        stdout=output,
                        stderr=''
                    )
                else:
                    error_msgs = result_data.get('messages', ['Unknown error'])
                    log_diag(f"  ✗ Command execution failed: {error_msgs}")
                    log_diag(f"  Full response: {result_data}")
                    return CompletedProcessLike(
                        returncode=1,
                        stdout='',
                        stderr=f'Command execution failed: {error_msgs}'
                    )

            except requests.exceptions.Timeout as e:
                step3_time = time.time() - step3_start
                log_diag(f"  ✗ TIMEOUT after {step3_time:.2f}s")
                log_diag(f"  Timeout exception: {e}")
                log_diag("")
                log_diag("TIMEOUT DIAGNOSTICS:")
                log_diag(f"  - HTTP client timeout was {timeout + 5}s")
                log_diag(f"  - Server-side timeout was {timeout}s")
                log_diag(f"  - Actual wait time: {step3_time:.2f}s")
                log_diag("  - This could be caused by:")
                log_diag("    1. Slow network between test runner and MikoPBX")
                log_diag("    2. Server overloaded or unresponsive")
                log_diag("    3. Bash command taking too long to execute")
                log_diag("    4. Network timeout/firewall issues")
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'Command execution timed out after {step3_time:.2f}s (limit: {timeout}s). '
                           f'Auth was successful with {successful_password}. Check server logs for details.'
                )

            except requests.exceptions.ConnectionError as e:
                step3_time = time.time() - step3_start
                log_diag(f"  ✗ CONNECTION ERROR after {step3_time:.2f}s")
                log_diag(f"  Error: {e}")
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'Connection error during command execution: {e}'
                )

        except Exception as e:
            import traceback
            log_diag(f"✗ UNEXPECTED ERROR: {e}")
            log_diag(f"Traceback: {traceback.format_exc()}")
            return CompletedProcessLike(
                returncode=1,
                stdout='',
                stderr=f'API execution error: {str(e)}\n{traceback.format_exc()}'
            )

    def seed(self) -> bool:
        """
        Seed CDR database with test data

        Returns:
            True if seeding successful, False otherwise
        """
        if os.getenv('ENABLE_CDR_SEED', '1') != '1':
            print("CDR seeding disabled (ENABLE_CDR_SEED=0)")
            return False

        try:
            # Print execution mode for debugging
            print(f"Execution mode: {self.execution_mode}")
            if self.execution_mode == 'api':
                print(f"Using REST API: {self.api_base_url}/system/executeBashCommand")

            # For API/SSH modes on remote hosts, ensure script is executable and set environment
            if self.execution_mode in ['api', 'ssh']:
                # Build command with chmod and environment variables
                command = f'''
chmod +x {self.script_path}
export ENABLE_CDR_SEED=1
export FIXTURES_DIR=/storage/usbdisk1/mikopbx/python-tests/fixtures
{self.script_path} seed
'''.strip()
            else:
                # Docker/local mode - use simple command
                command = f'{self.script_path} seed'

            result = self._execute_command(command)

            # Print script output
            if result.stdout:
                print(result.stdout)

            if result.returncode != 0:
                print(f"✗ Seeding failed: {result.stderr}")
                return False

            return True

        except subprocess.TimeoutExpired:
            print("✗ Seeding timed out after 120 seconds")
            return False
        except Exception as e:
            print(f"✗ Seeding failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def cleanup(self):
        """Clean up test CDR data and recording files"""
        if os.getenv('ENABLE_CDR_CLEANUP', '1') != '1':
            print("CDR cleanup disabled (ENABLE_CDR_CLEANUP=0)")
            return

        try:
            # For API/SSH modes on remote hosts, ensure script is executable
            if self.execution_mode in ['api', 'ssh']:
                command = f'chmod +x {self.script_path} && {self.script_path} cleanup'
            else:
                command = f'{self.script_path} cleanup'

            result = self._execute_command(command)

            if result.stdout:
                print(result.stdout)

            if result.returncode != 0:
                print(f"⚠ Cleanup warning: {result.stderr}")

        except Exception as e:
            print(f"⚠ Cleanup warning: {str(e)}")

    def verify(self) -> int:
        """
        Verify that test data exists

        Returns:
            Number of test CDR records in database
        """
        try:
            # For API/SSH modes on remote hosts, ensure script is executable
            if self.execution_mode in ['api', 'ssh']:
                command = f'chmod +x {self.script_path} && {self.script_path} verify'
            else:
                command = f'{self.script_path} verify'

            result = self._execute_command(command, timeout=10)

            if result.returncode == 0:
                return int(result.stdout.strip())
            return 0
        except Exception:
            return 0

    def get_test_cdr_ids(self) -> List[int]:
        """
        Get list of test CDR IDs

        Returns:
            List of CDR IDs (1-30)
        """
        try:
            # For API/SSH modes on remote hosts, ensure script is executable
            if self.execution_mode in ['api', 'ssh']:
                command = f'chmod +x {self.script_path} && {self.script_path} ids'
            else:
                command = f'{self.script_path} ids'

            result = self._execute_command(command, timeout=10)

            if result.returncode == 0:
                # Parse output - one ID per line
                return [int(line.strip()) for line in result.stdout.strip().split('\n') if line.strip()]
            return []
        except Exception:
            return []

    def get_server_log(self, lines: int = 100) -> str:
        """
        Get server-side CDR seeder log for debugging

        This is useful when API execution times out - we can check
        what happened on the server side.

        Args:
            lines: Number of log lines to retrieve (default: 100)

        Returns:
            Log content or error message
        """
        log_path = '/storage/usbdisk1/mikopbx/log/cdr_seeder.log'

        try:
            command = f'tail -n {lines} {log_path} 2>/dev/null || echo "Log file not found: {log_path}"'
            result = self._execute_command(command, timeout=10)

            if result.returncode == 0:
                return result.stdout
            return f"Failed to read log: {result.stderr}"
        except Exception as e:
            return f"Error reading log: {e}"

    def diagnose_failure(self) -> str:
        """
        Comprehensive failure diagnosis

        Call this after a failed seed() to get detailed diagnostics.
        Collects server log, script existence check, permissions, etc.

        Returns:
            Diagnostic report as string
        """
        report = []
        report.append("=" * 60)
        report.append("CDR SEEDER FAILURE DIAGNOSIS")
        report.append("=" * 60)
        report.append(f"Execution mode: {self.execution_mode}")
        report.append(f"Script path: {self.script_path}")
        report.append(f"API URL: {self.api_base_url}")
        report.append("")

        # Check if script exists
        report.append("--- Script Check ---")
        try:
            check_cmd = f'ls -la {self.script_path} 2>&1; file {self.script_path} 2>&1'
            result = self._execute_command(check_cmd, timeout=10)
            report.append(result.stdout if result.stdout else result.stderr)
        except Exception as e:
            report.append(f"Script check failed: {e}")

        # Check fixtures directory
        report.append("")
        report.append("--- Fixtures Check ---")
        try:
            fixtures_dir = '/storage/usbdisk1/mikopbx/python-tests/fixtures'
            check_cmd = f'ls -la {fixtures_dir}/ 2>&1 | head -10'
            result = self._execute_command(check_cmd, timeout=10)
            report.append(result.stdout if result.stdout else result.stderr)
        except Exception as e:
            report.append(f"Fixtures check failed: {e}")

        # Check CDR database
        report.append("")
        report.append("--- CDR Database Check ---")
        try:
            db_path = '/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db'
            check_cmd = f'ls -la {db_path} 2>&1; sqlite3 {db_path} "SELECT COUNT(*) FROM cdr_general;" 2>&1'
            result = self._execute_command(check_cmd, timeout=10)
            report.append(result.stdout if result.stdout else result.stderr)
        except Exception as e:
            report.append(f"DB check failed: {e}")

        # Get server log
        report.append("")
        report.append("--- Server Log (last 50 lines) ---")
        report.append(self.get_server_log(50))

        report.append("")
        report.append("=" * 60)

        return "\n".join(report)


# For backward compatibility with existing code
CDRSeeder = CDRSeederRemote


if __name__ == '__main__':
    print("CDR Seeder - Remote Execution Wrapper")
    seeder = CDRSeederRemote()
    print(f"\nExecution mode: {seeder.execution_mode}")
    print(f"Script path: {seeder.script_path}")
    if seeder.execution_mode == 'api':
        print(f"API URL: {seeder.api_base_url}")
    elif seeder.execution_mode == 'docker':
        print(f"Container: {seeder.container_name}")
    elif seeder.execution_mode == 'ssh':
        print(f"SSH host: {seeder.ssh_user}@{seeder.ssh_host}")
    print("\nUsage:")
    print("  from helpers.cdr_seeder_remote import CDRSeederRemote")
    print("  seeder = CDRSeederRemote()")
    print("  seeder.seed()")
    print("  seeder.cleanup()")
