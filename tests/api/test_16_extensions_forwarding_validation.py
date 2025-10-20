#!/usr/bin/env python3
"""
Test fwd_ringlength conditional validation

Business rule:
- When fwd_forwarding is EMPTY: fwd_ringlength can be 0 (not validated)
- When fwd_forwarding is SET: fwd_ringlength must be 3-180
"""

import pytest


def test_fwd_ringlength_empty_when_no_forwarding(api_client):
    """
    Test that fwd_ringlength=0 is ALLOWED when fwd_forwarding is empty

    Scenario: User clears both fwd_forwarding and fwd_ringlength in web interface
    Expected: Should save successfully without validation error
    """
    # Create employee with forwarding disabled
    response = api_client.post('employees', {
        'user_username': 'test_no_forwarding',
        'number': '9001',
        'sip_secret': 'StrongP@ss123',
        'fwd_forwarding': '',  # Empty - no forwarding
        'fwd_ringlength': 0     # Zero - should be allowed
    })

    assert response.get('result') is True, f"Expected success, got: {response}"
    assert response['data']['fwd_ringlength'] == 0

    # Cleanup
    employee_id = response['data']['id']
    api_client.delete(f'employees/{employee_id}')


def test_fwd_ringlength_validation_when_forwarding_set(api_client):
    """
    Test that fwd_ringlength is VALIDATED (3-180) when fwd_forwarding is set

    Scenario: User sets forwarding but provides invalid ring length
    Expected: Should return validation error (422)
    """
    import requests

    # Try to create employee with invalid ring length
    # This should fail with 422 Unprocessable Entity
    try:
        response = api_client.post('employees', {
            'user_username': 'test_with_forwarding',
            'number': '9002',
            'sip_secret': 'StrongP@ss123',
            'fwd_forwarding': '201',  # Forwarding enabled
            'fwd_ringlength': 1        # Invalid - too short (< 3)
        })
        # If we reach here, test should fail - we expected an exception
        assert False, f"Expected 422 validation error, but request succeeded: {response}"
    except requests.exceptions.HTTPError as e:
        # Expected: 422 with validation message about 3-180 range
        assert '422' in str(e), f"Expected 422 error, got: {e}"
        assert '3-180' in str(e), f"Expected validation message with '3-180', got: {e}"


def test_fwd_ringlength_valid_range_when_forwarding_set(api_client):
    """
    Test that valid fwd_ringlength (3-180) is ACCEPTED when fwd_forwarding is set

    Scenario: User sets forwarding with valid ring length
    Expected: Should save successfully
    """
    # Create employee with valid forwarding settings
    response = api_client.post('employees', {
        'user_username': 'test_valid_forwarding',
        'number': '9003',
        'sip_secret': 'StrongP@ss123',
        'fwd_forwarding': '201',  # Forwarding enabled
        'fwd_ringlength': 30       # Valid - in range [3, 180]
    })

    assert response.get('result') is True, f"Expected success, got: {response}"
    assert response['data']['fwd_ringlength'] == 30

    # Cleanup
    employee_id = response['data']['id']
    api_client.delete(f'employees/{employee_id}')


def test_update_employee_clear_forwarding(api_client):
    """
    Test PUT/PATCH operation: clearing forwarding should allow fwd_ringlength=0

    Scenario: User updates existing employee and clears forwarding
    Expected: Should accept fwd_ringlength=0 when fwd_forwarding is cleared
    """
    # Create employee with forwarding
    create_response = api_client.post('employees', {
        'user_username': 'test_clear_forwarding',
        'number': '9004',
        'sip_secret': 'StrongP@ss123',
        'fwd_forwarding': '201',
        'fwd_ringlength': 30
    })
    assert create_response.get('result') is True
    employee_id = create_response['data']['id']

    # Clear forwarding (PUT with empty string and 0)
    # Simulating web form submission where empty string is sent
    put_response = api_client.put(f'employees/{employee_id}', {
        'user_username': 'test_clear_forwarding',
        'number': '9004',
        'sip_secret': 'StrongP@ss123',
        'fwd_forwarding': '',      # Clear forwarding (empty string from web form)
        'fwd_ringlength': ''       # Empty string (will be converted to 0 by sanitization)
    })

    assert put_response.get('result') is True, f"Expected success, got: {put_response}"
    assert put_response['data']['fwd_forwarding'] == ''
    assert put_response['data']['fwd_ringlength'] in [0, ''], \
        f"Expected 0 or empty, got: {put_response['data']['fwd_ringlength']}"

    # Cleanup
    api_client.delete(f'employees/{employee_id}')
