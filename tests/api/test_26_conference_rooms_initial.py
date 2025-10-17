#!/usr/bin/env python3
"""
Test 04: Conference Rooms

Tests conference room creation and management via REST API.
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    assert_record_deleted,
    convert_conference_room_fixture_to_api_format
)


def test_create_single_conference_room(api_client, conference_room_fixtures):
    """
    Test creating a single conference room via REST API

    Steps:
    1. Take first conference from fixtures
    2. Convert to API format
    3. Create via POST /conference-rooms
    4. Verify creation succeeded
    5. Verify conference can be retrieved
    """

    print(f"\n{'='*70}")
    print(f"Test: Create Single Conference Room")
    print(f"{'='*70}")

    # Get first conference
    conf_key = list(conference_room_fixtures.keys())[0]
    fixture_data = conference_room_fixtures[conf_key]

    print(f"\nCreating conference: {conf_key}")
    print(f"  Name: {fixture_data.get('name')}")
    print(f"  Extension: {fixture_data.get('extension')}")
    print(f"  PIN Code: {fixture_data.get('pinCode', '(none)')}")

    # Convert to API format
    api_data = convert_conference_room_fixture_to_api_format(fixture_data)

    # Verify required fields
    assert api_data.get('name'), "Missing name"
    assert api_data.get('extension'), "Missing extension"

    print(f"\n✅ All required fields present")

    # Create conference
    print(f"\n📤 Sending POST /conference-rooms...")

    try:
        response = api_client.post('conference-rooms', api_data)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify success
        assert_api_success(response, "Failed to create conference room")

        # Get created ID
        conf_id = response.get('data', {}).get('id')
        assert conf_id, "Response should contain conference ID"

        print(f"\n✅ Conference room created successfully!")
        print(f"  ID: {conf_id}")

        # Verify we can retrieve the conference
        print(f"\n🔍 Verifying conference can be retrieved...")

        conf_record = assert_record_exists(api_client, 'conference-rooms', conf_id)

        print(f"\n✅ Conference room retrieved successfully!")
        print(f"  ID: {conf_record.get('id')}")
        print(f"  Name: {conf_record.get('name')}")
        print(f"  Extension: {conf_record.get('extension')}")

        # Verify key fields match
        assert conf_record.get('name') == api_data['name'], \
            "Name doesn't match"
        assert conf_record.get('extension') == api_data['extension'], \
            "Extension doesn't match"

        print(f"\n✅ All fields verified!")

        # Return ID for potential cleanup
        return conf_id

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


def test_create_conferences_batch(api_client, conference_room_fixtures):
    """
    Test creating multiple conference rooms from fixtures

    Creates all conferences from fixtures (skipping existing ones).
    """

    print(f"\n{'='*70}")
    print(f"Test: Batch Create Conference Rooms")
    print(f"{'='*70}")
    print(f"Total conferences in fixtures: {len(conference_room_fixtures)}")

    created_conferences = []
    failed_conferences = []
    skipped_conferences = []

    # Get existing conferences
    existing_response = api_client.get('conference-rooms', params={'limit': 1000})
    existing_conferences = []

    if existing_response.get('result'):
        data = existing_response.get('data', {})
        if isinstance(data, dict):
            existing_conferences = data.get('data', [])
        elif isinstance(data, list):
            existing_conferences = data

    existing_extensions = {conf.get('extension') for conf in existing_conferences}

    print(f"Existing conferences in system: {len(existing_extensions)}")
    print(f"Extensions: {sorted(existing_extensions)}")

    # Process each conference
    for conf_key, fixture_data in conference_room_fixtures.items():
        extension = str(fixture_data.get('extension', ''))

        print(f"\n{'-'*70}")
        print(f"Processing: {conf_key} (extension: {extension})")

        # Skip if already exists
        if extension in existing_extensions:
            print(f"⏭️  Skipping - extension {extension} already exists")
            skipped_conferences.append({
                'key': conf_key,
                'extension': extension,
                'reason': 'Already exists'
            })
            continue

        try:
            # Convert to API format
            api_data = convert_conference_room_fixture_to_api_format(fixture_data)

            # Verify required fields
            assert api_data.get('name'), f"Missing name for {conf_key}"
            assert api_data.get('extension'), f"Missing extension for {conf_key}"

            print(f"  Name: {api_data.get('name')}")
            print(f"  Extension: {api_data.get('extension')}")
            print(f"  PIN Code: {api_data.get('pinCode', '(none)')}")

            # Create conference
            print(f"  📤 Creating...")
            response = api_client.post('conference-rooms', api_data)

            # Check response
            if not response.get('result'):
                error_messages = response.get('messages', {})
                print(f"  ❌ Failed: {error_messages}")
                failed_conferences.append({
                    'key': conf_key,
                    'extension': extension,
                    'error': error_messages
                })
                continue

            # Get created ID
            conf_id = response.get('data', {}).get('id')

            if not conf_id:
                print(f"  ❌ Failed: No ID in response")
                failed_conferences.append({
                    'key': conf_key,
                    'extension': extension,
                    'error': 'No ID in response'
                })
                continue

            print(f"  ✅ Created successfully! ID: {conf_id}")

            # Verify we can retrieve it
            try:
                conf_record = assert_record_exists(api_client, 'conference-rooms', conf_id)
                print(f"  ✅ Verified - can retrieve conference")

                created_conferences.append({
                    'key': conf_key,
                    'id': conf_id,
                    'extension': extension,
                    'name': api_data['name']
                })

            except Exception as e:
                print(f"  ⚠️  Created but verification failed: {str(e)}")
                created_conferences.append({
                    'key': conf_key,
                    'id': conf_id,
                    'extension': extension,
                    'name': api_data['name'],
                    'warning': 'Verification failed'
                })

        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            failed_conferences.append({
                'key': conf_key,
                'extension': extension,
                'error': str(e)
            })

    # Print summary
    print(f"\n{'='*70}")
    print(f"BATCH CREATE SUMMARY")
    print(f"{'='*70}")
    print(f"Total fixtures: {len(conference_room_fixtures)}")
    print(f"Already existed: {len(skipped_conferences)}")
    print(f"Successfully created: {len(created_conferences)}")
    print(f"Failed: {len(failed_conferences)}")

    if created_conferences:
        print(f"\n✅ Created conferences:")
        for conf in created_conferences:
            warning = f" (⚠️ {conf.get('warning')})" if conf.get('warning') else ""
            print(f"  - {conf['extension']:>5} | {conf['name']:<40} | ID: {conf['id']}{warning}")

    if skipped_conferences:
        print(f"\n⏭️  Skipped conferences:")
        for conf in skipped_conferences:
            print(f"  - {conf['extension']:>5} | {conf['key']:<40} | {conf['reason']}")

    if failed_conferences:
        print(f"\n❌ Failed conferences:")
        for conf in failed_conferences:
            print(f"  - {conf['extension']:>5} | {conf['key']:<40}")
            print(f"    Error: {conf['error']}")

    # Test should pass if we created at least some conferences or all were already there
    total_successful = len(created_conferences) + len(skipped_conferences)
    assert total_successful > 0, "No conferences were created or existed"

    print(f"\n✅ Batch create completed!")

    # Return created IDs for potential cleanup
    return [conf['id'] for conf in created_conferences]


def test_conference_room_crud_cycle(api_client, conference_room_fixtures):
    """
    Test complete CRUD operations on a conference room

    Steps:
    1. CREATE - Create new conference
    2. READ - Verify can retrieve
    3. UPDATE - Full update (PUT)
    4. PATCH - Partial update
    5. DELETE - Remove conference
    6. VERIFY - Confirm deletion
    """

    print(f"\n{'='*70}")
    print(f"Test: Conference Room Full CRUD Cycle")
    print(f"{'='*70}")

    # Use unique extension for test
    test_extension = "9000"
    conf_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE Conference Room")
        print(f"{'-'*70}")

        create_data = {
            'name': 'Test CRUD Conference',
            'extension': test_extension,
            'pinCode': '9999',
            'description': 'CRUD test conference'
        }

        print(f"Creating conference:")
        print(f"  Name: {create_data['name']}")
        print(f"  Extension: {create_data['extension']}")
        print(f"  PIN: {create_data['pinCode']}")

        # Create
        response = api_client.post('conference-rooms', create_data)
        assert_api_success(response, "Failed to create conference")

        conf_id = response.get('data', {}).get('id')
        assert conf_id, "No ID returned after creation"

        print(f"✅ Created with ID: {conf_id}")

        # ====================================================================
        # STEP 2: READ
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: READ Conference Room")
        print(f"{'-'*70}")

        conf_record = assert_record_exists(api_client, 'conference-rooms', conf_id)

        print(f"Retrieved conference:")
        print(f"  ID: {conf_record.get('id')}")
        print(f"  Name: {conf_record.get('name')}")
        print(f"  Extension: {conf_record.get('extension')}")
        print(f"  PIN: {conf_record.get('pinCode')}")

        # Verify data matches
        assert conf_record.get('name') == create_data['name'], "Name mismatch"
        assert conf_record.get('extension') == create_data['extension'], "Extension mismatch"
        assert conf_record.get('pinCode') == create_data['pinCode'], "PIN mismatch"

        print(f"✅ All fields verified")

        # ====================================================================
        # STEP 3: UPDATE (PUT)
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: UPDATE Conference Room (PUT)")
        print(f"{'-'*70}")

        update_data = create_data.copy()
        update_data['id'] = conf_id
        update_data['name'] = 'Updated CRUD Conference'
        update_data['pinCode'] = '8888'

        print(f"Updating to:")
        print(f"  Name: {update_data['name']}")
        print(f"  PIN: {update_data['pinCode']}")

        # PUT update
        response = api_client.put(f'conference-rooms/{conf_id}', update_data)
        assert_api_success(response, "Failed to update conference")

        print(f"✅ Update successful")

        # Verify changes
        updated_record = assert_record_exists(api_client, 'conference-rooms', conf_id)

        assert updated_record.get('name') == update_data['name'], "Name not updated"
        assert updated_record.get('pinCode') == update_data['pinCode'], "PIN not updated"

        print(f"✅ All updates verified")

        # ====================================================================
        # STEP 4: PATCH
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: PATCH Conference Room (Partial Update)")
        print(f"{'-'*70}")

        patch_data = {
            'name': 'Patched CRUD Conference'
        }

        print(f"Patching fields:")
        print(f"  Name: {patch_data['name']}")

        # PATCH update
        response = api_client.patch(f'conference-rooms/{conf_id}', patch_data)
        assert_api_success(response, "Failed to patch conference")

        print(f"✅ Patch successful")

        # Verify changes
        patched_record = assert_record_exists(api_client, 'conference-rooms', conf_id)

        assert patched_record.get('name') == patch_data['name'], "Name not patched"
        assert patched_record.get('extension') == test_extension, "Extension changed (should be unchanged)"
        assert patched_record.get('pinCode') == update_data['pinCode'], "PIN changed (should be unchanged)"

        print(f"✅ Patch verified (only name changed)")

        # ====================================================================
        # STEP 5: DELETE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: DELETE Conference Room")
        print(f"{'-'*70}")

        print(f"Deleting conference {conf_id}...")

        response = api_client.delete(f'conference-rooms/{conf_id}')
        assert_api_success(response, "Failed to delete conference")

        print(f"✅ Delete successful")

        # ====================================================================
        # STEP 6: VERIFY DELETION
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: VERIFY Deletion")
        print(f"{'-'*70}")

        assert_record_deleted(api_client, 'conference-rooms', conf_id)

        print(f"✅ Deletion verified (conference no longer exists)")

        # Set to None so cleanup doesn't try to delete again
        conf_id = None

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"CRUD CYCLE COMPLETE")
        print(f"{'='*70}")
        print(f"✅ CREATE - Conference created successfully")
        print(f"✅ READ   - Conference retrieved successfully")
        print(f"✅ UPDATE - Full update (PUT) successful")
        print(f"✅ PATCH  - Partial update successful")
        print(f"✅ DELETE - Conference deleted successfully")
        print(f"✅ VERIFY - Deletion confirmed")

    finally:
        # Cleanup: delete test conference if it still exists
        if conf_id:
            try:
                print(f"\n⚠️  Cleanup: Deleting test conference {conf_id}")
                api_client.delete(f'conference-rooms/{conf_id}')
            except Exception as e:
                print(f"⚠️  Cleanup failed (might be OK): {e}")


def test_create_conference_with_predefined_id(api_client):
    """
    Test creating conference room with predefined ID (migration/import scenario)

    Steps:
    1. Generate unique ID with proper prefix
    2. Create conference with this ID via POST
    3. Verify creation succeeded
    4. Verify returned ID matches provided ID
    5. Verify can retrieve by this ID
    6. Cleanup - delete created record
    """

    print(f"\n{'='*70}")
    print(f"Test: Create Conference Room with Predefined ID")
    print(f"{'='*70}")

    # Generate predefined ID with proper prefix
    import time
    predefined_id = f"CONFERENCE-TEST-{int(time.time())}"

    print(f"\nPredefined ID: {predefined_id}")

    conf_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE with predefined ID
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE with Predefined ID")
        print(f"{'-'*70}")

        create_data = {
            'id': predefined_id,
            'name': 'Test Conference with ID',
            'extension': '9001',
            'pinCode': '1111',
            'description': 'Testing predefined ID creation'
        }

        print(f"Creating conference:")
        print(f"  ID: {create_data['id']}")
        print(f"  Name: {create_data['name']}")
        print(f"  Extension: {create_data['extension']}")

        # Create
        response = api_client.post('conference-rooms', create_data)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  HTTP Code: {response.get('httpCode')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify success
        assert_api_success(response, "Failed to create conference with predefined ID")

        # ====================================================================
        # STEP 2: VERIFY ID matches
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: VERIFY Returned ID")
        print(f"{'-'*70}")

        conf_id = response.get('data', {}).get('id')
        assert conf_id, "No ID returned after creation"

        print(f"Expected ID: {predefined_id}")
        print(f"Returned ID: {conf_id}")

        assert conf_id == predefined_id, \
            f"Returned ID '{conf_id}' doesn't match predefined ID '{predefined_id}'"

        print(f"✅ ID matches predefined value")

        # ====================================================================
        # STEP 3: VERIFY can retrieve
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: RETRIEVE by Predefined ID")
        print(f"{'-'*70}")

        conf_record = assert_record_exists(api_client, 'conference-rooms', predefined_id)

        print(f"Retrieved conference:")
        print(f"  ID: {conf_record.get('id')}")
        print(f"  Name: {conf_record.get('name')}")
        print(f"  Extension: {conf_record.get('extension')}")

        # Verify data matches
        assert conf_record.get('id') == predefined_id, "ID mismatch"
        assert conf_record.get('name') == create_data['name'], "Name mismatch"
        assert conf_record.get('extension') == create_data['extension'], "Extension mismatch"

        print(f"✅ All fields verified")

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"PREDEFINED ID TEST COMPLETE")
        print(f"{'='*70}")
        print(f"✅ CREATE - Conference created with predefined ID")
        print(f"✅ VERIFY - ID matches provided value")
        print(f"✅ RETRIEVE - Can fetch by predefined ID")
        print(f"\nPredefined ID scenario works correctly!")

    finally:
        # Cleanup: delete test conference
        if conf_id:
            try:
                print(f"\n🧹 Cleanup: Deleting test conference {conf_id}")
                response = api_client.delete(f'conference-rooms/{conf_id}')
                if response.get('result'):
                    print(f"✅ Cleanup successful")
                else:
                    print(f"⚠️  Cleanup failed: {response.get('messages', {})}")
            except Exception as e:
                print(f"⚠️  Cleanup failed: {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
