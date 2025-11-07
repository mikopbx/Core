"""
Helper module for tests that require system reboot.

This module provides utilities to handle system reboots gracefully in pytest tests.
It uses a state file on persistent storage to track test progress across reboots.

All configuration is loaded from .env file via TestConfig.
"""

import json
import os
import sys
import time
import requests
from typing import Optional, Dict, Any
from pathlib import Path

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import TestConfig


class RebootTestHelper:
    """
    Helper class for tests that require system reboot.

    Uses persistent storage to save test state before reboot and restore after.

    Example:
        def test_system_reboot(api_client):
            helper = RebootTestHelper("test_system_reboot")

            if helper.is_before_reboot():
                # Pre-reboot phase
                helper.save_state({"setting": "value"})
                api_client.post("/system/reboot")
                helper.mark_reboot_initiated()
                pytest.skip("Waiting for reboot to complete")

            elif helper.is_after_reboot():
                # Post-reboot phase
                state = helper.load_state()
                assert state["setting"] == "value"
                # Verify system state after reboot
                helper.cleanup()
    """

    def __init__(self, test_name: str, config: Optional[TestConfig] = None):
        """
        Initialize reboot helper for a specific test.

        Args:
            test_name: Unique name for this test (e.g., test function name)
            config: Optional TestConfig instance (creates new if not provided)
        """
        self.test_name = test_name
        self.config = config or TestConfig()

        # State directory in persistent storage
        self.STATE_DIR = os.path.join(self.config.storage_path, 'python-tests', 'reboot-states')
        self.state_file = os.path.join(self.STATE_DIR, f"{test_name}.json")

        # Ensure state directory exists
        os.makedirs(self.STATE_DIR, exist_ok=True)

    def is_before_reboot(self) -> bool:
        """Check if this is the first run (before reboot)."""
        return not os.path.exists(self.state_file)

    def is_after_reboot(self) -> bool:
        """Check if this is after reboot (state file exists)."""
        return os.path.exists(self.state_file)

    def save_state(self, state: Dict[str, Any]) -> None:
        """
        Save test state before reboot.

        Args:
            state: Dictionary of test state to preserve across reboot
        """
        state_data = {
            "test_name": self.test_name,
            "timestamp": time.time(),
            "state": state
        }

        with open(self.state_file, 'w') as f:
            json.dump(state_data, f, indent=2)

    def load_state(self) -> Dict[str, Any]:
        """
        Load test state after reboot.

        Returns:
            Dictionary of saved test state

        Raises:
            FileNotFoundError: If state file doesn't exist
        """
        if not os.path.exists(self.state_file):
            raise FileNotFoundError(f"No state file found for {self.test_name}")

        with open(self.state_file, 'r') as f:
            state_data = json.load(f)

        return state_data.get("state", {})

    def mark_reboot_initiated(self) -> None:
        """Mark that reboot has been initiated (for state tracking)."""
        if os.path.exists(self.state_file):
            with open(self.state_file, 'r') as f:
                state_data = json.load(f)

            state_data["reboot_initiated"] = time.time()

            with open(self.state_file, 'w') as f:
                json.dump(state_data, f, indent=2)

    def cleanup(self) -> None:
        """Clean up state file after test completes."""
        if os.path.exists(self.state_file):
            os.remove(self.state_file)

    @staticmethod
    def wait_for_system_ready(api_url: str, timeout: int = 300, interval: int = 5) -> bool:
        """
        Wait for system to become ready after reboot.

        This should be called from the host (not inside MikoPBX) after initiating reboot.

        Args:
            api_url: Base API URL (e.g., http://192.168.107.2:8081/pbxcore/api/v3)
            timeout: Maximum time to wait in seconds (default: 300 = 5 minutes)
            interval: Check interval in seconds (default: 5)

        Returns:
            True if system is ready, False if timeout
        """
        start_time = time.time()

        while (time.time() - start_time) < timeout:
            try:
                response = requests.get(
                    f"{api_url}/system/ping",
                    timeout=5,
                    verify=False  # For self-signed certificates
                )

                if response.status_code == 200:
                    # Additional check: ensure services are ready
                    time.sleep(10)  # Give services time to fully start
                    return True

            except (requests.ConnectionError, requests.Timeout):
                # System not ready yet
                pass

            time.sleep(interval)

        return False

    def get_pending_reboot_tests(self) -> list:
        """
        Get list of tests waiting for reboot to complete.

        Returns:
            List of test names with pending state files
        """
        if not os.path.exists(self.STATE_DIR):
            return []

        pending = []
        for filename in os.listdir(self.STATE_DIR):
            if filename.endswith('.json'):
                test_name = filename[:-5]  # Remove .json extension
                pending.append(test_name)

        return pending


class RebootTestRunner:
    """
    Utility to run reboot tests from the host machine.

    This handles the orchestration of:
    1. Running pre-reboot phase inside MikoPBX
    2. Waiting for reboot
    3. Running post-reboot phase inside MikoPBX

    Example (from host):
        runner = RebootTestRunner(
            test_file="test_47_system.py::test_system_reboot"
        )
        runner.run()
    """

    def __init__(
        self,
        test_file: str,
        config: Optional[TestConfig] = None
    ):
        """
        Initialize reboot test runner.

        Args:
            test_file: Path to test file or specific test
            config: Optional TestConfig instance (creates new if not provided)
        """
        self.config = config or TestConfig()
        self.test_file = test_file
        self.container = self.config.container_name
        self.api_url = self.config.api_url

    def run(self) -> bool:
        """
        Run the complete reboot test cycle.

        Returns:
            True if test passed, False otherwise
        """
        print(f"[RebootTest] Running pre-reboot phase: {self.test_file}")

        # Phase 1: Run pre-reboot phase (works with Docker and OrbStack)
        cmd = f"docker exec {self.container} /storage/usbdisk1/mikopbx/python-tests/run-pytest.sh {self.test_file} -v"
        pre_result = os.system(cmd)

        if pre_result != 0:
            print("[RebootTest] ❌ Pre-reboot phase failed")
            return False

        print("[RebootTest] ⏳ Waiting for system reboot...")

        # Phase 2: Wait for system to come back online
        if not RebootTestHelper.wait_for_system_ready(self.api_url):
            print("[RebootTest] ❌ System did not come back online in time")
            return False

        print("[RebootTest] ✓ System is back online")
        print(f"[RebootTest] Running post-reboot phase: {self.test_file}")

        # Phase 3: Run post-reboot phase
        post_result = os.system(cmd)

        if post_result != 0:
            print("[RebootTest] ❌ Post-reboot phase failed")
            return False

        print("[RebootTest] ✓ Test completed successfully")
        return True


# Pytest fixtures for reboot tests

def pytest_configure(config):
    """Register custom markers for reboot tests."""
    config.addinivalue_line(
        "markers",
        "reboot: mark test as requiring system reboot"
    )
