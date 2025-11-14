#!/usr/bin/env python3
"""
Centralized configuration loader for MikoPBX REST API tests

This module provides a single source of truth for all test configuration,
supporting multiple deployment scenarios:
- Local Docker containers
- Remote virtual machines
- Cloud deployments
- SSH-accessible hosts

All configuration is loaded from .env file, with validation and helpful error messages.

Usage:
    from config import TestConfig

    config = TestConfig()

    # API configuration
    api_url = config.api_url
    username = config.api_username
    password = config.api_password

    # Execution configuration
    exec_mode = config.execution_mode
    container_name = config.container_name
    ssh_host = config.ssh_host

    # Database paths
    db_path = config.database_path
    cdr_db_path = config.cdr_database_path
"""

import os
from pathlib import Path
from typing import Optional, Literal
from dotenv import load_dotenv


class TestConfig:
    """
    Centralized test configuration loader

    This class loads all configuration from .env file and provides
    validated, typed access to configuration values.

    Environment Variables (all loaded from .env):

    API Configuration:
        MIKOPBX_API_URL       - MikoPBX REST API URL (required)
        MIKOPBX_API_USERNAME  - API username (default: admin)
        MIKOPBX_API_PASSWORD  - API password (required)

    Execution Mode:
        MIKOPBX_EXECUTION_MODE - Execution mode: docker|api|ssh|local (auto-detected if not set)
        MIKOPBX_CONTAINER      - Docker container name (default: mikopbx-php83)
        MIKOPBX_SSH_HOST       - SSH hostname for remote execution
        MIKOPBX_SSH_USER       - SSH username (default: root)
        MIKOPBX_SSH_PORT       - SSH port (default: 22)

    Database Paths (inside container/VM):
        MIKOPBX_DB_PATH        - Main database path (default: /cf/conf/mikopbx.db)
        MIKOPBX_CDR_DB_PATH    - CDR database path (default: /storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db)

    Storage Paths (inside container/VM):
        MIKOPBX_STORAGE_PATH   - Storage root path (default: /storage/usbdisk1/mikopbx)
        MIKOPBX_MONITOR_PATH   - Call recordings path (default: /storage/usbdisk1/mikopbx/astspool/monitor)
        MIKOPBX_LOG_PATH       - Log files path (default: /storage/usbdisk1/mikopbx/log)

    Test Configuration:
        ENABLE_CDR_SEED        - Enable CDR database seeding (default: 1)
        ENABLE_CDR_CLEANUP     - Enable CDR cleanup after tests (default: 1)
        ENABLE_SYSTEM_RESET    - Enable system reset before tests (default: 0)
    """

    def __init__(self, env_file: Optional[Path] = None):
        """
        Initialize configuration loader

        Args:
            env_file: Path to .env file (default: tests/api/.env)
        """
        # Load .env file
        if env_file is None:
            env_file = Path(__file__).parent / '.env'

        if env_file.exists():
            load_dotenv(env_file)
        else:
            raise FileNotFoundError(
                f".env file not found: {env_file}\n"
                "Create .env file from .env.example template"
            )

        # Validate required variables
        self._validate_required_vars()

    def _validate_required_vars(self):
        """Validate that required environment variables are set"""
        missing_vars = []

        if not os.getenv('MIKOPBX_API_URL'):
            missing_vars.append('MIKOPBX_API_URL')

        if not os.getenv('MIKOPBX_API_USERNAME'):
            missing_vars.append('MIKOPBX_API_USERNAME')

        if not os.getenv('MIKOPBX_API_PASSWORD'):
            missing_vars.append('MIKOPBX_API_PASSWORD')

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}\n"
                "Please update your .env file with required values.\n"
                "See .env.example for template."
            )

    # ========================================================================
    # API Configuration
    # ========================================================================

    @property
    def api_url(self) -> str:
        """MikoPBX REST API base URL"""
        return os.getenv('MIKOPBX_API_URL', '').rstrip('/')

    @property
    def api_username(self) -> str:
        """API username"""
        return os.getenv('MIKOPBX_API_USERNAME', 'admin')

    @property
    def api_password(self) -> str:
        """API password"""
        return os.getenv('MIKOPBX_API_PASSWORD', '')

    # ========================================================================
    # Execution Mode Configuration
    # ========================================================================

    @property
    def execution_mode(self) -> Literal['docker', 'api', 'ssh', 'local']:
        """
        Execution mode for running commands on MikoPBX

        Returns:
            'docker' - Local Docker container (docker exec)
            'api'    - Remote via REST API (system:executeBashCommand)
            'ssh'    - Remote via SSH
            'local'  - Direct local execution
        """
        mode = os.getenv('MIKOPBX_EXECUTION_MODE', '').lower()

        if mode in ['docker', 'api', 'ssh', 'local']:
            return mode  # type: ignore

        # Auto-detect if not explicitly set
        return self._detect_execution_mode()

    def _detect_execution_mode(self) -> Literal['docker', 'api', 'ssh', 'local']:
        """Auto-detect execution mode based on environment"""
        # If SSH host is set, use SSH mode
        if self.ssh_host:
            return 'ssh'

        # Check if API URL points to remote host (not localhost/127.0.0.1)
        if self.api_url:
            import re
            hostname_match = re.search(r'://([^:/]+)', self.api_url)
            if hostname_match:
                hostname = hostname_match.group(1)
                # If remote host, prefer API mode over SSH
                if hostname not in ['localhost', '127.0.0.1', '::1'] and not hostname.endswith('.localhost'):
                    return 'api'

        # Check if Docker is available and container exists
        if self._is_docker_available():
            return 'docker'

        # Fallback to local execution
        return 'local'

    def _is_docker_available(self) -> bool:
        """Check if Docker is available and container exists"""
        try:
            import subprocess
            result = subprocess.run(
                ['docker', 'ps', '-q', '-f', f'name={self.container_name}'],
                capture_output=True,
                timeout=5,
                env=dict(os.environ)  # Use current environment (OrbStack sets DOCKER_HOST)
            )
            return result.returncode == 0 and bool(result.stdout.strip())
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @property
    def container_name(self) -> str:
        """Docker container name"""
        return os.getenv('MIKOPBX_CONTAINER', 'mikopbx-php83')

    @property
    def ssh_host(self) -> Optional[str]:
        """SSH hostname for remote execution"""
        return os.getenv('MIKOPBX_SSH_HOST')

    @property
    def ssh_user(self) -> str:
        """SSH username"""
        return os.getenv('MIKOPBX_SSH_USER', 'root')

    @property
    def ssh_port(self) -> int:
        """SSH port"""
        return int(os.getenv('MIKOPBX_SSH_PORT', '22'))

    # ========================================================================
    # Database Paths
    # ========================================================================

    @property
    def database_path(self) -> str:
        """Main SQLite database path (inside container/VM)"""
        return os.getenv('MIKOPBX_DB_PATH', '/cf/conf/mikopbx.db')

    @property
    def cdr_database_path(self) -> str:
        """CDR SQLite database path (inside container/VM)"""
        return os.getenv('MIKOPBX_CDR_DB_PATH', '/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db')

    # ========================================================================
    # Storage Paths
    # ========================================================================

    @property
    def storage_path(self) -> str:
        """Storage root path (inside container/VM)"""
        return os.getenv('MIKOPBX_STORAGE_PATH', '/storage/usbdisk1/mikopbx')

    @property
    def monitor_path(self) -> str:
        """Call recordings path (inside container/VM)"""
        return os.getenv('MIKOPBX_MONITOR_PATH', '/storage/usbdisk1/mikopbx/astspool/monitor')

    @property
    def log_path(self) -> str:
        """Log files path (inside container/VM)"""
        return os.getenv('MIKOPBX_LOG_PATH', '/storage/usbdisk1/mikopbx/log')

    # ========================================================================
    # Test Configuration
    # ========================================================================

    @property
    def enable_cdr_seed(self) -> bool:
        """Enable CDR database seeding before tests"""
        return os.getenv('ENABLE_CDR_SEED', '1') == '1'

    @property
    def enable_cdr_cleanup(self) -> bool:
        """Enable CDR cleanup after tests"""
        return os.getenv('ENABLE_CDR_CLEANUP', '1') == '1'

    @property
    def enable_system_reset(self) -> bool:
        """Enable system reset before tests"""
        return os.getenv('ENABLE_SYSTEM_RESET', '0') == '1'

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def is_remote_execution(self) -> bool:
        """Check if execution mode is remote (SSH or API)"""
        return self.execution_mode in ['ssh', 'api']

    def is_local_execution(self) -> bool:
        """Check if execution mode is local (Docker or local)"""
        return self.execution_mode in ['docker', 'local']

    def get_script_path(self, script_name: str) -> str:
        """
        Get appropriate script path based on execution mode

        Args:
            script_name: Script filename (e.g., 'seed_cdr_database.sh')

        Returns:
            Full path to script on target system
        """
        if self.is_remote_execution():
            # Remote execution via SSH or API - use persistent storage path
            return f'/storage/usbdisk1/mikopbx/python-tests/scripts/{script_name}'
        else:
            # Docker/VM/local execution - use universal MikoPBX test directory path
            return f'/offload/rootfs/usr/www/tests/api/scripts/{script_name}'

    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"TestConfig(\n"
            f"  api_url={self.api_url},\n"
            f"  execution_mode={self.execution_mode},\n"
            f"  container={self.container_name if self.execution_mode == 'docker' else 'N/A'},\n"
            f"  ssh_host={self.ssh_host if self.execution_mode == 'ssh' else 'N/A'}\n"
            f")"
        )


# Global singleton instance
_config_instance: Optional[TestConfig] = None


def get_config() -> TestConfig:
    """
    Get global configuration instance (singleton pattern)

    Returns:
        TestConfig instance

    Usage:
        from config import get_config

        config = get_config()
        print(config.api_url)
    """
    global _config_instance

    if _config_instance is None:
        _config_instance = TestConfig()

    return _config_instance


# Convenience exports for backward compatibility
def get_api_url() -> str:
    """Get API URL"""
    return get_config().api_url


def get_api_credentials() -> tuple[str, str]:
    """Get API credentials (username, password)"""
    config = get_config()
    return (config.api_username, config.api_password)


def get_container_name() -> str:
    """Get Docker container name"""
    return get_config().container_name


def get_execution_mode() -> Literal['docker', 'api', 'ssh', 'local']:
    """Get execution mode"""
    return get_config().execution_mode


if __name__ == '__main__':
    # Print current configuration
    config = get_config()
    print("=" * 60)
    print("MikoPBX Test Configuration")
    print("=" * 60)
    print(config)
    print("\nDatabase Paths:")
    print(f"  Main DB: {config.database_path}")
    print(f"  CDR DB:  {config.cdr_database_path}")
    print("\nStorage Paths:")
    print(f"  Storage: {config.storage_path}")
    print(f"  Monitor: {config.monitor_path}")
    print(f"  Logs:    {config.log_path}")
    print("\nTest Flags:")
    print(f"  CDR Seed:     {config.enable_cdr_seed}")
    print(f"  CDR Cleanup:  {config.enable_cdr_cleanup}")
    print(f"  System Reset: {config.enable_system_reset}")
    print("=" * 60)
