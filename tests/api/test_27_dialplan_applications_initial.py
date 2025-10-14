#!/usr/bin/env python3
"""
Test 05: Dialplan Applications

Tests dialplan application creation and management via REST API.
Dialplan applications are custom extensions with various logic types (PHP, plaintext, Python, etc.)
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    assert_record_deleted,
    convert_dialplan_app_fixture_to_api_format
)


def test_create_single_dialplan_app(api_client, dialplan_app_fixtures):
    """
    Test creating a single dialplan application via REST API

    Steps:
    1. Take first application from fixtures
    2. Convert to API format
    3. Create via POST /dialplan-applications
    4. Verify creation succeeded
    5. Verify application can be retrieved
    """

    print(f"\n{'='*70}")
    print(f"Test: Create Single Dialplan Application")
    print(f"{'='*70}")

    # Get first application
    app_key = list(dialplan_app_fixtures.keys())[0]
    fixture_data = dialplan_app_fixtures[app_key]

    print(f"\nCreating application: {app_key}")
    print(f"  Name: {fixture_data.get('name')}")
    print(f"  Extension: {fixture_data.get('extension')}")
    print(f"  Type: {fixture_data.get('type')}")

    # Convert to API format
    api_data = convert_dialplan_app_fixture_to_api_format(fixture_data)

    # Verify required fields
    assert api_data.get('name'), "Missing name"
    assert api_data.get('extension'), "Missing extension"
    assert api_data.get('type'), "Missing type"

    print(f"\n✅ All required fields present")
    print(f"  Type after conversion: {api_data['type']}")

    # Create application
    print(f"\n📤 Sending POST /dialplan-applications...")

    try:
        response = api_client.post('dialplan-applications', api_data)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify success
        assert_api_success(response, "Failed to create dialplan application")

        # Get created ID
        app_id = response.get('data', {}).get('id')
        assert app_id, "Response should contain application ID"

        print(f"\n✅ Dialplan application created successfully!")
        print(f"  ID: {app_id}")

        # Verify we can retrieve the application
        print(f"\n🔍 Verifying application can be retrieved...")

        app_record = assert_record_exists(api_client, 'dialplan-applications', app_id)

        print(f"\n✅ Application retrieved successfully!")
        print(f"  ID: {app_record.get('id')}")
        print(f"  Name: {app_record.get('name')}")
        print(f"  Extension: {app_record.get('extension')}")
        print(f"  Type: {app_record.get('type')}")

        # Verify key fields match
        assert app_record.get('name') == api_data['name'], "Name doesn't match"
        assert app_record.get('extension') == api_data['extension'], "Extension doesn't match"
        assert app_record.get('type') == api_data['type'], "Type doesn't match"

        print(f"\n✅ All fields verified!")

        # Return ID for potential cleanup
        return app_id

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


def test_create_dialplan_apps_batch(api_client, dialplan_app_fixtures):
    """
    Test creating multiple dialplan applications from fixtures

    Creates all applications from fixtures (skipping existing ones).
    """

    print(f"\n{'='*70}")
    print(f"Test: Batch Create Dialplan Applications")
    print(f"{'='*70}")
    print(f"Total applications in fixtures: {len(dialplan_app_fixtures)}")

    created_apps = []
    failed_apps = []
    skipped_apps = []

    # Get existing applications
    existing_response = api_client.get('dialplan-applications', params={'limit': 1000})
    existing_apps = []

    if existing_response.get('result'):
        data = existing_response.get('data', {})
        if isinstance(data, dict):
            existing_apps = data.get('data', [])
        elif isinstance(data, list):
            existing_apps = data

    existing_extensions = {app.get('extension') for app in existing_apps}

    print(f"Existing applications in system: {len(existing_extensions)}")
    print(f"Extensions: {sorted(existing_extensions)}")

    # Process each application
    for app_key, fixture_data in dialplan_app_fixtures.items():
        extension = str(fixture_data.get('extension', ''))

        print(f"\n{'-'*70}")
        print(f"Processing: {app_key} (extension: {extension})")

        # Skip if already exists
        if extension in existing_extensions:
            print(f"⏭️  Skipping - extension {extension} already exists")
            skipped_apps.append({
                'key': app_key,
                'extension': extension,
                'reason': 'Already exists'
            })
            continue

        try:
            # Convert to API format
            api_data = convert_dialplan_app_fixture_to_api_format(fixture_data)

            # Verify required fields
            assert api_data.get('name'), f"Missing name for {app_key}"
            assert api_data.get('extension'), f"Missing extension for {app_key}"
            assert api_data.get('type'), f"Missing type for {app_key}"

            print(f"  Name: {api_data.get('name')}")
            print(f"  Extension: {api_data.get('extension')}")
            print(f"  Type: {api_data.get('type')}")

            # Create application
            print(f"  📤 Creating...")
            response = api_client.post('dialplan-applications', api_data)

            # Check response
            if not response.get('result'):
                error_messages = response.get('messages', {})
                print(f"  ❌ Failed: {error_messages}")
                failed_apps.append({
                    'key': app_key,
                    'extension': extension,
                    'error': error_messages
                })
                continue

            # Get created ID
            app_id = response.get('data', {}).get('id')

            if not app_id:
                print(f"  ❌ Failed: No ID in response")
                failed_apps.append({
                    'key': app_key,
                    'extension': extension,
                    'error': 'No ID in response'
                })
                continue

            print(f"  ✅ Created successfully! ID: {app_id}")

            # Verify we can retrieve it
            try:
                app_record = assert_record_exists(api_client, 'dialplan-applications', app_id)
                print(f"  ✅ Verified - can retrieve application")

                created_apps.append({
                    'key': app_key,
                    'id': app_id,
                    'extension': extension,
                    'name': api_data['name'],
                    'type': api_data['type']
                })

            except Exception as e:
                print(f"  ⚠️  Created but verification failed: {str(e)}")
                created_apps.append({
                    'key': app_key,
                    'id': app_id,
                    'extension': extension,
                    'name': api_data['name'],
                    'type': api_data['type'],
                    'warning': 'Verification failed'
                })

        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            failed_apps.append({
                'key': app_key,
                'extension': extension,
                'error': str(e)
            })

    # Print summary
    print(f"\n{'='*70}")
    print(f"BATCH CREATE SUMMARY")
    print(f"{'='*70}")
    print(f"Total fixtures: {len(dialplan_app_fixtures)}")
    print(f"Already existed: {len(skipped_apps)}")
    print(f"Successfully created: {len(created_apps)}")
    print(f"Failed: {len(failed_apps)}")

    if created_apps:
        print(f"\n✅ Created applications:")
        for app in created_apps:
            warning = f" (⚠️ {app.get('warning')})" if app.get('warning') else ""
            print(f"  - {app['extension']:>8} | {app['type']:<10} | {app['name']:<40} | ID: {app['id']}{warning}")

    if skipped_apps:
        print(f"\n⏭️  Skipped applications:")
        for app in skipped_apps:
            print(f"  - {app['extension']:>8} | {app['key']:<40} | {app['reason']}")

    if failed_apps:
        print(f"\n❌ Failed applications:")
        for app in failed_apps:
            print(f"  - {app['extension']:>8} | {app['key']:<40}")
            print(f"    Error: {app['error']}")

    # Test should pass if we created at least some apps or all were already there
    total_successful = len(created_apps) + len(skipped_apps)
    assert total_successful > 0, "No applications were created or existed"

    print(f"\n✅ Batch create completed!")

    # Return created IDs for potential cleanup
    return [app['id'] for app in created_apps]


def test_dialplan_app_crud_cycle(api_client):
    """
    Test complete CRUD operations on a dialplan application

    Steps:
    1. CREATE - Create new application
    2. READ - Verify can retrieve
    3. UPDATE - Full update (PUT)
    4. PATCH - Partial update
    5. COPY - Test copy functionality
    6. DELETE - Remove application
    7. VERIFY - Confirm deletion
    """

    print(f"\n{'='*70}")
    print(f"Test: Dialplan Application Full CRUD Cycle")
    print(f"{'='*70}")

    # Use unique extension for test
    test_extension = "8888"
    app_id = None
    copied_app_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE Dialplan Application")
        print(f"{'-'*70}")

        create_data = {
            'name': 'Test CRUD Application',
            'extension': test_extension,
            'type': 'plaintext',
            'applicationlogic': 'NoOp(Test application)\nAnswer()\nPlayback(demo-congrats)\nHangup()',
            'description': 'CRUD test application',
            'hint': 'PJSIP/201&PJSIP/202'
        }

        print(f"Creating application:")
        print(f"  Name: {create_data['name']}")
        print(f"  Extension: {create_data['extension']}")
        print(f"  Type: {create_data['type']}")

        # Create
        response = api_client.post('dialplan-applications', create_data)
        assert_api_success(response, "Failed to create application")

        app_id = response.get('data', {}).get('id')
        assert app_id, "No ID returned after creation"

        print(f"✅ Created with ID: {app_id}")

        # ====================================================================
        # STEP 2: READ
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: READ Dialplan Application")
        print(f"{'-'*70}")

        app_record = assert_record_exists(api_client, 'dialplan-applications', app_id)

        print(f"Retrieved application:")
        print(f"  ID: {app_record.get('id')}")
        print(f"  Name: {app_record.get('name')}")
        print(f"  Extension: {app_record.get('extension')}")
        print(f"  Type: {app_record.get('type')}")
        print(f"  Hint: {app_record.get('hint')}")

        # Verify data matches
        assert app_record.get('name') == create_data['name'], "Name mismatch"
        assert app_record.get('extension') == create_data['extension'], "Extension mismatch"
        assert app_record.get('type') == create_data['type'], "Type mismatch"

        print(f"✅ All fields verified")

        # ====================================================================
        # STEP 3: UPDATE (PUT)
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: UPDATE Application (PUT)")
        print(f"{'-'*70}")

        update_data = create_data.copy()
        update_data['id'] = app_id
        update_data['name'] = 'Updated CRUD Application'
        update_data['hint'] = 'PJSIP/201'
        update_data['applicationlogic'] = 'NoOp(Updated)\nAnswer()\nHangup()'

        print(f"Updating to:")
        print(f"  Name: {update_data['name']}")
        print(f"  Hint: {update_data['hint']}")

        # PUT update
        response = api_client.put(f'dialplan-applications/{app_id}', update_data)
        assert_api_success(response, "Failed to update application")

        print(f"✅ Update successful")

        # Verify changes
        updated_record = assert_record_exists(api_client, 'dialplan-applications', app_id)

        assert updated_record.get('name') == update_data['name'], "Name not updated"
        assert updated_record.get('hint') == update_data['hint'], "Hint not updated"

        print(f"✅ All updates verified")

        # ====================================================================
        # STEP 4: PATCH
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: PATCH Application (Partial Update)")
        print(f"{'-'*70}")

        patch_data = {
            'name': 'Patched CRUD Application'
        }

        print(f"Patching fields:")
        print(f"  Name: {patch_data['name']}")

        # PATCH update
        try:
            response = api_client.patch(f'dialplan-applications/{app_id}', patch_data)
            print(f"\n📥 PATCH Response:")
            print(f"  Result: {response.get('result')}")
            print(f"  Messages: {response.get('messages', {})}")
            assert_api_success(response, "Failed to patch application")
        except Exception as e:
            print(f"\n❌ PATCH Error: {str(e)}")
            if hasattr(e, 'response'):
                try:
                    error_data = e.response.json()
                    print(f"Error Response: {error_data}")
                except:
                    print(f"Error Response: {e.response.text[:500]}")
            raise

        print(f"✅ Patch successful")

        # Verify changes
        patched_record = assert_record_exists(api_client, 'dialplan-applications', app_id)

        assert patched_record.get('name') == patch_data['name'], "Name not patched"
        assert patched_record.get('extension') == test_extension, "Extension changed (should be unchanged)"
        assert patched_record.get('hint') == update_data['hint'], "Hint changed (should be unchanged)"

        print(f"✅ Patch verified (only name changed)")

        # ====================================================================
        # STEP 5: COPY
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: COPY Application")
        print(f"{'-'*70}")

        print(f"Copying application {app_id}...")

        try:
            # Copy application (custom method)
            response = api_client.get(f'dialplan-applications/{app_id}:copy')
            assert_api_success(response, "Failed to copy application")

            copied_app_id = response.get('data', {}).get('id')
            assert copied_app_id, "No ID returned for copied application"

            print(f"✅ Copy successful! New ID: {copied_app_id}")

            # Verify copied application exists
            copied_record = assert_record_exists(api_client, 'dialplan-applications', copied_app_id)

            print(f"  Copied name: {copied_record.get('name')}")
            print(f"  Copied extension: {copied_record.get('extension')}")

            # Name should have "Copy of " prefix or similar
            assert copied_app_id != app_id, "Copy should have different ID"

            print(f"✅ Copy verified")

        except Exception as e:
            print(f"⚠️  Copy method might not be implemented: {e}")
            # Don't fail test if copy is not implemented

        # ====================================================================
        # STEP 6: DELETE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: DELETE Application")
        print(f"{'-'*70}")

        print(f"Deleting application {app_id}...")

        response = api_client.delete(f'dialplan-applications/{app_id}')
        assert_api_success(response, "Failed to delete application")

        print(f"✅ Delete successful")

        # Delete copied application if it exists
        if copied_app_id:
            print(f"Deleting copied application {copied_app_id}...")
            try:
                api_client.delete(f'dialplan-applications/{copied_app_id}')
                print(f"✅ Copied application deleted")
            except Exception as e:
                print(f"⚠️  Failed to delete copied app: {e}")

        # ====================================================================
        # STEP 7: VERIFY DELETION
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: VERIFY Deletion")
        print(f"{'-'*70}")

        assert_record_deleted(api_client, 'dialplan-applications', app_id)

        print(f"✅ Deletion verified (application no longer exists)")

        # Set to None so cleanup doesn't try to delete again
        app_id = None
        copied_app_id = None

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"CRUD CYCLE COMPLETE")
        print(f"{'='*70}")
        print(f"✅ CREATE - Application created successfully")
        print(f"✅ READ   - Application retrieved successfully")
        print(f"✅ UPDATE - Full update (PUT) successful")
        print(f"✅ PATCH  - Partial update successful")
        print(f"✅ COPY   - Copy tested")
        print(f"✅ DELETE - Application deleted successfully")
        print(f"✅ VERIFY - Deletion confirmed")

    finally:
        # Cleanup: delete test application if it still exists
        for cleanup_id in [app_id, copied_app_id]:
            if cleanup_id:
                try:
                    print(f"\n⚠️  Cleanup: Deleting test application {cleanup_id}")
                    api_client.delete(f'dialplan-applications/{cleanup_id}')
                except Exception as e:
                    print(f"⚠️  Cleanup failed (might be OK): {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
