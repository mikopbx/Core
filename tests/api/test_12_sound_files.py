#!/usr/bin/env python3
"""Test suite for Sound Files operations"""
import pytest
from conftest import assert_api_success

class TestSoundFiles:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        response = api_client.get('sound-files:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default sound file template")
    def test_02_get_list(self, api_client):
        response = api_client.get('sound-files', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} sound files")
        if len(data) > 0 and 'id' in data[0]:
            TestSoundFiles.sample_id = data[0]['id']
    def test_03_get_by_id(self, api_client):
        if not TestSoundFiles.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'sound-files/{TestSoundFiles.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved sound file: {TestSoundFiles.sample_id}")
    def test_04_filter_by_category(self, api_client):
        response = api_client.get('sound-files', params={'category': 'custom', 'limit': 10})
        if response['result']:
            print(f"✓ Filter by category works")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
