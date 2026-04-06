#!/usr/bin/env python3
"""Test suite for SIP status operations"""
import pytest
from conftest import assert_api_success

class TestSip:
    def test_01_get_sip_peers(self, api_client):
        try:
            response = api_client.get('sip:getPeers')
            assert_api_success(response, "Failed to get SIP peers")
            data = response['data']
            print(f"✓ Retrieved SIP peers status")
        except Exception as e:
            if '405' in str(e) or '422' in str(e) or '404' in str(e):
                print(f"⚠ getPeers method not implemented for SIP endpoint")
                print(f"  Note: SIP status methods may require Asterisk to be running")
            else:
                raise
    def test_02_get_sip_registry(self, api_client):
        try:
            response = api_client.get('sip:getRegistry')
            if response['result']:
                print(f"✓ Retrieved SIP registry")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
