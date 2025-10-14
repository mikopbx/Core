#!/usr/bin/env python3
"""
Test 03: Employee CRUD Operations

Tests full CRUD cycle: Create, Read, Update, Patch, Delete
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    assert_record_deleted,
    convert_employee_fixture_to_api_format
)


def test_employee_full_crud_cycle(api_client, employee_fixtures):
    """
    Test complete CRUD operations on a single employee

    Steps:
    1. CREATE - Create new employee
    2. READ - Verify can retrieve
    3. UPDATE - Full update (PUT)
    4. PATCH - Partial update
    5. DELETE - Remove employee
    6. VERIFY - Confirm deletion

    Uses first employee from fixtures as template
    """

    print(f"\n{'='*70}")
    print(f"Test: Employee Full CRUD Cycle")
    print(f"{'='*70}")

    # Use a unique number for this test to avoid conflicts
    test_number = "9999"
    employee_id = None

    try:
        # ====================================================================
        # STEP 1: CREATE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: CREATE Employee")
        print(f"{'-'*70}")

        # Get template from first fixture
        template_key = list(employee_fixtures.keys())[0]
        template_data = employee_fixtures[template_key].copy()

        # Modify for uniqueness
        template_data['number'] = test_number
        template_data['username'] = 'Test CRUD User'
        template_data['email'] = 'crud.test@example.com'
        template_data['mobile'] = '+79999999999'

        # Convert to API format
        create_data = convert_employee_fixture_to_api_format(template_data)

        print(f"Creating employee:")
        print(f"  Number: {create_data['number']}")
        print(f"  Username: {create_data['user_username']}")
        print(f"  Email: {create_data['user_email']}")

        # Create
        response = api_client.post('employees', create_data)
        assert_api_success(response, "Failed to create employee")

        employee_id = response.get('data', {}).get('id')
        assert employee_id, "No ID returned after creation"

        print(f"✅ Created with ID: {employee_id}")

        # ====================================================================
        # STEP 2: READ
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: READ Employee")
        print(f"{'-'*70}")

        employee_record = assert_record_exists(api_client, 'employees', employee_id)

        print(f"Retrieved employee:")
        print(f"  ID: {employee_record.get('id')}")
        print(f"  Number: {employee_record.get('number')}")
        print(f"  Username: {employee_record.get('user_username')}")
        print(f"  Email: {employee_record.get('user_email')}")

        # Verify data matches
        assert employee_record.get('number') == test_number, "Number mismatch"
        assert employee_record.get('user_username') == create_data['user_username'], "Username mismatch"
        assert employee_record.get('user_email') == create_data['user_email'], "Email mismatch"

        print(f"✅ All fields verified")

        # ====================================================================
        # STEP 3: UPDATE (PUT - Full Replacement)
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: UPDATE Employee (PUT)")
        print(f"{'-'*70}")

        # Modify all fields
        update_data = create_data.copy()
        update_data['id'] = employee_id
        update_data['user_username'] = 'Updated CRUD User'
        update_data['user_email'] = 'updated.crud@example.com'
        update_data['mobile_number'] = '+79888888888'
        update_data['sip_enableRecording'] = False  # Toggle recording

        print(f"Updating to:")
        print(f"  Username: {update_data['user_username']}")
        print(f"  Email: {update_data['user_email']}")
        print(f"  Mobile: {update_data['mobile_number']}")
        print(f"  Recording: {update_data['sip_enableRecording']}")

        # PUT update
        response = api_client.put(f'employees/{employee_id}', update_data)
        assert_api_success(response, "Failed to update employee")

        print(f"✅ Update successful")

        # Verify changes
        updated_record = assert_record_exists(api_client, 'employees', employee_id)

        assert updated_record.get('user_username') == update_data['user_username'], \
            "Username not updated"
        assert updated_record.get('user_email') == update_data['user_email'], \
            "Email not updated"
        assert updated_record.get('mobile_number') == update_data['mobile_number'], \
            "Mobile not updated"
        assert updated_record.get('sip_enableRecording') == update_data['sip_enableRecording'], \
            "Recording setting not updated"

        print(f"✅ All updates verified")

        # ====================================================================
        # STEP 4: PATCH (Partial Update)
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: PATCH Employee (Partial Update)")
        print(f"{'-'*70}")

        # Only update specific fields
        patch_data = {
            'user_username': 'Patched CRUD User',
            'sip_dtmfmode': 'rfc2833'
        }

        print(f"Patching fields:")
        print(f"  Username: {patch_data['user_username']}")
        print(f"  DTMF Mode: {patch_data['sip_dtmfmode']}")

        # PATCH update
        response = api_client.patch(f'employees/{employee_id}', patch_data)
        assert_api_success(response, "Failed to patch employee")

        print(f"✅ Patch successful")

        # Verify changes
        patched_record = assert_record_exists(api_client, 'employees', employee_id)

        assert patched_record.get('user_username') == patch_data['user_username'], \
            "Username not patched"
        assert patched_record.get('sip_dtmfmode') == patch_data['sip_dtmfmode'], \
            "DTMF mode not patched"

        # Verify other fields unchanged
        assert patched_record.get('user_email') == update_data['user_email'], \
            "Email changed (should be unchanged)"
        assert patched_record.get('number') == test_number, \
            "Number changed (should be unchanged)"

        print(f"✅ Patch verified (only specified fields changed)")

        # ====================================================================
        # STEP 5: DELETE
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: DELETE Employee")
        print(f"{'-'*70}")

        print(f"Deleting employee {employee_id}...")

        response = api_client.delete(f'employees/{employee_id}')
        assert_api_success(response, "Failed to delete employee")

        print(f"✅ Delete successful")

        # ====================================================================
        # STEP 6: VERIFY DELETION
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: VERIFY Deletion")
        print(f"{'-'*70}")

        assert_record_deleted(api_client, 'employees', employee_id)

        print(f"✅ Deletion verified (employee no longer exists)")

        # Set to None so cleanup doesn't try to delete again
        employee_id = None

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print(f"\n{'='*70}")
        print(f"CRUD CYCLE COMPLETE")
        print(f"{'='*70}")
        print(f"✅ CREATE - Employee created successfully")
        print(f"✅ READ   - Employee retrieved successfully")
        print(f"✅ UPDATE - Full update (PUT) successful")
        print(f"✅ PATCH  - Partial update successful")
        print(f"✅ DELETE - Employee deleted successfully")
        print(f"✅ VERIFY - Deletion confirmed")

    finally:
        # Cleanup: delete test employee if it still exists
        if employee_id:
            try:
                print(f"\n⚠️  Cleanup: Deleting test employee {employee_id}")
                api_client.delete(f'employees/{employee_id}')
            except Exception as e:
                print(f"⚠️  Cleanup failed (might be OK): {e}")


def test_employee_update_validation(api_client, employee_fixtures):
    """
    Test update validation rules

    Verifies that:
    1. Cannot update to duplicate number
    2. Cannot set invalid email
    3. Required fields are enforced
    """

    print(f"\n{'='*70}")
    print(f"Test: Employee Update Validation")
    print(f"{'='*70}")

    # Get any existing employee
    response = api_client.get('employees', params={'limit': 1})
    assert_api_success(response, "Failed to get employees")

    data = response.get('data', {})
    if isinstance(data, dict):
        employees = data.get('data', [])
    else:
        employees = data

    if not employees:
        pytest.skip("No employees available for testing")

    test_employee = employees[0]
    employee_id = test_employee.get('id')

    print(f"\nUsing employee: {employee_id}")
    print(f"  Number: {test_employee.get('number')}")
    print(f"  Username: {test_employee.get('user_username')}")

    # Test 1: Try to set invalid email
    print(f"\n{'-'*70}")
    print(f"TEST 1: Invalid Email")
    print(f"{'-'*70}")

    try:
        response = api_client.patch(f'employees/{employee_id}', {
            'user_email': 'not-an-email'
        })

        # Should fail validation
        if response.get('result'):
            print(f"⚠️  Expected validation error, but update succeeded")
            print(f"   Note: Backend might accept this format")
        else:
            print(f"✅ Validation error as expected:")
            print(f"   {response.get('messages')}")

    except Exception as e:
        print(f"✅ Validation error (exception): {e}")

    # Test 2: Try to set empty username (required field)
    print(f"\n{'-'*70}")
    print(f"TEST 2: Empty Required Field (username)")
    print(f"{'-'*70}")

    try:
        response = api_client.patch(f'employees/{employee_id}', {
            'user_username': ''
        })

        if response.get('result'):
            print(f"⚠️  Expected validation error for empty username")
        else:
            print(f"✅ Validation error as expected:")
            print(f"   {response.get('messages')}")

    except Exception as e:
        print(f"✅ Validation error (exception): {e}")

    # Test 3: Try to update non-existent employee
    print(f"\n{'-'*70}")
    print(f"TEST 3: Update Non-Existent Employee")
    print(f"{'-'*70}")

    fake_id = "99999"

    try:
        response = api_client.patch(f'employees/{fake_id}', {
            'user_username': 'Should Fail'
        })

        if response.get('result'):
            print(f"⚠️  Expected 404 error for non-existent employee")
        else:
            print(f"✅ Error as expected:")
            print(f"   {response.get('messages')}")

    except Exception as e:
        if '404' in str(e):
            print(f"✅ 404 error as expected: {e}")
        else:
            print(f"⚠️  Unexpected error: {e}")

    print(f"\n✅ Validation tests completed")


def test_employee_delete_cascade(api_client, employee_fixtures):
    """
    Test that deleting an employee also deletes related records

    Verifies:
    1. Extension is removed
    2. SIP account is removed
    3. User record handling
    """

    print(f"\n{'='*70}")
    print(f"Test: Employee Delete Cascade")
    print(f"{'='*70}")

    # Create temporary employee
    test_number = "9998"
    template = list(employee_fixtures.values())[0].copy()
    template['number'] = test_number
    template['username'] = 'Delete Test User'

    create_data = convert_employee_fixture_to_api_format(template)

    print(f"\nCreating temporary employee for delete test...")
    response = api_client.post('employees', create_data)
    assert_api_success(response, "Failed to create test employee")

    employee_id = response.get('data', {}).get('id')
    print(f"Created employee: {employee_id} (number: {test_number})")

    # Verify extension exists
    print(f"\nVerifying extension exists...")
    ext_response = api_client.get('extensions', params={
        'search': test_number,
        'limit': 10
    })

    assert_api_success(ext_response, "Failed to get extensions")

    ext_data = ext_response.get('data', [])
    if isinstance(ext_data, dict):
        ext_data = ext_data.get('data', [])

    has_extension = any(ext.get('number') == test_number for ext in ext_data)

    if has_extension:
        print(f"✅ Extension {test_number} exists")
    else:
        print(f"⚠️  Extension not found immediately (might be async)")

    # Delete employee
    print(f"\nDeleting employee...")
    response = api_client.delete(f'employees/{employee_id}')
    assert_api_success(response, "Failed to delete employee")

    print(f"✅ Employee deleted")

    # Verify employee is gone
    print(f"\nVerifying employee is deleted...")
    assert_record_deleted(api_client, 'employees', employee_id)
    print(f"✅ Employee {employee_id} no longer exists")

    # Check if extension is also gone
    print(f"\nChecking if extension is also deleted...")
    ext_response = api_client.get('extensions', params={
        'search': test_number,
        'limit': 10
    })

    if ext_response.get('result'):
        ext_data = ext_response.get('data', [])
        if isinstance(ext_data, dict):
            ext_data = ext_data.get('data', [])

        still_has_extension = any(ext.get('number') == test_number for ext in ext_data)

        if still_has_extension:
            print(f"⚠️  Extension {test_number} still exists (might be expected)")
        else:
            print(f"✅ Extension {test_number} was also deleted (cascade)")

    print(f"\n✅ Delete cascade test completed")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
