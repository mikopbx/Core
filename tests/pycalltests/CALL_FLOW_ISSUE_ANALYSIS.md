# Call Flow Test Issue - Root Cause Analysis

## Problem Statement
Extension 204 successfully registers with Asterisk, but when calling extension 202, the call fails to establish. PJSUA shows successful registration but calls timeout.

## Investigation Timeline

### Initial Hypothesis (INCORRECT)
Suspected that extensions 202 and 204 were not being stored in Asterisk's contact database after registration.

**Evidence that disproved this:**
- `pjsip show aor 202` shows correct configuration (max_contacts: 5, valid expiration settings)
- AOR configurations for 202/204 are identical to working extension 228
- When checked during test runtime (not after cleanup), contacts ARE registered

### Key Discovery
Analysis of SIP message flow revealed:

**REGISTER Flow (WORKS):**
```
PJSUA (192.168.107.0:56861) → Asterisk (192.168.107.2:5060): REGISTER
Asterisk → PJSUA: 401 Unauthorized  ✅ RECEIVED
PJSUA → Asterisk: REGISTER (with Authorization)
Asterisk → PJSUA: 200 OK  ✅ RECEIVED
```

**INVITE Flow (FAILS):**
```
PJSUA (192.168.107.0:52625) → Asterisk (192.168.107.2:5060): INVITE sip:202@192.168.107.2
Asterisk → PJSUA: 401 Unauthorized  ❌ NOT RECEIVED
PJSUA → Asterisk: INVITE (with Authorization) [CSeq: 342]
Asterisk → PJSUA: 401 Unauthorized  ❌ NOT RECEIVED
PJSUA → Asterisk: INVITE (retransmit) [CSeq: 342] ← SAME CSeq!
... (6+ retransmissions with CSeq: 342)
```

### Root Cause

**Network/Transport Issue: INVITE responses from Asterisk are not reaching PJSUA**

**Evidence:**
1. Asterisk logs show `401 Unauthorized` being transmitted to `UDP:192.168.107.0:52625`
2. PJSUA retransmits INVITE with **same CSeq (342)**, indicating no response received
3. REGISTER works correctly (responses ARE received)
4. Multiple INVITE retransmissions all have same CSeq, proving PJSUA never got the 401

### Why REGISTER Works But INVITE Doesn't

**Theory**: Different port handling or timing
- REGISTER uses one UDP port and completes quickly
- INVITE call flow is longer-lived and may trigger macOS firewall rules
- Docker bridge network (192.168.107.0/24) may have routing issues for certain message types

## Technical Details

### PJSUA Configuration
- Local IP: 192.168.107.0 (Docker bridge interface)
- SIP transport bound to: 192.168.107.0
- Media transport bound to: 192.168.107.0
- Server IP: 192.168.107.2 (Docker container)

### Asterisk Configuration
- PJSIP endpoint 202: Configured correctly
- AOR 202: max_contacts=5, expiration=3600s
- Transport: UDP on 0.0.0.0:5060

### SIP Message Analysis

**Working INVITE (from extension 228 to IVR):**
```
INVITE sip:10003246@192.168.107.2 SIP/2.0
From: "MikoPBXFirst" <sip:228@192.168.107.2>
→ Asterisk responds with 401
→ Client sends authenticated INVITE
→ Asterisk responds with 100 Trying, then 200 OK
→ Call establishes successfully
```

**Failing INVITE (from extension 204 to 202):**
```
INVITE sip:202@192.168.107.2 SIP/2.0
From: "204" <sip:204@192.168.107.2>
→ Asterisk sends 401 (confirmed in logs)
→ PJSUA NEVER RECEIVES 401
→ PJSUA retransmits with Authorization header preemptively
→ Asterisk sends another 401
→ PJSUA NEVER RECEIVES it
→ Continuous retransmissions until timeout
```

## Proposed Solutions

### Option 1: Run PJSUA Inside Docker Container
**Pros:**
- Eliminates macOS firewall/routing issues
- Simulates real SIP client on same network as Asterisk
- More realistic test scenario

**Cons:**
- Requires Docker image with PJSUA2 Python bindings
- More complex test setup

### Option 2: Fix macOS Network Routing
**Investigate:**
- macOS firewall rules blocking UDP responses
- pfctl (Packet Filter) configuration
- Docker Desktop network settings
- Bridge interface routing table

### Option 3: Use NAT/STUN Configuration
**Configure PJSUA with:**
- STUN server to handle NAT traversal
- Force rport in Via headers
- Enable symmetric RTP

### Option 4: Simplify Test Network Topology
**Use:**
- Docker host network mode (`--network host`)
- Direct communication without bridge
- Requires Linux host (not macOS)

## Immediate Workaround

For testing purposes, use the working call flow pattern:
1. Call IVR numbers (works)
2. Test with extension 228 (has static AOR contact)
3. Run tests inside Docker container

## Next Steps

1. Capture full packet trace with tcpdump on both sides
2. Verify macOS firewall settings: `sudo pfctl -sr`
3. Test with Docker host network mode (Linux only)
4. Implement PJSUA inside Docker container solution

## Conclusion

**The issue is NOT with:**
- Asterisk configuration
- Extension/AOR setup
- PJSUA registration logic
- Authentication credentials

**The issue IS:**
- Network/transport layer blocking INVITE responses
- Likely macOS firewall or Docker bridge routing
- Affects INVITE flow but not REGISTER flow

This is a **test infrastructure issue**, not a MikoPBX or PJSUA code issue.

## SOLUTION IMPLEMENTED ✅

**Approach:** Run PJSUA tests inside Docker container (Option 1)

### Changes Made:

1. **Null Audio Device Configuration** (`pjsua_helper.py:552-559`)
   - Added `audDevManager().setNullDev()` after `libStart()`
   - Allows calls to establish without physical audio hardware
   - Critical for headless Docker environments

2. **Fixed Auto-Answer Callback** (`pjsua_helper.py:73, 122-124`)
   - Added `incoming_calls` list to PJSUAAccount class
   - Store incoming call objects to prevent garbage collection
   - Without this, PJSUA automatically sends "603 Decline"

### Test Results:

```
✅ PJSUA initialized
✅ Extension 202 registered (auto-answer)
✅ Extension 204 registered
🔥 Calling 202 from 204...
✅ SUCCESS! Call connected
```

**Status:** Extension-to-extension calls now work successfully inside Docker container.

### Running Tests:

```bash
# Inside Docker container
docker exec mikopbx_tests-refactoring sh -c "
  cd /offload/rootfs/usr/www/tests/pycalltests && \
  export LD_LIBRARY_PATH=bin/pjsua2/linux-arm64:\$LD_LIBRARY_PATH && \
  export PYTHONPATH=bin/pjsua2/linux-arm64:\$PYTHONPATH && \
  python3 test_simple_call.py
"
```
