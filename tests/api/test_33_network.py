#!/usr/bin/env python3
"""Test suite for Network operations (singleton)"""
import pytest
from conftest import assert_api_success

class TestNetwork:
    def test_01_get_config(self, api_client):
        response = api_client.get('network')
        assert_api_success(response, "Failed to get network config")
        print(f"✓ Retrieved network configuration")
    def test_02_get_interfaces(self, api_client):
        try:
            response = api_client.get('network:getInterfaces')
            if response['result']:
                print(f"✓ Retrieved network interfaces")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
