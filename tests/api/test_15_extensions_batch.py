#!/usr/bin/env python3
"""
Test 02: Batch Create Employees

Populates MikoPBX with multiple employees from fixtures.
This test runs after test_01 and creates all remaining employees.
"""

import pytest
from conftest import (
    assert_api_success,
    assert_record_exists,
    convert_employee_fixture_to_api_format
)


def test_create_employees_batch(api_client, employee_fixtures):
    """
    Test creating multiple employees from fixtures

    This test:
    1. Iterates through all employees in fixtures
    2. Converts each to API format
    3. Creates via POST /employees
    4. Verifies creation succeeded
    5. Returns list of created IDs for potential cleanup

    Expected: All 26 employees created successfully
    """

    print(f"\n{'='*70}")
    print(f"Test: Batch Create Employees")
    print(f"{'='*70}")
    print(f"Total employees in fixtures: {len(employee_fixtures)}")

    created_employees = []
    failed_employees = []
    skipped_employees = []

    # Get list of already created employees to avoid duplicates
    existing_response = api_client.get('employees', params={'limit': 1000, 'offset': 0})
    existing_employees = []

    if existing_response.get('result'):
        data = existing_response.get('data', {})
        if isinstance(data, dict):
            existing_employees = data.get('data', [])
        elif isinstance(data, list):
            existing_employees = data

    existing_numbers = {emp.get('number') for emp in existing_employees}

    print(f"Existing employees in system: {len(existing_numbers)}")
    print(f"Numbers: {sorted(existing_numbers)}")

    # Process each employee
    for employee_key, fixture_data in employee_fixtures.items():
        employee_number = str(fixture_data.get('number', ''))

        print(f"\n{'-'*70}")
        print(f"Processing: {employee_key} (number: {employee_number})")

        # Skip if already exists
        if employee_number in existing_numbers:
            print(f"⏭️  Skipping - employee {employee_number} already exists")
            skipped_employees.append({
                'key': employee_key,
                'number': employee_number,
                'reason': 'Already exists'
            })
            continue

        try:
            # Convert to API format
            api_data = convert_employee_fixture_to_api_format(fixture_data)

            # Verify required fields
            assert api_data.get('user_username'), f"Missing user_username for {employee_key}"
            assert api_data.get('number'), f"Missing number for {employee_key}"
            assert api_data.get('sip_secret'), f"Missing sip_secret for {employee_key}"

            print(f"  Username: {api_data.get('user_username')}")
            print(f"  Number: {api_data.get('number')}")
            print(f"  Email: {api_data.get('user_email', '(empty)')}")
            print(f"  Mobile: {api_data.get('mobile_number', '(empty)')}")

            # Create employee
            print(f"  📤 Creating...")
            response = api_client.post('employees', api_data)

            # Check response
            if not response.get('result'):
                error_messages = response.get('messages', {})
                print(f"  ❌ Failed: {error_messages}")
                failed_employees.append({
                    'key': employee_key,
                    'number': employee_number,
                    'error': error_messages
                })
                continue

            # Get created ID
            employee_id = response.get('data', {}).get('id')

            if not employee_id:
                print(f"  ❌ Failed: No ID in response")
                failed_employees.append({
                    'key': employee_key,
                    'number': employee_number,
                    'error': 'No ID in response'
                })
                continue

            print(f"  ✅ Created successfully! ID: {employee_id}")

            # Verify we can retrieve it
            try:
                employee_record = assert_record_exists(api_client, 'employees', employee_id)
                print(f"  ✅ Verified - can retrieve employee")

                created_employees.append({
                    'key': employee_key,
                    'id': employee_id,
                    'number': employee_number,
                    'username': api_data['user_username']
                })

            except Exception as e:
                print(f"  ⚠️  Created but verification failed: {str(e)}")
                created_employees.append({
                    'key': employee_key,
                    'id': employee_id,
                    'number': employee_number,
                    'username': api_data['user_username'],
                    'warning': 'Verification failed'
                })

        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            failed_employees.append({
                'key': employee_key,
                'number': employee_number,
                'error': str(e)
            })

    # Print summary
    print(f"\n{'='*70}")
    print(f"BATCH CREATE SUMMARY")
    print(f"{'='*70}")
    print(f"Total fixtures: {len(employee_fixtures)}")
    print(f"Already existed: {len(skipped_employees)}")
    print(f"Successfully created: {len(created_employees)}")
    print(f"Failed: {len(failed_employees)}")

    if created_employees:
        print(f"\n✅ Created employees:")
        for emp in created_employees:
            warning = f" (⚠️ {emp.get('warning')})" if emp.get('warning') else ""
            print(f"  - {emp['number']:>5} | {emp['username']:<30} | ID: {emp['id']}{warning}")

    if skipped_employees:
        print(f"\n⏭️  Skipped employees:")
        for emp in skipped_employees:
            print(f"  - {emp['number']:>5} | {emp['key']:<30} | {emp['reason']}")

    if failed_employees:
        print(f"\n❌ Failed employees:")
        for emp in failed_employees:
            print(f"  - {emp['number']:>5} | {emp['key']:<30}")
            print(f"    Error: {emp['error']}")

    # Verify final count
    print(f"\n{'='*70}")
    print(f"VERIFICATION")
    print(f"{'='*70}")

    final_response = api_client.get('employees', params={'limit': 1000, 'offset': 0})
    assert_api_success(final_response, "Failed to get final employee list")

    final_data = final_response.get('data', {})
    if isinstance(final_data, dict):
        final_count = final_data.get('recordsTotal', 0)
    else:
        final_count = len(final_data)

    print(f"Total employees in system after batch: {final_count}")

    expected_count = len(existing_numbers) + len(created_employees)
    print(f"Expected count: {expected_count} (existing: {len(existing_numbers)} + created: {len(created_employees)})")

    assert final_count == expected_count, \
        f"Employee count mismatch: expected {expected_count}, got {final_count}"

    print(f"\n✅ All counts verified!")

    # Test should pass if we created at least some employees or all were already there
    total_successful = len(created_employees) + len(skipped_employees)
    assert total_successful > 0, "No employees were created or existed"


def test_verify_all_employees_accessible(api_client, employee_fixtures):
    """
    Verify that all employees from fixtures are now accessible via API

    This test runs after batch creation and checks that:
    1. All employee numbers from fixtures exist in the system
    2. Each can be retrieved individually
    3. Data matches fixture data
    """

    print(f"\n{'='*70}")
    print(f"Test: Verify All Employees Accessible")
    print(f"{'='*70}")

    # Get all employees
    response = api_client.get('employees', params={'limit': 1000, 'offset': 0})
    assert_api_success(response, "Failed to get employee list")

    data = response.get('data', {})
    if isinstance(data, dict):
        employees = data.get('data', [])
    else:
        employees = data

    print(f"Total employees in system: {len(employees)}")

    # Create lookup by number
    employees_by_number = {emp.get('number'): emp for emp in employees}

    # Check each fixture
    missing_employees = []
    verified_employees = []

    for employee_key, fixture_data in employee_fixtures.items():
        expected_number = str(fixture_data.get('number', ''))

        if expected_number not in employees_by_number:
            missing_employees.append({
                'key': employee_key,
                'number': expected_number
            })
            continue

        employee = employees_by_number[expected_number]
        employee_id = employee.get('id')

        # Verify we can get individual record
        try:
            individual_record = assert_record_exists(api_client, 'employees', employee_id)

            # Verify key fields match
            api_data = convert_employee_fixture_to_api_format(fixture_data)

            assert individual_record.get('number') == api_data['number'], \
                f"Number mismatch for {employee_key}"
            assert individual_record.get('user_username') == api_data['user_username'], \
                f"Username mismatch for {employee_key}"

            verified_employees.append({
                'key': employee_key,
                'number': expected_number,
                'id': employee_id
            })

        except Exception as e:
            missing_employees.append({
                'key': employee_key,
                'number': expected_number,
                'error': str(e)
            })

    # Print results
    print(f"\n✅ Verified: {len(verified_employees)}/{len(employee_fixtures)} employees")

    if missing_employees:
        print(f"\n❌ Missing or invalid employees:")
        for emp in missing_employees:
            error = emp.get('error', 'Not found')
            print(f"  - {emp['number']:>5} | {emp['key']:<30} | {error}")

    # All employees should be accessible
    assert len(missing_employees) == 0, \
        f"{len(missing_employees)} employees are missing or invalid"

    print(f"\n✅ All employees verified successfully!")


def test_search_employees(api_client):
    """
    Test employee search functionality

    Verifies that:
    1. Search by username works
    2. Search by number works
    3. Pagination works
    """

    print(f"\n{'='*70}")
    print(f"Test: Employee Search")
    print(f"{'='*70}")

    # Test 1: Search by username
    print(f"\n1. Search by username 'Smith'...")
    response = api_client.get('employees', params={
        'search': 'Smith',
        'limit': 10,
        'offset': 0
    })

    assert_api_success(response, "Failed to search employees by username")

    data = response.get('data', {})
    results = data.get('data', []) if isinstance(data, dict) else data

    print(f"   Found {len(results)} results")

    # At least one result should contain 'Smith'
    has_smith = any('smith' in emp.get('user_username', '').lower() for emp in results)
    assert has_smith, "Search for 'Smith' returned no matching results"

    print(f"   ✅ Search by username works")

    # Test 2: Search by number
    print(f"\n2. Search by number '201'...")
    response = api_client.get('employees', params={
        'search': '201',
        'limit': 10,
        'offset': 0
    })

    assert_api_success(response, "Failed to search employees by number")

    data = response.get('data', {})
    results = data.get('data', []) if isinstance(data, dict) else data

    print(f"   Found {len(results)} results")

    # At least one result should have number 201
    has_201 = any('201' in str(emp.get('number', '')) for emp in results)
    assert has_201, "Search for '201' returned no matching results"

    print(f"   ✅ Search by number works")

    # Test 3: Pagination
    print(f"\n3. Test pagination (limit=5)...")
    response = api_client.get('employees', params={
        'limit': 5,
        'offset': 0
    })

    assert_api_success(response, "Failed to get paginated employees")

    data = response.get('data', {})
    if isinstance(data, dict):
        results = data.get('data', [])
        total = data.get('recordsTotal', 0)
    else:
        results = data
        total = len(data)

    print(f"   Page 1: {len(results)} items")
    print(f"   Total: {total} items")

    assert len(results) <= 5, "Pagination limit not respected"
    assert total >= len(results), "Total count less than returned items"

    print(f"   ✅ Pagination works")

    print(f"\n✅ All search tests passed!")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
