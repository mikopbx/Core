#!/usr/bin/env python3
"""
Simple test runner for call flow tests without pytest dependency.
Designed to run inside MikoPBX Docker container with minimal Python.

Usage inside container:
  cd /offload/rootfs/usr/www/tests/pycalltests
  export LD_LIBRARY_PATH=bin/pjsua2/linux-arm64:$LD_LIBRARY_PATH
  export PYTHONPATH=bin/pjsua2/linux-arm64:vendor_deps:/offload/rootfs/usr/www/tests/api:$PYTHONPATH
  python3 run_call_flow_tests.py
"""

import asyncio
import logging
import sys
import traceback
from pathlib import Path

# Setup paths
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir / "vendor_deps"))
sys.path.insert(0, str(script_dir / "bin" / "pjsua2" / "linux-arm64"))
sys.path.insert(0, str(script_dir.parent / "api"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import after path setup
from pjsua_helper import PJSUAManager, get_mikopbx_ip
from config import get_config

# Simple API client without pytest dependencies
import requests


class SimpleAPIClient:
    """Minimal API client for tests without pytest"""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.token = None
        self.session = requests.Session()

    def authenticate(self):
        """Get JWT token"""
        response = self.session.post(
            f"{self.base_url}/auth:login",
            json={"login": self.username, "password": self.password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data.get('data', {}).get('accessToken')
        if self.token:
            self.session.headers['Authorization'] = f'Bearer {self.token}'
        return self.token

    def get(self, endpoint: str) -> dict:
        """GET request"""
        response = self.session.get(f"{self.base_url}/{endpoint}")
        response.raise_for_status()
        return response.json()

    def get_extension_secret(self, extension: str) -> str:
        """Get SIP secret for extension"""
        try:
            data = self.get(f"sip/{extension}:getSecret")
            if data.get('result'):
                return data.get('data', {}).get('secret', '')
        except Exception as e:
            logger.error(f"Failed to get secret for {extension}: {e}")
        return ''


class TestResult:
    """Simple test result container"""

    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None
        self.duration = 0


async def test_simple_call(manager: PJSUAManager, api_client: SimpleAPIClient) -> TestResult:
    """Test: Simple extension-to-extension call"""
    result = TestResult("Simple Extension Call (204 -> 202)")

    try:
        # Get credentials
        pwd202 = api_client.get_extension_secret('202')
        pwd204 = api_client.get_extension_secret('204')

        if not pwd202 or not pwd204:
            raise ValueError("Failed to get extension credentials from API")

        logger.info("Registering extension 202 with auto-answer...")
        ext202 = await manager.create_endpoint('202', pwd202, auto_register=True, auto_answer=True)
        await asyncio.sleep(2)

        logger.info("Registering extension 204...")
        ext204 = await manager.create_endpoint('204', pwd204, auto_register=True)
        await asyncio.sleep(2)

        logger.info("Calling 202 from 204...")
        success = await ext204.dial('202', timeout=30)

        if success:
            logger.info("✅ Call connected successfully")
            await asyncio.sleep(3)
            await ext204.hangup()
            result.passed = True
        else:
            raise RuntimeError("Call failed to connect")

    except Exception as e:
        result.error = str(e)
        logger.error(f"❌ Test failed: {e}")

    return result


async def test_ivr_call(manager: PJSUAManager, api_client: SimpleAPIClient) -> TestResult:
    """Test: Call to IVR menu"""
    result = TestResult("IVR Menu Call (204 -> 20020)")

    try:
        pwd204 = api_client.get_extension_secret('204')
        if not pwd204:
            raise ValueError("Failed to get extension 204 credentials")

        logger.info("Registering extension 204...")
        ext204 = await manager.create_endpoint('204', pwd204, auto_register=True)
        await asyncio.sleep(2)

        logger.info("Calling IVR 20020...")
        success = await ext204.dial('20020', timeout=30)

        if success:
            logger.info("✅ IVR call connected")
            await asyncio.sleep(5)  # Listen to IVR
            await ext204.hangup()
            result.passed = True
        else:
            raise RuntimeError("IVR call failed to connect")

    except Exception as e:
        result.error = str(e)
        logger.error(f"❌ Test failed: {e}")

    return result


async def test_ivr_dtmf_navigation(manager: PJSUAManager, api_client: SimpleAPIClient) -> TestResult:
    """Test: IVR navigation with DTMF"""
    result = TestResult("IVR DTMF Navigation (204 -> 20020, press 2 -> 202)")

    try:
        pwd202 = api_client.get_extension_secret('202')
        pwd204 = api_client.get_extension_secret('204')

        if not pwd202 or not pwd204:
            raise ValueError("Failed to get extension credentials")

        # Register 202 to receive forwarded call
        logger.info("Registering extension 202 with auto-answer...")
        ext202 = await manager.create_endpoint('202', pwd202, auto_register=True, auto_answer=True)
        await asyncio.sleep(2)

        logger.info("Registering extension 204...")
        ext204 = await manager.create_endpoint('204', pwd204, auto_register=True)
        await asyncio.sleep(2)

        logger.info("Calling IVR 20020 with DTMF '2' after 3 seconds...")
        success = await ext204.dial('20020', dtmf='2', dtmf_delay=3, timeout=30)

        if success:
            logger.info("✅ IVR DTMF navigation successful - routed to 202")
            await asyncio.sleep(3)
            await ext204.hangup()
            result.passed = True
        else:
            raise RuntimeError("IVR DTMF navigation failed")

    except Exception as e:
        result.error = str(e)
        logger.error(f"❌ Test failed: {e}")

    return result


async def test_call_parking(manager: PJSUAManager, api_client: SimpleAPIClient) -> TestResult:
    """Test: Call parking and retrieval"""
    result = TestResult("Call Parking (park at 800, retrieve from 801)")

    try:
        pwd201 = api_client.get_extension_secret('201')
        pwd202 = api_client.get_extension_secret('202')

        if not pwd201 or not pwd202:
            raise ValueError("Failed to get extension credentials")

        # Register extensions
        logger.info("Registering extension 201...")
        ext201 = await manager.create_endpoint('201', pwd201, auto_register=True, auto_answer=True)
        await asyncio.sleep(2)

        logger.info("Registering extension 202...")
        ext202 = await manager.create_endpoint('202', pwd202, auto_register=True)
        await asyncio.sleep(2)

        # 202 calls 201
        logger.info("Extension 202 calling 201...")
        success = await ext202.dial('201', timeout=30)
        if not success:
            raise RuntimeError("Initial call failed")

        await asyncio.sleep(2)

        # 202 transfers to parking (800)
        logger.info("Transferring call to parking (800)...")
        await ext202.send_dtmf('**800')  # Blind transfer to parking
        await asyncio.sleep(3)

        # 201 retrieves from parking slot 801
        logger.info("Extension 201 retrieving from parking slot 801...")
        success = await ext201.dial('801', timeout=30)

        if success:
            logger.info("✅ Call parking and retrieval successful")
            await asyncio.sleep(2)
            await ext201.hangup()
            result.passed = True
        else:
            raise RuntimeError("Failed to retrieve parked call")

    except Exception as e:
        result.error = str(e)
        logger.error(f"❌ Test failed: {e}")

    return result


async def run_all_tests():
    """Run all call flow tests"""
    logger.info("=" * 60)
    logger.info("MikoPBX Call Flow Tests (No-Pytest Runner)")
    logger.info("=" * 60)

    # Get configuration
    config = get_config()
    ip = await get_mikopbx_ip()
    logger.info(f"MikoPBX IP: {ip}")

    # Create API client
    api_client = SimpleAPIClient(config.api_url, config.api_username, config.api_password)
    api_client.authenticate()
    logger.info("API authentication successful")

    # Create PJSUA manager
    manager = PJSUAManager(server_ip=ip)
    await manager.initialize()

    results = []

    # Run tests sequentially
    tests = [
        ("Simple Call", test_simple_call),
        ("IVR Call", test_ivr_call),
        ("IVR DTMF", test_ivr_dtmf_navigation),
        # ("Call Parking", test_call_parking),  # Requires transfer support
    ]

    for test_name, test_func in tests:
        logger.info("")
        logger.info("-" * 60)
        logger.info(f"Running: {test_name}")
        logger.info("-" * 60)

        # Cleanup between tests
        await manager.cleanup_all()
        await asyncio.sleep(2)

        try:
            result = await test_func(manager, api_client)
            results.append(result)
        except Exception as e:
            logger.error(f"Test crashed: {e}")
            traceback.print_exc()
            r = TestResult(test_name)
            r.error = str(e)
            results.append(r)

    # Final cleanup
    await manager.cleanup_all()

    # Print summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)

    passed = 0
    failed = 0
    for r in results:
        status = "✅ PASSED" if r.passed else "❌ FAILED"
        logger.info(f"  {status}: {r.name}")
        if r.error:
            logger.info(f"           Error: {r.error}")
        if r.passed:
            passed += 1
        else:
            failed += 1

    logger.info("")
    logger.info(f"Total: {passed} passed, {failed} failed out of {len(results)}")
    logger.info("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
