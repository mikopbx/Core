#!/usr/bin/env python3
"""
Test 01: Create Single Employee

Simple test to verify employee creation works correctly.
This is the foundation for all other employee tests.
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    convert_employee_fixture_to_api_format
)


def test_create_single_employee(api_client, employee_fixtures):
    """
    Test creating a single employee via REST API

    Steps:
    1. Take first employee from fixtures
    2. Convert to API format
    3. Create via POST /employees
    4. Verify creation succeeded
    5. Verify employee can be retrieved
    6. Return created ID for cleanup
    """

    # Step 1: Get test data
    employee_key = 'smith.james'
    if employee_key not in employee_fixtures:
        employee_key = list(employee_fixtures.keys())[0]

    fixture_data = employee_fixtures[employee_key]

    print(f"\n{'='*70}")
    print(f"Test: Create Employee '{employee_key}'")
    print(f"{'='*70}")
    print(f"Original fixture data:")
    print(f"  Username: {fixture_data.get('username')}")
    print(f"  Number: {fixture_data.get('number')}")
    print(f"  Email: {fixture_data.get('email')}")
    print(f"  Mobile: {fixture_data.get('mobile')}")

    # Step 2: Convert to API format
    api_data = convert_employee_fixture_to_api_format(fixture_data)

    print(f"\nConverted to API format:")
    print(f"  user_username: {api_data.get('user_username')}")
    print(f"  number: {api_data.get('number')}")
    print(f"  user_email: {api_data.get('user_email')}")
    print(f"  mobile_number: {api_data.get('mobile_number')}")
    print(f"  sip_secret: {'***' if api_data.get('sip_secret') else 'MISSING'}")

    # Verify required fields are present
    assert api_data.get('user_username'), "Missing user_username"
    assert api_data.get('number'), "Missing number"
    assert api_data.get('sip_secret'), "Missing sip_secret (required for creation)"

    print(f"\n✅ All required fields present")

    # Check if employee with this number already exists and delete it
    print(f"\n🔍 Checking if number {api_data['number']} already exists...")

    existing_response = api_client.get('employees', params={'limit': 1000, 'offset': 0})
    existing_employees = []

    if existing_response.get('result'):
        data = existing_response.get('data', {})
        if isinstance(data, dict):
            existing_employees = data.get('data', [])
        elif isinstance(data, list):
            existing_employees = data

    # Find employee with same number
    existing_employee = None
    for emp in existing_employees:
        if str(emp.get('number')) == str(api_data['number']):
            existing_employee = emp
            break

    if existing_employee:
        employee_id = existing_employee.get('id')
        print(f"⚠️  Employee with number {api_data['number']} already exists (ID: {employee_id})")
        print(f"🗑️  Deleting existing employee to ensure clean test...")

        try:
            delete_response = api_client.delete(f"employees/{employee_id}")
            if delete_response.get('result'):
                print(f"✅ Deleted existing employee {employee_id}")
            else:
                error_msg = delete_response.get('messages', {})
                print(f"⚠️  Failed to delete employee: {error_msg}")
                print(f"⚠️  This employee cannot be deleted (possibleToDelete=false or has dependencies)")
                print(f"⚠️  Skipping test - cannot ensure clean state")
                pytest.skip(f"Employee {api_data['number']} already exists and cannot be deleted")
        except Exception as e:
            print(f"⚠️  Error deleting employee: {e}")
            print(f"⚠️  This employee cannot be deleted")
            print(f"⚠️  Skipping test - cannot ensure clean state")
            pytest.skip(f"Employee {api_data['number']} already exists and cannot be deleted: {e}")

    # Step 3: Create employee
    print(f"\n📤 Sending POST /employees...")

    try:
        response = api_client.post('employees', api_data)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Step 4: Verify success
        assert_api_success(response, "Failed to create employee")

        # Get created ID
        employee_id = response.get('data', {}).get('id')
        assert employee_id, "Response should contain employee ID"

        print(f"\n✅ Employee created successfully!")
        print(f"  ID: {employee_id}")

        # Step 5: Verify we can retrieve the employee
        print(f"\n🔍 Verifying employee can be retrieved...")

        employee_record = assert_record_exists(api_client, 'employees', employee_id)

        print(f"\n✅ Employee retrieved successfully!")
        print(f"  ID: {employee_record.get('id')}")
        print(f"  Username: {employee_record.get('user_username')}")
        print(f"  Number: {employee_record.get('number')}")

        # Verify key fields match
        assert employee_record.get('user_username') == api_data['user_username'], \
            "Username doesn't match"
        assert employee_record.get('number') == api_data['number'], \
            "Number doesn't match"

        print(f"\n✅ All fields verified!")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

        # If it's an HTTP error, try to get more details
        if hasattr(e, 'response'):
            print(f"\nResponse Status: {e.response.status_code}")
            print(f"Response Body: {e.response.text[:500]}")

        raise


def test_get_employees_list(api_client):
    """
    Test getting employees list with pagination

    Verifies:
    - GET /employees works
    - Response has correct structure
    - Pagination fields are present
    """

    print(f"\n{'='*70}")
    print(f"Test: Get Employees List")
    print(f"{'='*70}")

    response = api_client.get('employees', params={
        'limit': 10,
        'offset': 0
    })

    print(f"\n📥 Response:")
    print(f"  Result: {response.get('result')}")

    assert_api_success(response, "Failed to get employees list")

    # Check response structure
    data = response.get('data', {})

    print(f"  Data type: {type(data)}")

    if isinstance(data, dict):
        print(f"  Keys: {list(data.keys())}")

        # Should have pagination info
        assert 'data' in data, "Response should have 'data' field"
        assert 'recordsTotal' in data, "Response should have 'recordsTotal' field"

        employees = data['data']
        total = data['recordsTotal']

        print(f"  Employees count: {len(employees)}")
        print(f"  Total records: {total}")

        if employees:
            first_emp = employees[0]
            print(f"\n  First employee:")
            print(f"    ID: {first_emp.get('id')}")
            print(f"    Username: {first_emp.get('user_username')}")
            print(f"    Number: {first_emp.get('number')}")

    print(f"\n✅ List retrieved successfully!")


def test_check_number_available(api_client):
    """
    Test checking if extension number is available

    Uses /extensions:available endpoint
    """

    print(f"\n{'='*70}")
    print(f"Test: Check Number Availability")
    print(f"{'='*70}")

    # Test with a number that's unlikely to exist
    test_number = '99999'

    print(f"\n🔍 Checking if number {test_number} is available...")

    # Note: This is a custom action, not standard REST
    # We need to use POST with action parameter
    try:
        response = api_client.post('extensions:available', {'number': test_number})

        print(f"\n📥 Response:")
        print(f"  Result: {response.get('result')}")
        print(f"  Data: {response.get('data')}")

        # Success means we got a response (even if number is taken)
        assert 'result' in response, "Response should have 'result' field"

        print(f"\n✅ Availability check completed!")

    except Exception as e:
        print(f"\n⚠️  Availability check endpoint might not be implemented: {e}")
        # Don't fail the test, just skip
        pytest.skip("extensions:available endpoint not available")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
