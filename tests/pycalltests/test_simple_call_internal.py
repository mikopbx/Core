#!/usr/bin/env python3
"""
Simple test to verify calling works from inside container (localhost)
No config.py dependency - uses hardcoded values
"""

import asyncio
import sys
from pathlib import Path

# Add pjsua2 to path
pjsua2_path = Path(__file__).parent / "bin/pjsua2/linux-arm64"
sys.path.insert(0, str(pjsua2_path))

import pjsua2 as pj

class PJSUAAccount(pj.Account):
    def __init__(self):
        pj.Account.__init__(self)
        self.loop = None
        self.auto_answer = False

    def set_loop(self, loop):
        self.loop = loop

    def onRegState(self, prm):
        ai = self.getInfo()
        print(f"Registration: {ai.regStatusText} (code={ai.regStatus})")

async def test_call_internal():
    """Test calling extension 202 from 204 using localhost"""

    server_ip = "127.0.0.1"
    print(f"MikoPBX IP: {server_ip}")

    # Hardcoded credentials (from API)
    pwd204 = "Mjk4MTMyYTA2ZjU3M2QxYzQ5YTNjZWIz"
    pwd202 = "NGIxZjJkMzMyOGY3MGVmYWJiYjBkMmFi"

    # Initialize PJSUA
    ep = pj.Endpoint()
    ep.libCreate()

    ep_cfg = pj.EpConfig()
    ep_cfg.uaConfig.threadCnt = 0
    ep_cfg.uaConfig.mainThreadOnly = True

    log_cfg = pj.LogConfig()
    log_cfg.level = 4
    log_cfg.consoleLevel = 4
    ep_cfg.logConfig = log_cfg

    ep.libInit(ep_cfg)

    # Create UDP transport
    transport_cfg = pj.TransportConfig()
    transport_cfg.port = 0
    ep.transportCreate(pj.PJSIP_TRANSPORT_UDP, transport_cfg)

    ep.libStart()

    # Register extension 202 (callee)
    acc202_cfg = pj.AccountConfig()
    acc202_cfg.idUri = f'"202" <sip:202@{server_ip}>'
    acc202_cfg.regConfig.registrarUri = f"sip:{server_ip}:5060"

    cred202 = pj.AuthCredInfo("digest", "asterisk", "202", 0, pwd202)
    acc202_cfg.sipConfig.authCreds.append(cred202)

    acc202 = PJSUAAccount()
    acc202.create(acc202_cfg)

    print(f"✅ Extension 202 registered")
    await asyncio.sleep(2)

    # Register extension 204 (caller)
    acc204_cfg = pj.AccountConfig()
    acc204_cfg.idUri = f'"204" <sip:204@{server_ip}>'
    acc204_cfg.regConfig.registrarUri = f"sip:{server_ip}:5060"

    cred204 = pj.AuthCredInfo("digest", "asterisk", "204", 0, pwd204)
    acc204_cfg.sipConfig.authCreds.append(cred204)

    acc204 = PJSUAAccount()
    acc204.create(acc204_cfg)

    print(f"✅ Extension 204 registered")
    await asyncio.sleep(2)

    # Make call
    print(f"\n🔥 Calling extension 202...")

    call = pj.Call(acc204)
    call_prm = pj.CallOpParam()
    call_prm.opt.audioCount = 1
    call_prm.opt.videoCount = 0

    dest_uri = f"sip:202@{server_ip}"
    call.makeCall(dest_uri, call_prm)

    # Process events
    ep.libHandleEvents(100)
    await asyncio.sleep(0.5)

    # Wait for call state
    for i in range(30):
        ep.libHandleEvents(10)
        try:
            call_info = call.getInfo()
            state = call_info.state
            state_text = call_info.stateText

            print(f"Call state: {state_text} ({state})")

            if state == pj.PJSIP_INV_STATE_CONFIRMED:
                print(f"✅ SUCCESS! Call to 202 connected")
                await asyncio.sleep(2)
                call.hangup(call_prm)
                await asyncio.sleep(1)
                ep.libDestroy()
                return True
            elif state == pj.PJSIP_INV_STATE_DISCONNECTED:
                print(f"❌ FAILED! Call disconnected")
                ep.libDestroy()
                return False
        except Exception as e:
            print(f"Error checking call: {e}")

        await asyncio.sleep(0.5)

    print(f"❌ FAILED! Call timeout")
    ep.libDestroy()
    return False

if __name__ == "__main__":
    result = asyncio.run(test_call_internal())
    sys.exit(0 if result else 1)
