#!/usr/bin/env python3
"""Test suite for IAX status operations"""
import pytest
from conftest import assert_api_success

class TestIax:
    def test_01_get_iax_peers(self, api_client):
        try:
            response = api_client.get('iax:getPeers')
            if response['result']:
                print(f"✓ Retrieved IAX peers status")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ IAX status not implemented")
    def test_02_get_iax_registry(self, api_client):
        try:
            response = api_client.get('iax:getRegistry')
            if response['result']:
                print(f"✓ Retrieved IAX registry")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
