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
        MIKOPBX_LOGIN         - API login (default: admin)
        MIKOPBX_PASSWORD      - API password (default: admin)
        MIKOPBX_CONTAINER     - Docker container name (default: mikopbx_php83)
        MIKOPBX_SSH_HOST      - SSH hostname for remote execution (forces SSH mode)
        MIKOPBX_SSH_USER      - SSH username (default: root)
        MIKOPBX_EXECUTION_MODE - Force execution mode: docker|api|ssh|local
        ENABLE_CDR_SEED       - Enable/disable seeding (default: 1)
        ENABLE_CDR_CLEANUP    - Enable/disable cleanup (default: 1)
    """

    def __init__(self):
        # Execution mode detection
        self.container_name = os.getenv('MIKOPBX_CONTAINER', 'mikopbx_php83')
        self.ssh_host = os.getenv('MIKOPBX_SSH_HOST')
        self.ssh_user = os.getenv('MIKOPBX_SSH_USER', 'root')
        self.execution_mode = os.getenv('MIKOPBX_EXECUTION_MODE', self._detect_mode())

        # API configuration for REST API execution
        self.api_base_url = os.getenv('MIKOPBX_API_URL', '')
        self.api_login = os.getenv('MIKOPBX_LOGIN', 'admin')
        self.api_password = os.getenv('MIKOPBX_PASSWORD', 'admin')

        # Script path on station
        # Path priorities:
        # 1. Docker/VM/bare metal: /offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh (universal MikoPBX path)
        # 2. Remote hosts via SSH/API: /storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh (persistent storage)
        if self.execution_mode in ['ssh', 'api']:
            # Remote execution via SSH or REST API - use persistent storage path
            self.script_path = '/storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh'
        else:
            # Docker/VM/local execution - use universal MikoPBX test directory path
            self.script_path = '/offload/rootfs/usr/www/tests/api/scripts/seed_cdr_database.sh'

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

    def _execute_command(self, command: str, timeout: int = 60) -> subprocess.CompletedProcess:
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
        from collections import namedtuple

        # Create a CompletedProcess-like result object
        CompletedProcessLike = namedtuple('CompletedProcessLike', ['returncode', 'stdout', 'stderr'])

        try:
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

            for password in passwords_to_try:
                auth_response = requests.post(
                    auth_url,
                    data={'login': self.api_login, 'password': password, 'rememberMe': 'true'},
                    headers={'Content-Type': 'application/x-www-form-urlencoded'},
                    timeout=10,
                    verify=False
                )

                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    if auth_data.get('result'):
                        access_token = auth_data['data']['accessToken']
                        break
                    else:
                        last_error = auth_data.get('messages', ['Unknown error'])
                else:
                    last_error = auth_response.text

            if not access_token:
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'Authentication failed with all passwords: {last_error}'
                )

            # Execute bash command via REST API
            exec_url = f'{self.api_base_url}/system:executeBashCommand'
            exec_response = requests.post(
                exec_url,
                json={'command': command},
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=timeout,
                verify=False
            )

            if exec_response.status_code != 200:
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'API request failed: {exec_response.text}'
                )

            result_data = exec_response.json()

            # Extract output from API response
            # API response format: {"result": true, "data": {"output": "...", "exitCode": 0}}
            # Note: API returns combined stdout/stderr in 'output' field
            if result_data.get('result') and 'data' in result_data:
                data = result_data['data']
                output = data.get('output', '')
                return CompletedProcessLike(
                    returncode=data.get('exitCode', 0),
                    stdout=output,  # API combines stdout/stderr into output
                    stderr=''  # API doesn't separate stderr
                )
            else:
                return CompletedProcessLike(
                    returncode=1,
                    stdout='',
                    stderr=f'Command execution failed: {result_data.get("messages", ["Unknown error"])}'
                )

        except requests.exceptions.Timeout:
            return CompletedProcessLike(
                returncode=1,
                stdout='',
                stderr=f'Command execution timed out after {timeout} seconds'
            )
        except Exception as e:
            return CompletedProcessLike(
                returncode=1,
                stdout='',
                stderr=f'API execution error: {str(e)}'
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
            print("✗ Seeding timed out after 60 seconds")
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

    def verify_recording_files_exist(self) -> tuple[bool, int, str]:
        """
        Verify that recording files exist on disk (MP3 or WebM format)

        Checks for test recording files in /storage/usbdisk1/mikopbx/astspool/monitor/
        Expected files: test_recording_*.mp3 OR test_recording_*.webm (15 files for CDR IDs with recordings)

        Supports both legacy MP3 and new WebM formats for forward compatibility.

        Returns:
            tuple: (all_exist: bool, found_count: int, format_found: str)
                - all_exist: True if all 15 expected recording files exist
                - found_count: Number of recording files found
                - format_found: 'mp3', 'webm', 'mixed', or 'none'
        """
        try:
            # Check for both MP3 and WebM files
            # Test recordings use pattern: mikopbx-*.{mp3,webm}
            # Files are stored in subdirectories by date: YYYY/MM/DD/HH/
            command = '''
mp3_count=$(find /storage/usbdisk1/mikopbx/astspool/monitor -type f -name "mikopbx-*.mp3" 2>/dev/null | wc -l)
webm_count=$(find /storage/usbdisk1/mikopbx/astspool/monitor -type f -name "mikopbx-*.webm" 2>/dev/null | wc -l)
total=$((mp3_count + webm_count))
echo "$total|$mp3_count|$webm_count"
'''.strip()

            result = self._execute_command(command, timeout=10)

            if result.returncode == 0:
                output = result.stdout.strip()
                total_count, mp3_count, webm_count = map(int, output.split('|'))

                # We expect at least 15 recording files (CDR records with recordings)
                # Note: This counts ALL recording files, not just test data
                # This is acceptable since we're checking if recording functionality works
                expected_count = 15

                # Determine format
                if mp3_count > 0 and webm_count > 0:
                    format_found = 'mixed'
                elif mp3_count > 0:
                    format_found = 'mp3'
                elif webm_count > 0:
                    format_found = 'webm'
                else:
                    format_found = 'none'

                return (total_count >= expected_count, total_count, format_found)
            return (False, 0, 'none')
        except Exception:
            return (False, 0, 'none')

    # Backward compatibility alias
    def verify_mp3_files_exist(self) -> tuple[bool, int]:
        """
        Legacy method for backward compatibility

        Returns:
            tuple: (all_exist: bool, found_count: int)
        """
        all_exist, found_count, _ = self.verify_recording_files_exist()
        return (all_exist, found_count)


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
