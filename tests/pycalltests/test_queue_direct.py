#!/usr/bin/env python3
"""
Direct test for Call Queue 20021 using pjsua2 directly
Works inside Docker container without dependencies
"""

import asyncio
import sys
import json
import urllib.request
from pathlib import Path

# Add pjsua2 to path
pjsua2_path = Path(__file__).parent / "bin/pjsua2/linux-arm64"
sys.path.insert(0, str(pjsua2_path))

import pjsua2 as pj


def get_extension_secret(extension):
    """Get extension secret from API using sip:getSecret endpoint"""
    try:
        # Inside container, no auth needed
        with urllib.request.urlopen(f'http://127.0.0.1/pbxcore/api/v3/sip/{extension}:getSecret') as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('result') and data.get('data'):
                return data['data'].get('secret')
    except Exception as e:
        print(f"Error getting secret for {extension}: {e}")
    return None


# Global state for tracking call connection
call_connected = False
call_disconnected = False


class SimpleAccount(pj.Account):
    """Simple account without auto-answer"""
    def __init__(self):
        pj.Account.__init__(self)

    def onRegState(self, prm):
        ai = self.getInfo()
        print(f"  Registration: {ai.regStatusText} (code={ai.regStatus})")


class CallTrackerAccount(pj.Account):
    """Account that tracks outgoing calls"""
    def __init__(self):
        pj.Account.__init__(self)
        self.current_call = None

    def onRegState(self, prm):
        ai = self.getInfo()
        print(f"  Registration: {ai.regStatusText} (code={ai.regStatus})")

    def onCallState(self, prm):
        """Track call state changes for outgoing calls"""
        global call_connected, call_disconnected
        print(f"  [DEBUG] onCallState callback fired!")
        if self.current_call:
            try:
                ci = self.current_call.getInfo()
                print(f"  [DEBUG] Call state: {ci.state}")
                if ci.state == pj.PJSIP_INV_STATE_CONFIRMED:
                    call_connected = True
                    print(f"  ✅ Call connected to {ci.remoteUri}")
                elif ci.state == pj.PJSIP_INV_STATE_DISCONNECTED:
                    call_disconnected = True
                    print(f"  Call disconnected: {ci.lastReason}")
            except Exception as e:
                print(f"  [DEBUG] Error in onCallState: {e}")


class AutoAnswerAccount(pj.Account):
    """Account with auto-answer capability"""
    def __init__(self):
        pj.Account.__init__(self)
        self.current_call = None

    def onRegState(self, prm):
        ai = self.getInfo()
        print(f"  Registration: {ai.regStatusText} (code={ai.regStatus})")

    def onIncomingCall(self, prm):
        """Auto-answer incoming calls"""
        call = pj.Call(self, prm.callId)
        self.current_call = call

        ci = call.getInfo()
        print(f"  Incoming call from {ci.remoteUri} - AUTO-ANSWERING")

        call_prm = pj.CallOpParam()
        call_prm.statusCode = 200
        call.answer(call_prm)


async def test_queue_20021():
    """Test calling existing queue 20021"""

    server_ip = "127.0.0.1"
    print(f"MikoPBX IP: {server_ip}")

    # Get passwords from API
    pwd201 = get_extension_secret('201')
    pwd202 = get_extension_secret('202')
    pwd203 = get_extension_secret('203')

    if not pwd201 or not pwd202 or not pwd203:
        print("❌ Failed to retrieve passwords")
        return False

    print("Retrieved credentials for extensions 201, 202, 203")

    # Initialize PJSUA
    ep = pj.Endpoint()
    ep.libCreate()

    ep_cfg = pj.EpConfig()
    ep_cfg.uaConfig.threadCnt = 0
    ep_cfg.uaConfig.mainThreadOnly = True

    # Configure null audio device for headless container
    ep_cfg.medConfig.noVad = True
    ep_cfg.medConfig.channelCount = 1
    ep_cfg.medConfig.clockRate = 8000
    ep_cfg.medConfig.audioFramePtime = 20
    ep_cfg.medConfig.quality = 1

    log_cfg = pj.LogConfig()
    log_cfg.level = 3
    log_cfg.consoleLevel = 3
    ep_cfg.logConfig = log_cfg

    ep.libInit(ep_cfg)

    # Create null audio device after init
    ep.audDevManager().setNullDev()

    # Create UDP transport
    transport_cfg = pj.TransportConfig()
    transport_cfg.port = 0
    ep.transportCreate(pj.PJSIP_TRANSPORT_UDP, transport_cfg)

    ep.libStart()

    try:
        # ================================================================
        # STEP 1: Verify queue exists
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 1: Verify Queue 20021")
        print(f"{'='*70}")

        with urllib.request.urlopen('http://127.0.0.1/pbxcore/api/v3/call-queues') as response:
            queues_data = json.loads(response.read().decode('utf-8'))

        if not queues_data.get('result'):
            print("❌ Failed to get queues")
            return False

        queue_20021 = None
        for queue in queues_data['data']:
            if queue['extension'] == '20021':
                queue_20021 = queue
                break

        if not queue_20021:
            print("❌ Queue 20021 not found")
            return False

        print(f"✅ Found queue: {queue_20021['name']}")
        print(f"   Extension: {queue_20021['extension']}")
        print(f"   Members: {[m['extension'] for m in queue_20021['members']]}")

        # ================================================================
        # STEP 2: Register queue members with auto-answer
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 2: Register Queue Members (auto-answer)")
        print(f"{'='*70}")

        # Register 202 with auto-answer
        acc202_cfg = pj.AccountConfig()
        acc202_cfg.idUri = f'"202" <sip:202@{server_ip}>'
        acc202_cfg.regConfig.registrarUri = f"sip:{server_ip}:5060"
        cred202 = pj.AuthCredInfo("digest", "asterisk", "202", 0, pwd202)
        acc202_cfg.sipConfig.authCreds.append(cred202)

        acc202 = AutoAnswerAccount()
        acc202.create(acc202_cfg)
        print(f"✅ Extension 202 account created")

        # Register 203 with auto-answer
        acc203_cfg = pj.AccountConfig()
        acc203_cfg.idUri = f'"203" <sip:203@{server_ip}>'
        acc203_cfg.regConfig.registrarUri = f"sip:{server_ip}:5060"
        cred203 = pj.AuthCredInfo("digest", "asterisk", "203", 0, pwd203)
        acc203_cfg.sipConfig.authCreds.append(cred203)

        acc203 = AutoAnswerAccount()
        acc203.create(acc203_cfg)
        print(f"✅ Extension 203 account created")

        # Process SIP events to allow REGISTER messages to be sent
        print(f"\nProcessing SIP events for registration...")
        for i in range(20):  # Process events for ~2 seconds
            ep.libHandleEvents(10)
            await asyncio.sleep(0.1)

        # Wait additional time for device states to propagate
        print(f"Waiting 5 seconds for device states to update...")
        await asyncio.sleep(5)
        print(f"✅ Registration complete")

        # ================================================================
        # STEP 3: Register caller and call queue
        # ================================================================
        print(f"\n{'='*70}")
        print(f"STEP 3: Call Queue 20021 from Extension 201")
        print(f"{'='*70}")

        # Register 201 (caller)
        acc201_cfg = pj.AccountConfig()
        acc201_cfg.idUri = f'"201" <sip:201@{server_ip}>'
        acc201_cfg.regConfig.registrarUri = f"sip:{server_ip}:5060"
        cred201 = pj.AuthCredInfo("digest", "asterisk", "201", 0, pwd201)
        acc201_cfg.sipConfig.authCreds.append(cred201)

        acc201 = CallTrackerAccount()
        acc201.create(acc201_cfg)
        print(f"✅ Extension 201 account created")

        # Process SIP events for caller registration
        for i in range(10):  # Process events for ~1 second
            ep.libHandleEvents(10)
            await asyncio.sleep(0.1)

        print(f"✅ Caller 201 registered")

        # Reset global state
        global call_connected, call_disconnected
        call_connected = False
        call_disconnected = False

        # Make call to queue 20021
        print(f"\n🔥 Calling queue 20021...")

        call = pj.Call(acc201)
        acc201.current_call = call  # Store call in account for callback access

        call_prm = pj.CallOpParam()
        call_prm.opt.audioCount = 0  # No audio device in container
        call_prm.opt.videoCount = 0

        dest_uri = f"sip:20021@{server_ip}"
        call.makeCall(dest_uri, call_prm)

        # Process events and wait for call to establish
        success = False
        wait_after_connect = 0

        for i in range(60):  # 30 seconds timeout
            ep.libHandleEvents(10)

            # Check call state by polling (callbacks don't work reliably)
            if not success:
                try:
                    ci = call.getInfo()
                    # Print state for debugging
                    if i % 4 == 0:  # Print every 2 seconds
                        state_names = {
                            0: "NULL", 1: "CALLING", 2: "INCOMING", 3: "EARLY",
                            4: "CONNECTING", 5: "CONFIRMED", 6: "DISCONNECTED"
                        }
                        state_name = state_names.get(ci.state, f"UNKNOWN({ci.state})")
                        print(f"  [DEBUG {i}] Call state: {state_name}")

                    if ci.state == pj.PJSIP_INV_STATE_CONFIRMED:
                        print(f"✅ SUCCESS! Call to queue 20021 connected")
                        success = True
                        wait_after_connect = 0
                    elif ci.state == pj.PJSIP_INV_STATE_DISCONNECTED:
                        print(f"❌ FAILED! Call disconnected before connection")
                        break
                except Exception as e:
                    if i % 4 == 0:
                        print(f"  [DEBUG {i}] Error getting call info: {e}")
                    pass  # Ignore getInfo errors

            # If connected, wait a bit then hangup
            if success:
                wait_after_connect += 1
                if wait_after_connect > 10:  # Wait ~5 seconds after connection
                    try:
                        call.hangup(call_prm)
                    except:
                        pass  # Ignore hangup errors
                    await asyncio.sleep(1)
                    break

            await asyncio.sleep(0.5)

        if not success:
            print(f"❌ FAILED! Call timeout")

        return success

    finally:
        # Clean up in correct order to avoid assertion errors
        try:
            # Delete call objects first
            if 'call' in locals():
                del call
            if 'acc201' in locals():
                acc201.current_call = None
            if 'acc202' in locals():
                acc202.current_call = None
            if 'acc203' in locals():
                acc203.current_call = None

            # Give PJSUA time to clean up
            await asyncio.sleep(0.5)

            # Destroy endpoint
            ep.libDestroy()
        except:
            pass  # Ignore cleanup errors


if __name__ == "__main__":
    result = asyncio.run(test_queue_20021())
    sys.exit(0 if result else 1)
