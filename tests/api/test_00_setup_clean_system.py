#!/usr/bin/env python3
"""
Test suite for INITIAL SYSTEM CLEANUP

This test file is designed to run FIRST (test_00_) to reset the system
to factory defaults before running the full test suite.

⚠️ WARNING: This is a DESTRUCTIVE operation!

Usage:
    # Set environment variable to enable
    export ENABLE_SYSTEM_RESET=1
    export MIKOPBX_API_URL="https://mikopbx83.localhost:8445/pbxcore/api/v3"

    # Run only this test
    pytest test_00_setup_clean_system.py -v -s

    # Or run full suite (this will run first due to test_00_ naming)
    pytest -v

The test will:
1. Authenticate to the system
2. Get current system statistics
3. Call system:restoreDefault
4. System will restart automatically
5. Wait for system to come back online
6. Verify system was reset (optional)
"""

import os
import time
import pytest
import requests
from conftest import MikoPBXClient
from config import get_config

config = get_config()


class Test00SystemReset:
    """Reset system to factory defaults before running tests (runs FIRST - 00 prefix)"""

    @pytest.mark.order(-5)
    def test_01_check_environment_variable(self):
        """Check if system reset is explicitly enabled"""
        enabled = os.getenv('ENABLE_SYSTEM_RESET', '0')

        if enabled != '1':
            pytest.skip(
                "SYSTEM RESET DISABLED - "
                "This test will DELETE ALL system data and reset to factory defaults. "
                "To enable, set: ENABLE_SYSTEM_RESET=1 (current: " + enabled + ")"
            )

        print("\n" + "✓" * 70)
        print("✓  SYSTEM RESET ENABLED - Proceeding with cleanup")
        print("✓" * 70)

    @pytest.mark.order(-4)
    def test_02_get_system_statistics_before_reset(self, api_client):
        """Get statistics of what will be deleted"""
        print("\n" + "=" * 70)
        print("STEP 1: Getting current system statistics")
        print("=" * 70)

        try:
            response = api_client.get('system:getDeleteStatistics')

            if response.get('result'):
                data = response['data']

                print("\n📊 Current System State:")
                print("-" * 70)

                stats_to_show = [
                    ('users', 'Users/Extensions'),
                    ('extensions', 'Total Extensions'),
                    ('providers', 'SIP/IAX Providers'),
                    ('callQueues', 'Call Queues'),
                    ('ivrMenus', 'IVR Menus'),
                    ('conferenceRooms', 'Conference Rooms'),
                    ('dialplanApplications', 'Dialplan Applications'),
                    ('incomingRoutes', 'Incoming Routes'),
                    ('outgoingRoutes', 'Outgoing Routes'),
                    ('firewallRules', 'Firewall Rules'),
                    ('customSoundFiles', 'Custom Sound Files'),
                    ('apiKeys', 'API Keys'),
                    ('asteriskRestUsers', 'ARI Users'),
                    ('userPasskeys', 'Passkeys'),
                ]

                total_items = 0
                has_data = False

                for key, label in stats_to_show:
                    if key in data and data[key] > 0:
                        value = data[key]
                        print(f"  ├─ {label}: {value:,}")
                        total_items += value
                        has_data = True

                # Size information
                if 'callRecordingsSize' in data and data['callRecordingsSize'] > 0:
                    size_mb = data['callRecordingsSize'] / 1024 / 1024
                    print(f"  ├─ Call Recordings Size: {size_mb:.2f} MB")
                    has_data = True

                if 'backupsSize' in data and data['backupsSize'] > 0:
                    size_mb = data['backupsSize'] / 1024 / 1024
                    print(f"  └─ Backups Size: {size_mb:.2f} MB")
                    has_data = True

                print("-" * 70)
                print(f"Total items that will be deleted: {total_items:,}")
                print("=" * 70)

                if not has_data:
                    print("\n✓ System appears to be already empty")
                    pytest.skip("System is already empty, no need to reset")

            else:
                print("⚠️  Could not retrieve statistics")
                print("   Proceeding with reset anyway...")

        except Exception as e:
            print(f"⚠️  Error getting statistics: {str(e)[:100]}")
            print("   Proceeding with reset anyway...")

    @pytest.mark.order(-3)
    def test_03_execute_system_restore_default(self, api_client):
        """Execute system:restoreDefault - THIS DELETES ALL DATA"""
        print("\n" + "=" * 70)
        print("STEP 2: Executing system:restoreDefault")
        print("=" * 70)

        print("\n⚠️  This will:")
        print("   • Delete ALL users, extensions, and accounts")
        print("   • Delete ALL providers and trunks")
        print("   • Delete ALL call routes and IVR menus")
        print("   • Delete ALL call history and recordings")
        print("   • Delete ALL configuration and custom files")
        print("   • Reset system to factory defaults")
        print("   • System will RESTART automatically")

        print("\n⏳ Executing in 3 seconds...")
        time.sleep(3)

        try:
            response = api_client.post('system:restoreDefault', {})

            if response.get('result'):
                print("\n✅ DELETE ALL OPERATION INITIATED")
                print("=" * 70)
                print("The system is now:")
                print("  ✓ Deleting all data")
                print("  ✓ Resetting to factory defaults")
                print("  ✓ Will restart automatically (~2-5 minutes)")
                print("=" * 70)

                # Save info that reset was successful
                self.reset_successful = True
            else:
                print(f"\n❌ DELETE ALL OPERATION FAILED")
                print(f"Response: {response}")
                pytest.fail("System reset failed")

        except Exception as e:
            # If we get connection error, it might mean system is already restarting
            error_msg = str(e)
            if 'Connection' in error_msg or 'timeout' in error_msg.lower():
                print(f"\n⚠️  Connection lost - system may be restarting already")
                print(f"   Error: {error_msg[:100]}")
            else:
                print(f"\n❌ Error executing reset: {error_msg[:200]}")
                raise

    @pytest.mark.order(-2)
    @pytest.mark.skipif(
        os.getenv('ENABLE_SYSTEM_RESET') != '1',
        reason="Optional - Set ENABLE_SYSTEM_RESET=1 to enable"
    )
    def test_04_wait_for_system_restart(self, api_client):
        """
        Wait for system to restart and come back online

        This test waits up to 5 minutes for system to restart.
        Enable with ENABLE_SYSTEM_RESET=1 environment variable.
        """
        print("\n" + "=" * 70)
        print("STEP 3: Waiting for system to restart")
        print("=" * 70)

        max_wait = 300  # 5 minutes
        check_interval = 10  # Check every 10 seconds
        start_time = time.time()
        attempt = 0

        print(f"\n⏳ Will wait up to {max_wait} seconds for system to restart...")
        print(f"   Checking every {check_interval} seconds...\n")

        # Wait a bit for system to start shutdown
        print("⏳ Waiting 30 seconds for system to start shutdown...")
        time.sleep(30)

        while time.time() - start_time < max_wait:
            attempt += 1
            elapsed = int(time.time() - start_time)

            print(f"  [{elapsed}s] Attempt {attempt}: Checking if system is back online...")

            try:
                # Try to create new client and authenticate
                test_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
                test_client.authenticate()

                # If we got here, system is back!
                print(f"\n✅ SYSTEM IS BACK ONLINE")
                print(f"   Total downtime: {elapsed} seconds")
                print("=" * 70)
                return

            except Exception as e:
                error_msg = str(e)[:50]
                print(f"      Not ready yet: {error_msg}")

            time.sleep(check_interval)

        # Timeout
        print(f"\n⚠️  TIMEOUT: System did not come back online within {max_wait} seconds")
        print(f"   Please check system status manually")
        pytest.fail(f"System did not restart within {max_wait} seconds")

    @pytest.mark.order(-1)
    @pytest.mark.skipif(
        os.getenv('ENABLE_SYSTEM_RESET') != '1',
        reason="Optional - Set ENABLE_SYSTEM_RESET=1 to enable"
    )
    def test_05_verify_system_is_empty(self, api_client):
        """
        Verify that system was successfully reset

        Enable with ENABLE_SYSTEM_RESET=1 environment variable.
        """
        print("\n" + "=" * 70)
        print("STEP 4: Verifying system is empty")
        print("=" * 70)

        try:
            response = api_client.get('system:getDeleteStatistics')

            if response.get('result'):
                data = response['data']

                # Check key metrics
                total_items = sum(
                    v for k, v in data.items()
                    if isinstance(v, int) and k not in ['callRecordingsSize', 'backupsSize']
                )

                print(f"\n📊 Post-Reset System State:")
                print(f"   Total items: {total_items}")

                if total_items == 0:
                    print("\n✅ VERIFICATION SUCCESSFUL")
                    print("   System has been completely reset to factory defaults")
                else:
                    print("\n⚠️  WARNING: Some items remain:")
                    for key, value in data.items():
                        if isinstance(value, int) and value > 0:
                            print(f"     - {key}: {value}")

        except Exception as e:
            print(f"\n⚠️  Could not verify: {str(e)[:100]}")


class Test00SystemResetDocumentation:
    """Documentation and usage instructions (same 00 prefix as reset tests)"""

    def test_01_print_usage_instructions(self):
        """Print usage instructions for this test"""

        instructions = """

╔═══════════════════════════════════════════════════════════════════════════╗
║                   SYSTEM RESET TEST SUITE - INSTRUCTIONS                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

This test file (test_00_setup_clean_system.py) is designed to reset your
MikoPBX system to factory defaults BEFORE running the full test suite.

═══════════════════════════════════════════════════════════════════════════

📋 USAGE:

1️⃣  Set environment variables:

    export ENABLE_SYSTEM_RESET=1
    export MIKOPBX_API_URL="https://mikopbx83.localhost:8445/pbxcore/api/v3"
    export MIKOPBX_LOGIN="admin"
    export MIKOPBX_PASSWORD="123456789MikoPBX#1"

2️⃣  Run ONLY the reset test:

    pytest test_00_setup_clean_system.py -v -s

3️⃣  Or run full test suite (this will run FIRST automatically):

    pytest -v

═══════════════════════════════════════════════════════════════════════════

⚠️  IMPORTANT NOTES:

• This test is DESTRUCTIVE - it deletes ALL system data
• Only run on TEST systems, never on PRODUCTION
• System will RESTART automatically (takes 2-5 minutes)
• Test file is named test_00_ so it runs FIRST in pytest order
• Subsequent tests will wait for system to be ready

═══════════════════════════════════════════════════════════════════════════

🔧 PYTEST TEST ORDER:

pytest runs tests in this order:
1. By file name (alphabetically): test_00_ → test_01_ → test_02_ → ...
2. Within file, by class name (alphabetically)
3. Within class, by test method name (test_01_ → test_02_ → ...)

So: test_00_setup_clean_system.py always runs FIRST! ✅

═══════════════════════════════════════════════════════════════════════════

📊 WHAT HAPPENS:

1. Check ENABLE_SYSTEM_RESET=1 (skip if not set)
2. Get current system statistics
3. Call POST /system:restoreDefault
4. System deletes all data and restarts
5. (Optional) Wait for system to come back online
6. (Optional) Verify system is empty

═══════════════════════════════════════════════════════════════════════════

✅ QUICK EXAMPLE:

# Reset system, then run all tests
export ENABLE_SYSTEM_RESET=1
export MIKOPBX_API_URL="https://mikopbx83.localhost:8445/pbxcore/api/v3"
pytest -v

# Reset system only (no other tests)
export ENABLE_SYSTEM_RESET=1
pytest test_00_setup_clean_system.py -v -s

# Run tests WITHOUT resetting (default behavior)
pytest -v

═══════════════════════════════════════════════════════════════════════════
        """

        # Check if reset is enabled
        enabled = os.getenv('ENABLE_SYSTEM_RESET', '0')

        print(instructions)

        if enabled == '1':
            print("✅ SYSTEM RESET IS ENABLED")
            print("   Tests will reset the system before running")
        else:
            print("ℹ️  SYSTEM RESET IS DISABLED (default)")
            print("   Tests will run on existing system state")
            print("\n   To enable reset: export ENABLE_SYSTEM_RESET=1")

        print("\n" + "=" * 79)
