#!/usr/bin/env python3
"""
CDR Database Seeder - Remote Execution Wrapper

This wrapper executes CDR seeding on MikoPBX station (container, remote machine, or cloud)
by invoking the bash script via docker exec, SSH, or other remote execution methods.

This approach works regardless of where MikoPBX is running and handles container restarts.

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
    - SSH: Uses SSH to run script on remote machine
    - Local: Executes script directly

    Environment Variables:
        MIKOPBX_CONTAINER     - Docker container name (default: mikopbx_php83)
        MIKOPBX_SSH_HOST      - SSH hostname for remote execution
        MIKOPBX_SSH_USER      - SSH username (default: root)
        MIKOPBX_EXECUTION_MODE - Force execution mode: docker|ssh|local
        ENABLE_CDR_SEED       - Enable/disable seeding (default: 1)
        ENABLE_CDR_CLEANUP    - Enable/disable cleanup (default: 1)
    """

    def __init__(self):
        # Execution mode detection
        self.container_name = os.getenv('MIKOPBX_CONTAINER', 'mikopbx_php83')
        self.ssh_host = os.getenv('MIKOPBX_SSH_HOST')
        self.ssh_user = os.getenv('MIKOPBX_SSH_USER', 'root')
        self.execution_mode = os.getenv('MIKOPBX_EXECUTION_MODE', self._detect_mode())

        # Script path on station
        # Path priorities:
        # 1. Docker containers: /usr/www/tests/api/scripts/seed_cdr_database.sh (synced from host)
        # 2. Remote/VM hosts: /storage/usbdisk1/mikopbx/python-tests/scripts/seed_cdr_database.sh
        if self.execution_mode == 'ssh':
            # Remote execution via SSH - use persistent storage path
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
                # If hostname is not localhost/127.0.0.1, assume remote via SSH
                if hostname not in ['localhost', '127.0.0.1', '::1'] and not hostname.endswith('.localhost'):
                    # Remote host detected - use SSH mode
                    # Extract hostname as ssh_host if not explicitly set
                    if not self.ssh_host:
                        self.ssh_host = hostname
                    return 'ssh'

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

        elif self.execution_mode == 'ssh':
            # Execute via SSH
            cmd = ['ssh', f'{self.ssh_user}@{self.ssh_host}', command]

        else:  # local
            # Execute directly
            cmd = ['bash', '-c', command]

        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=dict(os.environ)  # Use current environment (OrbStack sets DOCKER_HOST)
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
            result = self._execute_command(f'{self.script_path} seed')

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
            result = self._execute_command(f'{self.script_path} cleanup')

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
            result = self._execute_command(f'{self.script_path} verify', timeout=10)

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
            result = self._execute_command(f'{self.script_path} ids', timeout=10)

            if result.returncode == 0:
                # Parse output - one ID per line
                return [int(line.strip()) for line in result.stdout.strip().split('\n') if line.strip()]
            return []
        except Exception:
            return []


# For backward compatibility with existing code
CDRSeeder = CDRSeederRemote


if __name__ == '__main__':
    print("CDR Seeder - Remote Execution Wrapper")
    print(f"\nExecution mode: {CDRSeederRemote()._detect_mode()}")
    print("\nUsage:")
    print("  from helpers.cdr_seeder_remote import CDRSeederRemote")
    print("  seeder = CDRSeederRemote()")
    print("  seeder.seed()")
    print("  seeder.cleanup()")
