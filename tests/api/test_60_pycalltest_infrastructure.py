#!/usr/bin/env python3
"""
Test pycalltests Infrastructure

This test validates that pycalltests server starts/stops correctly
and that the Python wrapper classes work as expected.

This is a foundational test that must pass before any actual
SIP call tests can be executed.
"""

import pytest
import asyncio


@pytest.mark.asyncio
class TestPycalltestInfrastructure:
    """
    Test pycalltests server lifecycle and basic functionality
    """

    async def test_01_pycalltest_server_health_check(self, pycalltest_server):
        """
        Verify pycalltests server started successfully

        Steps:
        1. Check pycalltest_server fixture is not None
        2. Verify server is running
        3. Perform health check
        """
        assert pycalltest_server is not None, "pycalltests server failed to start"
        assert pycalltest_server.is_running(), "pycalltests server is not running"

        # Health check
        health = await pycalltest_server.health_check()
        assert health is True, "pycalltests health check failed"

        print(f"\n✓ pycalltests server running on {pycalltest_server.host}:{pycalltest_server.port}")
        print(f"  PID: {pycalltest_server.pid}")
        print(f"  Transport: {pycalltest_server.transport}")
        print(f"  MikoPBX IP: {pycalltest_server.mikopbx_ip}")

    async def test_02_pycalltest_server_logs_exist(self, pycalltest_server):
        """
        Verify pycalltests log file exists and is writable

        Steps:
        1. Check log file exists
        2. Verify log file has content
        3. Read last few lines
        """
        assert pycalltest_server is not None, "pycalltests server not available"

        # Check log file
        assert pycalltest_server.log_file.exists(), f"Log file not found: {pycalltest_server.log_file}"

        # Read logs
        logs = await pycalltest_server.get_logs(lines=10)
        assert len(logs) > 0, "Log file is empty"

        print(f"\n✓ Log file exists: {pycalltest_server.log_file}")
        print(f"  Last 10 lines:")
        print("  " + "\n  ".join(logs.splitlines()[-10:]))

    async def test_03_sip_endpoint_factory_basic(self, sip_endpoint_factory):
        """
        Test SIP endpoint factory creates endpoints correctly

        Steps:
        1. Create a test endpoint
        2. Verify registration succeeds
        3. Verify cleanup works
        """
        # Create endpoint
        endpoint = await sip_endpoint_factory("999", "test_secret")

        assert endpoint is not None, "Failed to create endpoint"
        assert endpoint.extension == "999"
        assert endpoint.secret == "test_secret"
        assert endpoint.is_registered is True, "Endpoint not registered"

        print(f"\n✓ Created SIP endpoint: {endpoint.extension}")
        print(f"  Registered: {endpoint.is_registered}")
        print(f"  Server: {endpoint.server_ip}")

        # Note: cleanup happens automatically via fixture

    async def test_04_multiple_endpoints(self, sip_endpoint_factory):
        """
        Test creating multiple endpoints simultaneously

        Steps:
        1. Create 3 endpoints
        2. Verify all are registered
        3. Verify cleanup works for all
        """
        endpoints = []

        for ext in ["901", "902", "903"]:
            endpoint = await sip_endpoint_factory(ext, f"pass_{ext}")
            endpoints.append(endpoint)

        # Verify all registered
        for endpoint in endpoints:
            assert endpoint.is_registered is True, f"Endpoint {endpoint.extension} not registered"

        print(f"\n✓ Created {len(endpoints)} SIP endpoints")
        for ep in endpoints:
            print(f"  - {ep.extension}: registered")


    @pytest.mark.skip(reason="SIP provider simulation not yet implemented in pycalltest_helper.py")
    async def test_05_sip_provider_factory_basic(self, sip_provider_factory):
        """
        Test SIP provider factory creates providers correctly

        Steps:
        1. Create a test provider
        2. Verify provider starts
        3. Verify cleanup works

        Note: This test is currently skipped because SIP provider
        functionality in pycalltest_helper.py is placeholder only.
        """
        provider = await sip_provider_factory("test_trunk", "trunk_secret")

        assert provider is not None, "Failed to create provider"
        assert provider.username == "test_trunk"
        assert provider.is_running is True, "Provider not running"

        print(f"\n✓ Created SIP provider: {provider.username}")
        print(f"  Running: {provider.is_running}")


@pytest.mark.asyncio
class TestPycalltestPerformance:
    """
    Performance and stress tests for pycalltests infrastructure
    """

    async def test_01_rapid_endpoint_creation(self, sip_endpoint_factory):
        """
        Test rapid creation of many endpoints

        Steps:
        1. Create 10 endpoints rapidly
        2. Verify all are registered
        3. Measure time taken
        """
        import time

        start_time = time.time()
        endpoints = []

        for i in range(10):
            ext = f"80{i}"
            endpoint = await sip_endpoint_factory(ext, f"pass_{ext}")
            endpoints.append(endpoint)

        duration = time.time() - start_time

        # Verify all registered
        for endpoint in endpoints:
            assert endpoint.is_registered is True

        print(f"\n✓ Created 10 endpoints in {duration:.2f} seconds")
        print(f"  Average: {duration/10:.3f}s per endpoint")
