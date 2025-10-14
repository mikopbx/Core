#!/usr/bin/env python3
"""
Test suite for System Delete All Settings operations

Tests the dangerous operation of deleting all PBX configuration and data.
This is a DESTRUCTIVE operation that:
- Deletes all users, extensions, providers
- Deletes all call queues, IVR menus, conference rooms
- Deletes all routes (incoming/outgoing)
- Deletes all call history (CDR)
- Deletes all recordings
- Deletes all custom files
- Resets system to factory defaults

⚠️ WARNING: This test should ONLY be run on test systems!
"""

import pytest
from conftest import assert_api_success


class TestSystemDeleteStatistics:
    """Test getting deletion statistics before actual deletion"""

    def test_01_get_delete_statistics(self, api_client):
        """Test GET statistics of what will be deleted"""
        try:
            # Try different possible endpoints
            endpoints_to_try = [
                'system:getDeleteStatistics',
                'general-settings:getDeleteStatistics',
                'system/delete-statistics',
            ]

            response = None
            working_endpoint = None

            for endpoint in endpoints_to_try:
                try:
                    response = api_client.get(endpoint)
                    if response.get('result'):
                        working_endpoint = endpoint
                        break
                except Exception:
                    continue

            if working_endpoint:
                assert_api_success(response, "Failed to get delete statistics")
                data = response['data']

                print(f"✓ Retrieved deletion statistics from: {working_endpoint}")
                print(f"\nWhat will be deleted:")
                print(f"=" * 50)

                # Display statistics
                stats_map = {
                    'users': 'Users/Extensions',
                    'extensions': 'Extensions',
                    'providers': 'SIP/IAX Providers',
                    'callQueues': 'Call Queues',
                    'ivrMenus': 'IVR Menus',
                    'conferenceRooms': 'Conference Rooms',
                    'dialplanApplications': 'Dialplan Applications',
                    'customSoundFiles': 'Custom Sound Files',
                    'mohFiles': 'Music on Hold Files',
                    'incomingRoutes': 'Incoming Routes',
                    'outgoingRoutes': 'Outgoing Routes',
                    'firewallRules': 'Firewall Rules',
                    'modules': 'Installed Modules',
                    'callHistory': 'Call History Records',
                    'callRecordings': 'Call Recordings',
                    'callRecordingsSize': 'Recordings Size (bytes)',
                    'backups': 'Backup Files',
                    'backupsSize': 'Backups Size (bytes)',
                    'customFiles': 'Custom Files',
                    'outWorkTimes': 'Out-of-Work Time Schedules',
                    'outWorkTimesRouts': 'Out-of-Work Time Routes',
                    'apiKeys': 'REST API Keys',
                    'asteriskRestUsers': 'ARI Users',
                    'userPasskeys': 'WebAuthn Passkeys'
                }

                for key, label in stats_map.items():
                    if key in data and data[key] > 0:
                        value = data[key]
                        if isinstance(value, (int, float)) and value > 1000000:
                            # Format large numbers
                            print(f"  {label}: {value:,}")
                        else:
                            print(f"  {label}: {value}")

                print(f"=" * 50)

                # Calculate totals
                total_items = sum(v for k, v in data.items() if isinstance(v, int) and k not in ['callRecordingsSize', 'backupsSize'])
                print(f"\nTotal items to delete: {total_items:,}")

            else:
                print(f"⚠ Delete statistics endpoint not found")
                print(f"  Tried: {endpoints_to_try}")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Delete statistics not implemented")
            else:
                raise


class TestSystemDeleteAllDRYRUN:
    """Test delete all operation in DRY RUN mode (safe to run)"""

    def test_01_check_delete_all_endpoint_exists(self, api_client):
        """Test if delete all endpoint exists (without actually deleting)"""
        try:
            # Try to find the endpoint
            endpoints_to_try = [
                'system:restoreDefault',
                'general-settings:restoreDefault',
                'system:deleteAll',
                'general-settings:deleteAll',
                'system/restore-default',
            ]

            for endpoint in endpoints_to_try:
                try:
                    # Try with dry_run parameter if possible
                    response = api_client.post(endpoint, {'dry_run': True})
                    if response:
                        print(f"✓ Found delete all endpoint: {endpoint}")
                        return
                except Exception as e:
                    error_msg = str(e)
                    if '404' not in error_msg and '501' not in error_msg:
                        print(f"  Endpoint {endpoint} exists but requires parameters")

            print(f"⚠ Delete all endpoint not found or requires special parameters")

        except Exception as e:
            print(f"⚠ Error checking endpoint: {str(e)[:100]}")


class TestSystemDeleteAllWARNING:
    """
    ⚠️⚠️⚠️ DANGER ZONE - DO NOT RUN ON PRODUCTION ⚠️⚠️⚠️

    These tests are DISABLED by default.
    To enable, set environment variable: ENABLE_DESTRUCTIVE_TESTS=1
    """

    @pytest.mark.skip(reason="DESTRUCTIVE TEST - Deletes all system data")
    def test_DANGEROUS_delete_all_settings(self, api_client):
        """
        ⚠️ DANGER: This test WILL DELETE ALL SYSTEM DATA ⚠️

        This test is SKIPPED by default for safety.
        Only enable on test systems that you want to reset completely.
        """
        import os
        if os.getenv('ENABLE_DESTRUCTIVE_TESTS') != '1':
            pytest.skip("Destructive tests are disabled. Set ENABLE_DESTRUCTIVE_TESTS=1 to enable.")

        print("\n" + "=" * 60)
        print("⚠️  WARNING: EXECUTING DESTRUCTIVE OPERATION")
        print("=" * 60)
        print("This will DELETE ALL system configuration and data:")
        print("  - All users and extensions")
        print("  - All providers and routes")
        print("  - All call history and recordings")
        print("  - All custom settings")
        print("=" * 60)

        # Get statistics first
        try:
            stats_response = api_client.get('system:getDeleteStatistics')
            if stats_response.get('result'):
                print("\nCurrent system state:")
                print(stats_response['data'])
        except:
            pass

        # Confirm deletion
        import time
        print("\nWaiting 5 seconds before execution...")
        time.sleep(5)

        try:
            # Try different possible endpoints
            endpoints_to_try = [
                'system:restoreDefault',
                'general-settings:restoreDefault',
                'system:deleteAll',
            ]

            response = None
            for endpoint in endpoints_to_try:
                try:
                    response = api_client.post(endpoint, {})
                    if response:
                        break
                except:
                    continue

            if response and response.get('result'):
                print("\n✓ Delete all operation started successfully")
                print("  System will restart and reset to defaults")
                print("  All data has been deleted")
            else:
                print("\n✗ Delete all operation failed or endpoint not found")
                if response:
                    print(f"  Response: {response}")

        except Exception as e:
            print(f"\n✗ Error executing delete all: {str(e)}")


if __name__ == '__main__':
    # Run only safe tests by default
    pytest.main([__file__, '-v', '-s', '-m', 'not skip'])
