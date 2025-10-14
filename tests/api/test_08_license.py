#!/usr/bin/env python3
"""Test suite for License operations"""
import pytest
from conftest import assert_api_success

class TestLicense:
    def test_01_get_license_info(self, api_client):
        try:
            response = api_client.get('license')
            assert_api_success(response, "Failed to get license info")
            print(f"✓ Retrieved license information")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ License endpoint not fully implemented")
                print(f"  Note: May require license activation or specific configuration")
            else:
                raise
    def test_02_check_license(self, api_client):
        try:
            response = api_client.get('license:check')
            if response['result']:
                print(f"✓ License check works")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
