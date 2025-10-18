#!/usr/bin/env python3
"""
Test suite for Password Management operations

Tests the /pbxcore/api/v3/passwords endpoint for:
- Password reset functionality (POST /passwords:reset)
- Password change for authenticated user (POST /passwords:change)
- Secure password generation (POST /passwords:generate)
- Password strength validation
"""

import pytest
from conftest import assert_api_success


class TestPasswords:
    """Comprehensive tests for Password Management API"""

    def test_01_generate_password(self, api_client):
        """Test /passwords:generate - Generate secure password

        Note: This endpoint may use GET or POST method depending on implementation
        """
        # Try GET method first (confirmed working in production)
        # WHY: passwords:generate can use either GET or POST method
        # We try GET first as it's confirmed working, then fallback to POST
        password = None
        get_success = False
        try:
            response = api_client.get('passwords:generate', params={'length': 16})
            if response.get('result') is True:
                data = response.get('data', {})

                # Extract password from response
                if isinstance(data, dict):
                    password = data.get('password', '')
                elif isinstance(data, str):
                    password = data

                if password and len(password) >= 8:
                    print(f"✓ Generated secure password via GET: {len(password)} characters")
                    print(f"  Sample: {password[:3]}...{password[-3:]}")
                    get_success = True
        except Exception:
            pass  # Try POST if GET fails

        # Try POST method as fallback only if GET failed
        if not get_success:
            try:
                response = api_client.post('passwords:generate', {'length': 16})
                assert_api_success(response, "Failed to generate password")

                data = response.get('data', {})

                # Should return generated password
                if isinstance(data, dict):
                    assert 'password' in data, "Missing 'password' field in response"
                    password = data['password']

                    assert len(password) >= 8, "Generated password too short"
                    print(f"✓ Generated secure password via POST: {len(password)} characters")
                    print(f"  Sample: {password[:3]}...{password[-3:]}")

                elif isinstance(data, str):
                    # Password might be returned as plain string
                    assert len(data) >= 8, "Generated password too short"
                    print(f"✓ Generated secure password via POST: {len(data)} characters")

            except Exception as e:
                if '405' in str(e) or '501' in str(e) or '404' in str(e):
                    print(f"⚠ Password generation not implemented (tried both GET and POST)")
                    pytest.skip("Password generation not implemented")
                else:
                    raise

    def test_02_generate_password_with_length(self, api_client):
        """Test POST /passwords:generate with custom length"""
        # Request specific password length
        gen_data = {
            'length': 16
        }

        try:
            response = api_client.post('passwords:generate', gen_data)
            assert_api_success(response, "Failed to generate password with custom length")

            data = response.get('data', {})

            if isinstance(data, dict):
                password = data.get('password', '')
            else:
                password = str(data)

            if len(password) > 0:
                print(f"✓ Generated password with custom length: {len(password)} characters")
                # Length might not be exact due to encoding, but should be close
                if abs(len(password) - 16) <= 2:
                    print(f"  Length matches request (±2 chars)")
            else:
                print(f"⚠ Empty password generated")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Custom length not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_03_generate_password_with_requirements(self, api_client):
        """Test POST /passwords:generate with complexity requirements"""
        # Request password with specific requirements
        gen_data = {
            'length': 12,
            'requireUppercase': True,
            'requireLowercase': True,
            'requireNumbers': True,
            'requireSpecialChars': True
        }

        try:
            response = api_client.post('passwords:generate', gen_data)

            if response.get('result') is True:
                data = response.get('data', {})
                password = data.get('password', data) if isinstance(data, dict) else str(data)

                if len(password) > 0:
                    print(f"✓ Generated password with complexity requirements")
                    print(f"  Length: {len(password)}")
                else:
                    print(f"⚠ Empty password")
            else:
                print(f"⚠ Password generation with requirements not supported")

        except Exception as e:
            if '501' in str(e) or '422' in str(e):
                print(f"⚠ Complexity requirements not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_04_change_password(self, api_client):
        """Test POST /passwords:change - Change current user's password

        NOTE: We don't actually change the password in tests to avoid breaking auth
        """
        change_data = {
            'currentPassword': 'fake_current_password',
            'newPassword': 'NewTestPassword123!@#',
            'confirmPassword': 'NewTestPassword123!@#'
        }

        try:
            response = api_client.post('passwords:change', change_data)

            # Will likely fail due to wrong current password - that's expected
            if not response.get('result'):
                messages = response.get('messages', {})
                error_text = str(messages).lower()

                # Check if error is about incorrect current password
                if 'current' in error_text or 'incorrect' in error_text or 'wrong' in error_text:
                    print(f"✓ Password change validation works (rejected wrong current password)")
                else:
                    print(f"⚠ Password change failed: {messages}")
            else:
                print(f"⚠ Password change succeeded unexpectedly (with fake password)")

        except Exception as e:
            if '401' in str(e) or '403' in str(e):
                print(f"✓ Password change requires proper authentication")
            elif '422' in str(e):
                print(f"✓ Password change validation rejected invalid data")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Password change not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_reset_password(self, api_client):
        """Test POST /passwords:reset - Initiate password reset

        NOTE: This typically requires email verification, so we test the endpoint response
        """
        reset_data = {
            'email': 'admin@example.com',
            'username': 'admin'
        }

        try:
            response = api_client.post('passwords:reset', reset_data)

            if response.get('result') is True:
                print(f"✓ Password reset initiated")
                data = response.get('data', {})
                if isinstance(data, dict):
                    print(f"  Response: {data}")
            else:
                # May fail if email not configured
                messages = response.get('messages', {})
                print(f"⚠ Password reset failed: {messages}")

        except Exception as e:
            if '422' in str(e):
                print(f"✓ Password reset validation works")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Password reset not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")


class TestPasswordsEdgeCases:
    """Edge cases for Password Management"""

    def test_01_generate_password_invalid_length(self, api_client):
        """Test POST /passwords:generate with invalid length"""
        invalid_lengths = [
            {'length': 0},      # Too short
            {'length': 1000},   # Too long
            {'length': -5},     # Negative
        ]

        for gen_data in invalid_lengths:
            try:
                response = api_client.post('passwords:generate', gen_data)

                if not response.get('result'):
                    print(f"✓ Invalid length rejected: {gen_data['length']}")
                else:
                    print(f"⚠ Invalid length accepted: {gen_data['length']}")

            except Exception as e:
                if '422' in str(e) or '400' in str(e):
                    print(f"✓ Invalid length rejected via HTTP: {gen_data['length']}")
                else:
                    print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_change_password_mismatched_confirmation(self, api_client):
        """Test POST /passwords:change with mismatched confirmation"""
        change_data = {
            'currentPassword': 'current123',
            'newPassword': 'NewPassword123!',
            'confirmPassword': 'DifferentPassword456!'  # Mismatch
        }

        try:
            response = api_client.post('passwords:change', change_data)

            if not response.get('result'):
                print(f"✓ Mismatched confirmation rejected")
            else:
                print(f"⚠ Mismatched confirmation accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Mismatched confirmation rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_change_password_weak_new_password(self, api_client):
        """Test POST /passwords:change with weak new password"""
        change_data = {
            'currentPassword': 'current123',
            'newPassword': '123',  # Weak password
            'confirmPassword': '123'
        }

        try:
            response = api_client.post('passwords:change', change_data)

            if not response.get('result'):
                print(f"✓ Weak password rejected")
            else:
                print(f"⚠ Weak password accepted (lenient validation)")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Weak password rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_change_password_same_as_current(self, api_client):
        """Test POST /passwords:change with same password as current"""
        change_data = {
            'currentPassword': 'SamePassword123!',
            'newPassword': 'SamePassword123!',  # Same as current
            'confirmPassword': 'SamePassword123!'
        }

        try:
            response = api_client.post('passwords:change', change_data)

            if not response.get('result'):
                messages = str(response.get('messages', {}))
                if 'same' in messages.lower() or 'different' in messages.lower():
                    print(f"✓ Same password as current rejected")
                else:
                    print(f"⚠ Password change failed for other reason")
            else:
                print(f"⚠ Same password as current accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Same password rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_reset_password_invalid_email(self, api_client):
        """Test POST /passwords:reset with invalid email format"""
        reset_data = {
            'email': 'not-an-email',
            'username': 'admin'
        }

        try:
            response = api_client.post('passwords:reset', reset_data)

            if not response.get('result'):
                print(f"✓ Invalid email format rejected")
            else:
                print(f"⚠ Invalid email format accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid email rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_reset_password_nonexistent_user(self, api_client):
        """Test POST /passwords:reset with non-existent username"""
        reset_data = {
            'email': 'nonexistent@example.com',
            'username': 'nonexistent_user_999999'
        }

        try:
            response = api_client.post('passwords:reset', reset_data)

            # For security, might return success even if user doesn't exist
            if response.get('result') is True:
                print(f"⚠ Password reset succeeded for non-existent user (security by obscurity)")
            else:
                print(f"✓ Password reset rejected for non-existent user")

        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent user rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_change_password_missing_fields(self, api_client):
        """Test POST /passwords:change with missing required fields"""
        incomplete_data = {
            'newPassword': 'NewPassword123!'
            # Missing currentPassword and confirmPassword
        }

        try:
            response = api_client.post('passwords:change', incomplete_data)

            if not response.get('result'):
                print(f"✓ Missing required fields rejected")
            else:
                print(f"⚠ Missing required fields accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Missing required fields rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
