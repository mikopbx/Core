#!/usr/bin/env python3
"""
Simple test for Call Queue - Ringall Strategy
No pytest required - runs directly in Docker container
"""

import asyncio
import sys
import json
from pathlib import Path

# Add api directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from pjsua_helper import PJSUAManager

# Minimal API client without authentication (works inside container)
class SimpleAPIClient:
    def __init__(self, base_url):
        import requests
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()

    def get(self, endpoint):
        response = self.session.get(f"{self.base_url}/{endpoint}")
        return response.json()

    def post(self, endpoint, data):
        response = self.session.post(f"{self.base_url}/{endpoint}", json=data)
        return response.json()

    def delete(self, endpoint):
        response = self.session.delete(f"{self.base_url}/{endpoint}")
        return response.json()

def get_extension_secret(extension):
    """Get extension secret from API using sip:getSecret endpoint"""
    import requests
    try:
        # Inside container, no auth needed
        response = requests.get(f'http://127.0.0.1/pbxcore/api/v3/sip/{extension}:getSecret')
        data = response.json()
        if data.get('result') and data.get('data'):
            return data['data'].get('secret')
    except Exception as e:
        print(f"Error getting secret for {extension}: {e}")
    return None


async def test_call_queue_ringall():
    """Test calling existing queue 20021 (Accountant department) with members 202, 203"""

    # Inside container, use localhost
    ip = "127.0.0.1"
    print(f"MikoPBX IP: {ip}")

    # Initialize PJSUA manager
    manager = PJSUAManager(server_ip=ip)
    await manager.initialize()

    # Get actual passwords from API (no auth needed inside container)
    pwd201 = get_extension_secret('201')  # Caller
    pwd202 = get_extension_secret('202')  # Queue member
    pwd203 = get_extension_secret('203')  # Queue member

    print(f"Retrieved credentials for extensions 201, 202, 203 from API")

    if not pwd201 or not pwd202 or not pwd203:
        print(f"❌ Failed to retrieve passwords from API")
        return False

    try:
        # ================================================================
        # STEP 1: Verify existing queue 20021
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 1: Verify Existing Queue 20021")
        print(f"{'='*70}")

        # Create API client for queue verification
        api_client = SimpleAPIClient('http://127.0.0.1/pbxcore/api/v3')
        response = api_client.get('call-queues')

        if not response.get('result'):
            print(f"❌ Failed to get queues: {response.get('messages')}")
            return False

        # Find queue 20021
        queue_20021 = None
        for queue in response['data']:
            if queue['extension'] == '20021':
                queue_20021 = queue
                break

        if not queue_20021:
            print(f"❌ Queue 20021 not found!")
            return False

        print(f"✅ Found queue: {queue_20021['name']}")
        print(f"   Extension: {queue_20021['extension']}")
        print(f"   Strategy: {queue_20021['strategy']}")
        print(f"   Members: {[m['extension'] for m in queue_20021['members']]}")

        # ================================================================
        # STEP 2: Register Queue Members with auto-answer
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 2: Register Queue Members")
        print(f"{'='*70}")

        # Register queue members with auto-answer
        ext202 = await manager.create_endpoint('202', pwd202, auto_register=True, auto_answer=True)
        print(f"✅ Extension 202 registered (auto-answer enabled)")

        ext203 = await manager.create_endpoint('203', pwd203, auto_register=True, auto_answer=True)
        print(f"✅ Extension 203 registered (auto-answer enabled)")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Register Caller and Make Call
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 3: Call Queue 20021 from Extension 201")
        print(f"{'='*70}")

        # Register caller
        ext201 = await manager.create_endpoint('201', pwd201, auto_register=True)
        print(f"✅ Extension 201 registered")
        await asyncio.sleep(2)

        # Try calling existing queue 20021
        print(f"\n🔥 Calling queue 20021...")
        success = await ext201.dial('20021')

        if success:
            print(f"✅ SUCCESS! Call to queue 20021 connected")
            await asyncio.sleep(3)
            await ext201.hangup()
            print(f"Call ended")
        else:
            print(f"❌ FAILED! Call to queue 20021 did not connect")

        # Cleanup
        await manager.cleanup_all()

        return success

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

        # Cleanup on error
        await manager.cleanup_all()

        return False


if __name__ == "__main__":
    result = asyncio.run(test_call_queue_ringall())
    sys.exit(0 if result else 1)
