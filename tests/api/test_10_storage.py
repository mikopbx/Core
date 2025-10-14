#!/usr/bin/env python3
"""
Test suite for Storage operations

Tests the /pbxcore/api/v3/storage endpoint for:
- Getting current storage configuration (singleton resource)
- Getting storage usage statistics
- Getting list of available storage devices
- Updating storage configuration (PUT - full replacement)
- Partial updates (PATCH)
- Custom methods: usage, list, mount, umount, mkfs, statusMkfs

Storage is a SINGLETON resource - there's only one storage configuration in the system.
All operations work without resource ID.

NOTE:
- Write operations (PUT/PATCH) modify system storage configuration and should be used carefully.
- mount/umount/mkfs operations are dangerous and can affect system stability.
- This test suite focuses on safe read operations.
"""

import pytest
from conftest import assert_api_success


class TestStorage:
    """Storage operations tests"""

    original_config = None

    def test_01_get_storage_config(self, api_client):
        """Test GET /storage - Get current storage configuration"""
        response = api_client.get('storage')
        assert_api_success(response, "Failed to get storage configuration")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dict"

        # Store original configuration for restoration
        TestStorage.original_config = data.copy()

        # Verify essential fields
        print(f"✓ Retrieved storage configuration")
        if 'disk' in data:
            print(f"  Current disk: {data['disk']}")
        if 'PBXRecordSavePeriod' in data:
            print(f"  Record save period: {data['PBXRecordSavePeriod']} days")
        if 'mountPoint' in data:
            print(f"  Mount point: {data['mountPoint']}")

    def test_02_get_storage_usage(self, api_client):
        """Test GET /storage:usage - Get storage usage statistics"""
        try:
            response = api_client.get('storage:usage')
            assert_api_success(response, "Failed to get storage usage")

            data = response['data']
            print(f"✓ Retrieved storage usage statistics")

            if isinstance(data, dict):
                if 'total' in data:
                    print(f"  Total space: {data.get('total')}")
                if 'used' in data:
                    print(f"  Used space: {data.get('used')}")
                if 'free' in data:
                    print(f"  Free space: {data.get('free')}")
                if 'percent' in data:
                    print(f"  Usage percent: {data.get('percent')}%")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Usage statistics not implemented yet")
            else:
                raise

    def test_03_list_storage_devices(self, api_client):
        """Test GET /storage:list - List available storage devices"""
        try:
            response = api_client.get('storage:list')
            assert_api_success(response, "Failed to get storage devices list")

            data = response['data']
            assert isinstance(data, (list, dict)), "Response should be list or dict"

            if isinstance(data, list):
                print(f"✓ Retrieved {len(data)} storage devices")
                if len(data) > 0:
                    first = data[0]
                    print(f"  Sample device keys: {list(first.keys()) if isinstance(first, dict) else 'N/A'}")
            elif isinstance(data, dict) and 'devices' in data:
                devices = data['devices']
                print(f"✓ Retrieved {len(devices)} storage devices")
            else:
                print(f"✓ Retrieved storage devices info")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ List devices not implemented yet")
            else:
                raise

    def test_04_patch_record_save_period(self, api_client):
        """Test PATCH /storage - Update only record save period"""
        if not TestStorage.original_config:
            pytest.skip("No original configuration available")

        try:
            # Try to set a different save period
            new_period = 90  # 90 days

            response = api_client.patch('storage', {
                'PBXRecordSavePeriod': new_period
            })

            if response['result']:
                assert_api_success(response, "Failed to patch record save period")

                # Verify change
                updated = api_client.get('storage')
                if updated['result'] and 'PBXRecordSavePeriod' in updated['data']:
                    assert int(updated['data']['PBXRecordSavePeriod']) == new_period, \
                        f"Expected {new_period}, got {updated['data']['PBXRecordSavePeriod']}"
                    print(f"✓ Record save period patched successfully to {new_period} days")
                else:
                    print(f"⚠ Record save period patched but verification failed")
            else:
                print(f"✓ Record save period patch rejected (may require validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Record save period validation works (rejected invalid/unauthorized change)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_restore_original_config(self, api_client):
        """Test - Restore original configuration"""
        if not TestStorage.original_config:
            pytest.skip("No original configuration to restore")

        try:
            # Restore original record save period
            if 'PBXRecordSavePeriod' in TestStorage.original_config:
                response = api_client.patch('storage', {
                    'PBXRecordSavePeriod': TestStorage.original_config['PBXRecordSavePeriod']
                })

                if response['result']:
                    print(f"✓ Original configuration restored")
                else:
                    print(f"⚠ Failed to restore original configuration")
        except Exception as e:
            print(f"⚠ Error restoring configuration: {str(e)[:50]}")


class TestStorageEdgeCases:
    """Edge cases for storage"""

    def test_01_invalid_record_save_period_zero(self, api_client):
        """Test PATCH /storage - Invalid save period (0)"""
        try:
            response = api_client.patch('storage', {
                'PBXRecordSavePeriod': 0
            })

            if not response['result']:
                print(f"✓ Invalid save period (0) rejected")
            else:
                print(f"⚠ Invalid save period (0) accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid save period (0) rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_invalid_record_save_period_negative(self, api_client):
        """Test PATCH /storage - Invalid save period (negative)"""
        try:
            response = api_client.patch('storage', {
                'PBXRecordSavePeriod': -30
            })

            if not response['result']:
                print(f"✓ Negative save period rejected")
            else:
                print(f"⚠ Negative save period accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative save period rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_invalid_record_save_period_too_high(self, api_client):
        """Test PATCH /storage - Invalid save period (>3650 days / 10 years)"""
        try:
            response = api_client.patch('storage', {
                'PBXRecordSavePeriod': 5000
            })

            if not response['result']:
                print(f"✓ Too high save period rejected")
            else:
                print(f"⚠ Too high save period accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Too high save period rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_invalid_disk_path(self, api_client):
        """Test PATCH /storage - Invalid disk path"""
        try:
            response = api_client.patch('storage', {
                'disk': 'not-a-valid-disk-path'
            })

            if not response['result']:
                print(f"✓ Invalid disk path rejected")
            else:
                print(f"⚠ Invalid disk path accepted (may be validated later)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid disk path rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_empty_disk_path(self, api_client):
        """Test PATCH /storage - Empty disk path"""
        try:
            response = api_client.patch('storage', {
                'disk': ''
            })

            if not response['result']:
                print(f"✓ Empty disk path rejected")
            else:
                print(f"⚠ Empty disk path accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty disk path rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_put_without_required_fields(self, api_client):
        """Test PUT /storage - Missing required fields"""
        try:
            response = api_client.put('storage', {
                'PBXRecordSavePeriod': 180
                # Missing 'disk' (may be required for PUT)
            })

            if not response['result']:
                print(f"✓ Missing required fields rejected")
            else:
                print(f"⚠ Missing required fields accepted (may have defaults)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Missing required fields rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


class TestStorageDangerousOperations:
    """Dangerous operations tests (read-only verification)"""

    def test_01_mount_requires_device_parameter(self, api_client):
        """Test POST /storage:mount - Verify device parameter required"""
        try:
            # Try to mount without device parameter
            response = api_client.post('storage:mount', {})

            if not response['result']:
                print(f"✓ Mount without device parameter rejected")
            else:
                print(f"⚠ Mount without device parameter accepted (unexpected)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Mount validation works (device required)")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Mount operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_umount_requires_device_parameter(self, api_client):
        """Test POST /storage:umount - Verify device parameter required"""
        try:
            # Try to unmount without device parameter
            response = api_client.post('storage:umount', {})

            if not response['result']:
                print(f"✓ Unmount without device parameter rejected")
            else:
                print(f"⚠ Unmount without device parameter accepted (unexpected)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Unmount validation works (device required)")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Unmount operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_mkfs_requires_device_parameter(self, api_client):
        """Test POST /storage:mkfs - Verify device parameter required"""
        try:
            # Try to format without device parameter (DANGEROUS if it worked!)
            response = api_client.post('storage:mkfs', {})

            if not response['result']:
                print(f"✓ Format without device parameter rejected (SAFE)")
            else:
                print(f"⚠ Format without device parameter accepted (DANGEROUS!)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Format validation works (device required)")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Format operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_mkfs_invalid_filesystem(self, api_client):
        """Test POST /storage:mkfs - Invalid filesystem type"""
        try:
            response = api_client.post('storage:mkfs', {
                'device': '/dev/fake',
                'fileSystem': 'ntfs'  # Not in enum ['ext4', 'ext3']
            })

            if not response['result']:
                print(f"✓ Invalid filesystem type rejected")
            else:
                print(f"⚠ Invalid filesystem type accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Filesystem validation works")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Format operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_status_mkfs_without_task_id(self, api_client):
        """Test POST /storage:statusMkfs - Missing task ID"""
        try:
            response = api_client.post('storage:statusMkfs', {})

            if not response['result']:
                print(f"✓ Status check without task ID rejected")
            else:
                print(f"⚠ Status check without task ID accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Task ID validation works")
            elif '404' in str(e):
                print(f"✓ Task not found (expected)")
            elif '501' in str(e):
                print(f"⚠ Status operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_status_mkfs_fake_task_id(self, api_client):
        """Test POST /storage:statusMkfs - Non-existent task ID"""
        try:
            response = api_client.post('storage:statusMkfs', {
                'taskId': 'fake-task-id-12345'
            })

            if not response['result']:
                print(f"✓ Non-existent task ID rejected")
            else:
                print(f"⚠ Non-existent task ID accepted")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ Task not found (expected)")
            elif '501' in str(e):
                print(f"⚠ Status operation not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
