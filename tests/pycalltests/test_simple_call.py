#!/usr/bin/env python3
"""
Quick test to verify if calling regular extensions works (for comparison with IVR calls)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from pjsua_helper import PJSUAManager, get_mikopbx_ip
from conftest import MikoPBXClient, get_extension_secret
from config import get_config

async def test_call_regular_extension():
    """Test calling extension 202 from 204"""

    # Get MikoPBX IP
    ip = await get_mikopbx_ip()
    print(f"MikoPBX IP: {ip}")

    # Initialize PJSUA manager
    manager = PJSUAManager(server_ip=ip)
    await manager.initialize()

    # Get actual passwords from API
    config = get_config()
    api_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
    api_client.authenticate()

    pwd204 = get_extension_secret('204', api_client)
    pwd202 = get_extension_secret('202', api_client)

    print(f"Retrieved credentials for extensions 204 and 202 from API")

    if not pwd204 or not pwd202:
        print(f"❌ Failed to retrieve passwords from API")
        return False

    # Register target extension with auto-answer
    ext202 = await manager.create_endpoint('202', pwd202, auto_register=True, auto_answer=True)
    print(f"✅ Extension 202 registered (auto-answer enabled)")
    await asyncio.sleep(2)

    # Register caller extension
    ext204 = await manager.create_endpoint('204', pwd204, auto_register=True)
    print(f"✅ Extension 204 registered")
    await asyncio.sleep(2)

    # Try calling 202
    print(f"\n🔥 Calling extension 202...")
    success = await ext204.dial('202')

    if success:
        print(f"✅ SUCCESS! Call to 202 connected")
        await asyncio.sleep(3)
        await ext204.hangup()
        print(f"Call ended")
    else:
        print(f"❌ FAILED! Call to 202 did not connect")

    # Cleanup
    await manager.cleanup_all()

    return success

if __name__ == "__main__":
    result = asyncio.run(test_call_regular_extension())
    sys.exit(0 if result else 1)
