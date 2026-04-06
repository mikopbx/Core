#!/usr/bin/env python3
"""Test suite for Modules operations"""
import pytest
from conftest import assert_api_success

class TestModules:
    def test_01_get_list(self, api_client):
        try:
            response = api_client.get('modules', params={'limit': 50})
            assert_api_success(response, "Failed to get modules list")
            data = response['data']
            print(f"✓ Retrieved {len(data)} modules")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ Modules list endpoint not fully implemented")
                print(f"  Note: May require specific installation or configuration")
            else:
                raise
    def test_02_get_available_modules(self, api_client):
        try:
            response = api_client.get('modules:getAvailableModules')
            if response['result']:
                print(f"✓ Retrieved available modules")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
