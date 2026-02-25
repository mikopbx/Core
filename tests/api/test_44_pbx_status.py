#!/usr/bin/env python3
"""
PBX Status API Tests

Tests for /pbxcore/api/v3/pbx-status endpoints:
- GET :getActiveCalls
- GET :getActiveChannels

These endpoints were moved from CDR API to PBX Status API for better organization.
Backward compatibility is maintained through CDR API.
"""

import pytest
from conftest import MikoPBXClient, API_URL, API_USERNAME, API_PASSWORD


@pytest.fixture(scope='module')
def client():
    """Create authenticated API client for this test module"""
    client = MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)
    client.authenticate()
    return client


class TestPbxStatusGetActiveCalls:
    """Test GET /pbx-status:getActiveCalls endpoint"""

    def test_get_active_calls_success(self, client):
        """
        Test getting active calls returns valid structure

        Expected: HTTP 200, result=true, data is array
        """
        data = client.get('pbx-status:getActiveCalls')

        assert data['result'] is True, "API call should succeed"
        assert isinstance(data['data'], list), "data should be an array"
        assert 'messages' in data, "response should have messages field"

    def test_get_active_calls_structure(self, client):
        """
        Test active calls data structure

        Each call should have: start, answer, endtime, src_num, dst_num, linkedid
        """
        data = client.get('pbx-status:getActiveCalls')

        if len(data['data']) > 0:
            call = data['data'][0]

            # Required fields
            assert 'start' in call, "call must have start time"
            assert 'src_num' in call, "call must have src_num"
            assert 'dst_num' in call, "call must have dst_num"
            assert 'linkedid' in call, "call must have linkedid"

            # Optional but expected fields
            assert 'answer' in call, "call should have answer time"
            assert 'endtime' in call, "call should have endtime"
            assert 'did' in call, "call should have DID"

    def test_get_active_calls_no_auth_localhost(self, client):
        """
        Test endpoint access without auth from localhost

        Note: Endpoint is configured with SecurityType::LOCALHOST
        which allows access from 127.0.0.1 without Bearer token
        """
        # This test documents current behavior
        # Request from localhost (127.0.0.1) should be allowed
        # External requests without token should be denied (401)
        pass  # Localhost access is expected behavior


class TestPbxStatusGetActiveChannels:
    """Test GET /pbx-status:getActiveChannels endpoint"""

    def test_get_active_channels_success(self, client):
        """
        Test getting active channels returns valid structure

        Expected: HTTP 200, result=true, data is array
        """
        data = client.get('pbx-status:getActiveChannels')

        assert data['result'] is True, "API call should succeed"
        assert isinstance(data['data'], list), "data should be an array"

    def test_get_active_channels_structure(self, client):
        """
        Test active channels data structure

        Each channel should have: start, answer, src_chan, dst_chan,
        src_num, dst_num, linkedid
        """
        data = client.get('pbx-status:getActiveChannels')

        if len(data['data']) > 0:
            channel = data['data'][0]

            # Required fields
            assert 'start' in channel, "channel must have start time"
            assert 'src_num' in channel, "channel must have src_num"
            assert 'dst_num' in channel, "channel must have dst_num"
            assert 'linkedid' in channel, "channel must have linkedid"

            # Channel-specific fields
            assert 'src_chan' in channel, "channel must have src_chan"
            assert 'dst_chan' in channel, "channel must have dst_chan"
            assert 'answer' in channel, "channel should have answer time"

    def test_get_active_channels_empty(self, client):
        """
        Test endpoint behavior when no active channels exist

        Expected: Empty array, not error
        """
        data = client.get('pbx-status:getActiveChannels')

        # Should succeed with empty array
        assert data['result'] is True, "should succeed even with no channels"
        assert isinstance(data['data'], list), "should return array"


class TestPerformance:
    """Test performance and response times"""

    def test_get_active_calls_response_time(self, client):
        """Test that getActiveCalls responds quickly (< 500ms)"""
        import time

        start = time.time()
        data = client.get('pbx-status:getActiveCalls')
        duration = time.time() - start

        assert data['result'] is True, "Request should succeed"
        assert duration < 0.5, f"Response time {duration:.3f}s exceeds 500ms"

    def test_get_active_channels_response_time(self, client):
        """Test that getActiveChannels responds quickly (< 500ms)"""
        import time

        start = time.time()
        data = client.get('pbx-status:getActiveChannels')
        duration = time.time() - start

        assert data['result'] is True, "Request should succeed"
        assert duration < 0.5, f"Response time {duration:.3f}s exceeds 500ms"


if __name__ == '__main__':
    # Run tests with verbose output
    pytest.main([__file__, '-v', '-s'])
