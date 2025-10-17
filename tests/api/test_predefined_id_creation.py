#!/usr/bin/env python3
"""
Test: Create resources with predefined ID (migration/import scenario)

Tests that all REST API endpoints properly support creating records
with predefined IDs for migration and import scenarios.
"""

import pytest
import time
from conftest import assert_api_success, assert_record_exists


class TestPredefinedIDCreation:
    """Test predefined ID creation across all resources"""

    @pytest.mark.parametrize("resource_config", [
        {
            'endpoint': 'conference-rooms',
            'id_prefix': 'CONFERENCE-',
            'create_data': {
                'name': 'Test Conference with ID',
                'extension': '9001',
                'pinCode': '1111',
                'description': 'Testing predefined ID'
            },
            'verify_fields': ['name', 'extension']
        },
        {
            'endpoint': 'dialplan-applications',
            'id_prefix': 'DIALPLAN-APP-',
            'create_data': {
                'name': 'Test Dialplan App with ID',
                'extension': '9002',
                'applicationlogic': 'extension,${EXTEN},${DST_CONTEXT},1',
                'description': 'Testing predefined ID'
            },
            'verify_fields': ['name', 'extension']
        },
        {
            'endpoint': 'call-queues',
            'id_prefix': 'QUEUE-',
            'create_data': {
                'name': 'Test Queue with ID',
                'extension': '9003',
                'strategy': 'ringall',
                'timeout_to_redirect_to_extension': 30,
                'redirect_to_extension_if_empty': '',
                'redirect_to_extension_if_unanswered': '',
                'redirect_to_extension_if_repeat_exceeded': '',
                'number_unanswered_calls_to_redirect': 5,
                'caller_hear': 'moh',
                'description': 'Testing predefined ID'
            },
            'verify_fields': ['name', 'extension', 'strategy']
        },
        {
            'endpoint': 'sound-files',
            'id_prefix': 'SOUND-TEST',
            'create_data': {
                'name': 'test_sound_with_id.wav',
                'path': 'custom/test_sound_with_id.wav',
                'description': 'Testing predefined ID'
            },
            'verify_fields': ['name'],
            'skip': True,  # Sound files require file upload
            'skip_reason': 'Requires file upload'
        },
        {
            'endpoint': 'ivr-menu',
            'id_prefix': 'IVR-',
            'create_data': {
                'name': 'Test IVR with ID',
                'extension': '9005',
                'timeout': 7,
                'timeout_extension': '',
                'number_of_repeat': 3,
                'allow_enter_any_internal_extension': '0',
                'audio_message_id': '',
                'description': 'Testing predefined ID'
            },
            'verify_fields': ['name', 'extension']
        },
        {
            'endpoint': 'sip-providers',
            'id_prefix': 'SIP-',
            'create_data': {
                'type': 'SIP',
                'description': 'Test SIP Provider with ID',
                'host': 'test-sip.example.com',
                'username': 'testsip',
                'secret': 'testpass123',
                'port': '5060',
                'disabled': '0',
                'registration_type': 'outbound',
                'noregister': '0',
                'receive_calls_without_auth': '0'
            },
            'verify_fields': ['description', 'host', 'username']
        },
        {
            'endpoint': 'iax-providers',
            'id_prefix': 'IAX-',
            'create_data': {
                'type': 'IAX',
                'description': 'Test IAX Provider with ID',
                'host': 'test-iax.example.com',
                'username': 'testiax',
                'secret': 'testpass456',
                'port': '4569',
                'disabled': '0',
                'registration_type': 'outbound',
                'noregister': '0'
            },
            'verify_fields': ['description', 'host', 'username']
        },
    ])
    def test_create_with_predefined_id(self, api_client, resource_config):
        """
        Test creating resource with predefined ID

        Steps:
        1. Generate unique ID with proper prefix
        2. Create resource with this ID via POST
        3. Verify creation succeeded
        4. Verify returned ID matches provided ID
        5. Verify can retrieve by this ID
        6. Cleanup - delete created record
        """

        # Check if test should be skipped
        if resource_config.get('skip'):
            pytest.skip(resource_config.get('skip_reason', 'Test skipped'))

        endpoint = resource_config['endpoint']
        id_prefix = resource_config['id_prefix']
        create_data = resource_config['create_data'].copy()
        verify_fields = resource_config['verify_fields']

        print(f"\n{'='*70}")
        print(f"Test: Create {endpoint} with Predefined ID")
        print(f"{'='*70}")

        # Generate predefined ID with proper prefix
        # Use hex timestamp to match idPattern requirements (A-Fa-f0-9)
        hex_timestamp = format(int(time.time()), 'X')  # Uppercase hex
        predefined_id = f"{id_prefix}{hex_timestamp}"

        print(f"\nPredefined ID: {predefined_id}")

        resource_id = None

        try:
            # ====================================================================
            # STEP 0: Get default template for free extension (if needed)
            # ====================================================================
            if 'extension' in create_data:
                try:
                    print(f"\n{'-'*70}")
                    print(f"STEP 0: Get Free Extension from Default Template")
                    print(f"{'-'*70}")

                    default_response = api_client.get(f'{endpoint}:getDefault')
                    if default_response.get('result') and 'extension' in default_response.get('data', {}):
                        free_extension = default_response['data']['extension']
                        create_data['extension'] = free_extension
                        print(f"Using free extension from default: {free_extension}")
                except Exception as e:
                    print(f"⚠️  Could not get default extension: {e}")
                    # Keep original extension value

            # ====================================================================
            # STEP 1: CREATE with predefined ID
            # ====================================================================
            print(f"\n{'-'*70}")
            print(f"STEP 1: CREATE {endpoint} with Predefined ID")
            print(f"{'-'*70}")

            # Add predefined ID to create data
            create_data['id'] = predefined_id

            print(f"Creating {endpoint}:")
            print(f"  ID: {create_data['id']}")
            for field in verify_fields:
                if field in create_data:
                    print(f"  {field}: {create_data[field]}")

            # Create
            response = api_client.post(endpoint, create_data)

            print(f"\n📥 Response received:")
            print(f"  Result: {response.get('result')}")
            print(f"  HTTP Code: {response.get('httpCode')}")
            print(f"  Messages: {response.get('messages', {})}")

            # Verify success
            assert_api_success(response, f"Failed to create {endpoint} with predefined ID")

            # ====================================================================
            # STEP 2: VERIFY ID matches
            # ====================================================================
            print(f"\n{'-'*70}")
            print(f"STEP 2: VERIFY Returned ID")
            print(f"{'-'*70}")

            resource_id = response.get('data', {}).get('id')
            assert resource_id, "No ID returned after creation"

            print(f"Expected ID: {predefined_id}")
            print(f"Returned ID: {resource_id}")

            assert resource_id == predefined_id, \
                f"Returned ID '{resource_id}' doesn't match predefined ID '{predefined_id}'"

            print(f"✅ ID matches predefined value")

            # ====================================================================
            # STEP 3: VERIFY can retrieve
            # ====================================================================
            print(f"\n{'-'*70}")
            print(f"STEP 3: RETRIEVE {endpoint} by Predefined ID")
            print(f"{'-'*70}")

            record = assert_record_exists(api_client, endpoint, predefined_id)

            print(f"Retrieved {endpoint}:")
            print(f"  ID: {record.get('id')}")
            for field in verify_fields:
                if field in record:
                    print(f"  {field}: {record[field]}")

            # Verify data matches
            assert record.get('id') == predefined_id, "ID mismatch"
            for field in verify_fields:
                if field in create_data and field in record:
                    assert record.get(field) == create_data[field], \
                        f"{field} mismatch: expected '{create_data[field]}', got '{record.get(field)}'"

            print(f"✅ All fields verified")

            # ====================================================================
            # SUMMARY
            # ====================================================================
            print(f"\n{'='*70}")
            print(f"PREDEFINED ID TEST COMPLETE: {endpoint}")
            print(f"{'='*70}")
            print(f"✅ CREATE - {endpoint} created with predefined ID")
            print(f"✅ VERIFY - ID matches provided value")
            print(f"✅ RETRIEVE - Can fetch by predefined ID")
            print(f"\nPredefined ID scenario works correctly for {endpoint}!")

        except AssertionError as e:
            print(f"\n❌ Test failed: {str(e)}")
            raise

        except Exception as e:
            print(f"\n❌ Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

        finally:
            # Cleanup: delete test resource
            if resource_id:
                try:
                    print(f"\n🧹 Cleanup: Deleting test {endpoint} {resource_id}")
                    response = api_client.delete(f'{endpoint}/{resource_id}')
                    if response.get('result'):
                        print(f"✅ Cleanup successful")
                    else:
                        print(f"⚠️  Cleanup failed: {response.get('messages', {})}")
                except Exception as e:
                    print(f"⚠️  Cleanup failed: {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
