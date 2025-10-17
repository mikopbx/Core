#!/usr/bin/env python3
"""
Test 06: Call Queues (Reference Implementation)

Tests call queue creation and management via REST API.
This is the reference implementation with full validation, sanitization, and error handling.

Call Queues are the most complex resource with:
- Multiple redirect destinations
- Sound file references
- Member management
- Comprehensive validation
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    assert_record_deleted,
    convert_call_queue_fixture_to_api_format
)


def test_create_single_call_queue(api_client, call_queue_fixtures):
    """
    Test creating a single call queue via REST API

    Steps:
    1. Take first queue from fixtures
    2. Convert to API format
    3. Create via POST /call-queues
    4. Verify creation succeeded
    5. Verify queue can be retrieved
    """

    print(f"\n{'='*70}")
    print(f"Test: Create Single Call Queue")
    print(f"{'='*70}")

    # Get first queue
    queue_key = list(call_queue_fixtures.keys())[0]
    fixture_data = call_queue_fixtures[queue_key]

    print(f"\nCreating queue: {queue_key}")
    print(f"  Name: {fixture_data.get('name')}")
    print(f"  Extension: {fixture_data.get('extension')}")
    print(f"  Strategy: {fixture_data.get('strategy', 'ringall')}")

    # Convert to API format
    api_data = convert_call_queue_fixture_to_api_format(fixture_data)

    # Verify required fields
    assert api_data.get('name'), "Missing name"
    assert api_data.get('extension'), "Missing extension"
    assert api_data.get('strategy'), "Missing strategy"

    print(f"\n✅ All required fields present")

    # Create queue
    print(f"\n📤 Sending POST /call-queues...")

    try:
        response = api_client.post('call-queues', api_data)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify success
        assert_api_success(response, "Failed to create call queue")

        # Get created ID
        queue_id = response.get('data', {}).get('id')
        assert queue_id, "Response should contain queue ID"

        print(f"\n✅ Call queue created successfully!")
        print(f"  ID: {queue_id}")

        # Verify we can retrieve the queue
        print(f"\n🔍 Verifying queue can be retrieved...")

        queue_record = assert_record_exists(api_client, 'call-queues', queue_id)

        print(f"\n✅ Call queue retrieved successfully!")
        print(f"  ID: {queue_record.get('id')}")
        print(f"  Name: {queue_record.get('name')}")
        print(f"  Extension: {queue_record.get('extension')}")
        print(f"  Strategy: {queue_record.get('strategy')}")

        # Verify key fields match
        assert queue_record.get('name') == api_data['name'], \
            "Name doesn't match"
        assert queue_record.get('extension') == api_data['extension'], \
            "Extension doesn't match"
        assert queue_record.get('strategy') == api_data['strategy'], \
            "Strategy doesn't match"

        print(f"\n✅ All fields verified!")

        # Return ID for potential cleanup
        return queue_id

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

        # If it's an HTTP error, try to get more details
        if hasattr(e, 'response'):
            print(f"\nResponse Status: {e.response.status_code}")
            try:
                error_data = e.response.json()
                print(f"Response Body: {error_data}")
            except:
                print(f"Response Body: {e.response.text[:500]}")

        raise


def test_create_call_queues_batch(api_client, call_queue_fixtures):
    """
    Test creating multiple call queues from fixtures

    Creates all queues from fixtures (skipping existing ones).
    """

    print(f"\n{'='*70}")
    print(f"Test: Batch Create Call Queues")
    print(f"{'='*70}")
    print(f"Total queues in fixtures: {len(call_queue_fixtures)}")

    created_queues = []
    failed_queues = []
    skipped_queues = []

    # Get existing queues
    existing_response = api_client.get('call-queues', params={'limit': 1000})
    existing_queues = []

    if existing_response.get('result'):
        data = existing_response.get('data', {})
        if isinstance(data, dict):
            existing_queues = data.get('data', [])
        elif isinstance(data, list):
            existing_queues = data

    existing_extensions = {queue.get('extension') for queue in existing_queues}

    print(f"Existing queues in system: {len(existing_extensions)}")
    print(f"Extensions: {sorted(existing_extensions)}")

    # Process each queue
    for queue_key, fixture_data in call_queue_fixtures.items():
        extension = str(fixture_data.get('extension', ''))

        print(f"\n{'-'*70}")
        print(f"Processing: {queue_key} (extension: {extension})")

        # Skip if already exists
        if extension in existing_extensions:
            print(f"⏭️  Skipping - extension {extension} already exists")
            skipped_queues.append({
                'key': queue_key,
                'extension': extension,
                'reason': 'Already exists'
            })
            continue

        try:
            # Convert to API format
            api_data = convert_call_queue_fixture_to_api_format(fixture_data)

            # Verify required fields
            assert api_data.get('name'), f"Missing name for {queue_key}"
            assert api_data.get('extension'), f"Missing extension for {queue_key}"
            assert api_data.get('strategy'), f"Missing strategy for {queue_key}"

            print(f"  Name: {api_data.get('name')}")
            print(f"  Extension: {api_data.get('extension')}")
            print(f"  Strategy: {api_data.get('strategy')}")

            # Create queue
            print(f"  📤 Creating...")
            response = api_client.post('call-queues', api_data)

            # Check response
            if not response.get('result'):
                error_messages = response.get('messages', {})
                print(f"  ❌ Failed: {error_messages}")
                failed_queues.append({
                    'key': queue_key,
                    'extension': extension,
                    'error': error_messages
                })
                continue

            # Get created ID
            queue_id = response.get('data', {}).get('id')

            if not queue_id:
                print(f"  ❌ Failed: No ID in response")
                failed_queues.append({
                    'key': queue_key,
                    'extension': extension,
                    'error': 'No ID in response'
                })
                continue

            print(f"  ✅ Created successfully! ID: {queue_id}")

            # Verify we can retrieve it
            try:
                queue_record = assert_record_exists(api_client, 'call-queues', queue_id)
                print(f"  ✅ Verified - can retrieve queue")

                created_queues.append({
                    'key': queue_key,
                    'id': queue_id,
                    'extension': extension,
                    'name': api_data['name']
                })

            except Exception as e:
                print(f"  ⚠️  Created but verification failed: {str(e)}")
                created_queues.append({
                    'key': queue_key,
                    'id': queue_id,
                    'extension': extension,
                    'name': api_data['name'],
                    'warning': 'Verification failed'
                })

        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            failed_queues.append({
                'key': queue_key,
                'extension': extension,
                'error': str(e)
            })

    # Print summary
    print(f"\n{'='*70}")
    print(f"BATCH CREATE SUMMARY")
    print(f"{'='*70}")
    print(f"Total fixtures: {len(call_queue_fixtures)}")
    print(f"Already existed: {len(skipped_queues)}")
    print(f"Successfully created: {len(created_queues)}")
    print(f"Failed: {len(failed_queues)}")

    if created_queues:
        print(f"\n✅ Created queues:")
        for queue in created_queues:
            warning = f" (⚠️ {queue.get('warning')})" if queue.get('warning') else ""
            print(f"  - {queue['extension']:>5} | {queue['name']:<40} | ID: {queue['id']}{warning}")

    if skipped_queues:
        print(f"\n⏭️  Skipped queues:")
        for queue in skipped_queues:
            print(f"  - {queue['extension']:>5} | {queue['key']:<40} | {queue['reason']}")

    if failed_queues:
        print(f"\n❌ Failed queues:")
        for queue in failed_queues:
            print(f"  - {queue['extension']:>5} | {queue['key']:<40}")
            print(f"    Error: {queue['error']}")

    # Test should pass if we created at least some queues or all were already there
    total_successful = len(created_queues) + len(skipped_queues)
    assert total_successful > 0, "No queues were created or existed"

    print(f"\n✅ Batch create completed!")

    # Return created IDs for potential cleanup
    return [queue['id'] for queue in created_queues]


def test_call_queue_crud_cycle(api_client):
    """
    Test complete CRUD operations on a call queue

    Steps:
    1. CREATE - Create new queue
    2. READ - Verify can retrieve
    3. UPDATE - Full update (PUT)
    4. PATCH - Partial update
    5. DELETE - Remove queue
    6. VERIFY - Confirm deletion
    """

    print(f"\n{'='*70}")
    print(f"Test: Call Queue Full CRUD Cycle")
    print(f"{'='*70}")

    # Use unique extension for test
    test_extension = "9999"
    queue_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE Call Queue")
        print(f"{'-'*70}")

        create_data = {
            'name': 'Test CRUD Queue',
            'extension': test_extension,
            'strategy': 'ringall',
            'description': 'CRUD test queue',
            'seconds_to_ring_each_member': 20,
            'seconds_for_wrapup': 10,
            'caller_hear': 'ringing',
            'announce_position': True,
            'announce_hold_time': False
        }

        print(f"Creating queue:")
        print(f"  Name: {create_data['name']}")
        print(f"  Extension: {create_data['extension']}")
        print(f"  Strategy: {create_data['strategy']}")

        # Create
        response = api_client.post('call-queues', create_data)
        assert_api_success(response, "Failed to create queue")

        queue_id = response.get('data', {}).get('id')
        assert queue_id, "No ID returned after creation"

        print(f"✅ Created with ID: {queue_id}")

        # ====================================================================
        # STEP 2: READ
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: READ Call Queue")
        print(f"{'-'*70}")

        queue_record = assert_record_exists(api_client, 'call-queues', queue_id)

        print(f"Retrieved queue:")
        print(f"  ID: {queue_record.get('id')}")
        print(f"  Name: {queue_record.get('name')}")
        print(f"  Extension: {queue_record.get('extension')}")
        print(f"  Strategy: {queue_record.get('strategy')}")

        # Verify data matches
        assert queue_record.get('name') == create_data['name'], "Name mismatch"
        assert queue_record.get('extension') == create_data['extension'], "Extension mismatch"
        assert queue_record.get('strategy') == create_data['strategy'], "Strategy mismatch"

        print(f"✅ All fields verified")

        # ====================================================================
        # STEP 3: UPDATE (PUT)
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: UPDATE Queue (PUT)")
        print(f"{'-'*70}")

        update_data = create_data.copy()
        # ✅ FIXED: Do NOT send 'id' in request body - it's in URL path
        # update_data['id'] = queue_id  # ❌ REMOVED - id should only be in URL
        update_data['name'] = 'Updated CRUD Queue'
        update_data['strategy'] = 'leastrecent'
        update_data['seconds_to_ring_each_member'] = 30

        print(f"Updating to:")
        print(f"  Name: {update_data['name']}")
        print(f"  Strategy: {update_data['strategy']}")

        # PUT update (id is in URL path, not in request body)
        response = api_client.put(f'call-queues/{queue_id}', update_data)
        assert_api_success(response, "Failed to update queue")

        print(f"✅ Update successful")

        # Verify changes
        updated_record = assert_record_exists(api_client, 'call-queues', queue_id)

        assert updated_record.get('name') == update_data['name'], "Name not updated"
        assert updated_record.get('strategy') == update_data['strategy'], "Strategy not updated"

        print(f"✅ All updates verified")

        # ====================================================================
        # STEP 4: PATCH
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: PATCH Queue (Partial Update)")
        print(f"{'-'*70}")

        patch_data = {
            'name': 'Patched CRUD Queue',
            'announce_position': False
        }

        print(f"Patching fields:")
        print(f"  Name: {patch_data['name']}")
        print(f"  Announce Position: {patch_data['announce_position']}")

        # PATCH update
        response = api_client.patch(f'call-queues/{queue_id}', patch_data)
        assert_api_success(response, "Failed to patch queue")

        print(f"✅ Patch successful")

        # Verify changes
        patched_record = assert_record_exists(api_client, 'call-queues', queue_id)

        assert patched_record.get('name') == patch_data['name'], "Name not patched"
        assert patched_record.get('extension') == test_extension, "Extension changed (should be unchanged)"
        assert patched_record.get('strategy') == update_data['strategy'], "Strategy changed (should be unchanged)"

        print(f"✅ Patch verified (only specified fields changed)")

        # ====================================================================
        # STEP 5: DELETE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: DELETE Call Queue")
        print(f"{'-'*70}")

        print(f"Deleting queue {queue_id}...")

        response = api_client.delete(f'call-queues/{queue_id}')
        assert_api_success(response, "Failed to delete queue")

        print(f"✅ Delete successful")

        # ====================================================================
        # STEP 6: VERIFY DELETION
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: VERIFY Deletion")
        print(f"{'-'*70}")

        assert_record_deleted(api_client, 'call-queues', queue_id)

        print(f"✅ Deletion verified (queue no longer exists)")

        # Set to None so cleanup doesn't try to delete again
        queue_id = None

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"CRUD CYCLE COMPLETE")
        print(f"{'='*70}")
        print(f"✅ CREATE - Queue created successfully")
        print(f"✅ READ   - Queue retrieved successfully")
        print(f"✅ UPDATE - Full update (PUT) successful")
        print(f"✅ PATCH  - Partial update successful")
        print(f"✅ DELETE - Queue deleted successfully")
        print(f"✅ VERIFY - Deletion confirmed")

    finally:
        # Cleanup: delete test queue if it still exists
        if queue_id:
            try:
                print(f"\n⚠️  Cleanup: Deleting test queue {queue_id}")
                api_client.delete(f'call-queues/{queue_id}')
            except Exception as e:
                print(f"⚠️  Cleanup failed (might be OK): {e}")


def test_call_queue_copy(api_client):
    """
    Test copying an existing call queue

    Steps:
    1. CREATE - Create source queue
    2. COPY - Copy the queue using :copy endpoint
    3. VERIFY - Ensure copy exists with different ID
    4. CLEANUP - Delete both queues
    """

    print(f"\n{'='*70}")
    print(f"Test: Call Queue Copy Operation")
    print(f"{'='*70}")

    source_id = None
    copy_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE Source Queue
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE Source Queue")
        print(f"{'-'*70}")

        source_data = {
            'name': 'Source Copy Test Queue',
            'extension': '7777',
            'strategy': 'ringall',
            'description': 'Original queue for copy test',
            'seconds_to_ring_each_member': 25,
            'announce_position': True
        }

        print(f"Creating source queue:")
        print(f"  Name: {source_data['name']}")
        print(f"  Extension: {source_data['extension']}")

        response = api_client.post('call-queues', source_data)
        assert_api_success(response, "Failed to create source queue")

        source_id = response.get('data', {}).get('id')
        assert source_id, "No ID returned after creation"

        print(f"✅ Source queue created with ID: {source_id}")

        # ====================================================================
        # STEP 2: COPY Queue
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: COPY Queue using :copy endpoint")
        print(f"{'-'*70}")

        # Call custom copy method (Google API Design pattern)
        print(f"Calling GET /call-queues/{source_id}:copy...")

        response = api_client.get(f'call-queues/{source_id}:copy')
        assert_api_success(response, "Failed to copy queue")

        copy_id = response.get('data', {}).get('id')
        assert copy_id, "No ID returned after copy"
        assert copy_id != source_id, "Copy should have different ID"

        print(f"✅ Queue copied successfully!")
        print(f"  Source ID: {source_id}")
        print(f"  Copy ID: {copy_id}")

        # ====================================================================
        # STEP 3: VERIFY Copy
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: VERIFY Copy")
        print(f"{'-'*70}")

        # Retrieve the copy
        copy_record = assert_record_exists(api_client, 'call-queues', copy_id)

        print(f"Copy queue details:")
        print(f"  ID: {copy_record.get('id')}")
        print(f"  Name: {copy_record.get('name')}")
        print(f"  Extension: {copy_record.get('extension')}")
        print(f"  Strategy: {copy_record.get('strategy')}")

        # Verify name contains "Copy of"
        assert 'Copy of' in copy_record.get('name', ''), \
            "Copy name should contain 'Copy of'"

        # Verify strategy was copied
        assert copy_record.get('strategy') == source_data['strategy'], \
            "Strategy should match source"

        # Verify extension is different
        assert copy_record.get('extension') != source_data['extension'], \
            "Copy should have different extension"

        print(f"✅ Copy verified!")
        print(f"  ✓ Name contains 'Copy of'")
        print(f"  ✓ Strategy matches source: {copy_record.get('strategy')}")
        print(f"  ✓ Extension is different: {copy_record.get('extension')}")

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"COPY OPERATION COMPLETE")
        print(f"{'='*70}")
        print(f"✅ Source queue created: {source_id}")
        print(f"✅ Queue copied via :copy endpoint: {copy_id}")
        print(f"✅ Copy verified with different ID and extension")

    finally:
        # ====================================================================
        # CLEANUP
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"CLEANUP: Deleting test queues")
        print(f"{'-'*70}")

        # Delete source queue
        if source_id:
            try:
                print(f"Deleting source queue {source_id}...")
                api_client.delete(f'call-queues/{source_id}')
                print(f"✅ Source queue deleted")
            except Exception as e:
                print(f"⚠️  Failed to delete source: {e}")

        # Delete copy queue
        if copy_id:
            try:
                print(f"Deleting copy queue {copy_id}...")
                api_client.delete(f'call-queues/{copy_id}')
                print(f"✅ Copy queue deleted")
            except Exception as e:
                print(f"⚠️  Failed to delete copy: {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
