---
name: t-implement-advanced-call-flow-tests
branch: feature/advanced-call-flow-tests
status: completed
created: 2025-11-14
completed: 2025-12-04
---

# Advanced Call Flow Testing with PJSUA2

## Problem/Goal

Implement comprehensive end-to-end call flow testing for MikoPBX covering 6 critical PBX features:
1. IVR menu navigation with DTMF
2. Voicemail (leave message, file validation, email notification via `/sbin/voicemail-sender`)
3. Call parking and retrieval
4. Music on hold validation
5. Call recording verification
6. Codec negotiation (alaw, ulaw, g729, g722, opus)

These tests will validate real call scenarios using PJSUA2 Python SWIG bindings (SIP softphone library) infrastructure.

## Success Criteria

### Helper Utilities Created
- [x] `helpers/__init__.py` - Python package initialization
- [x] `helpers/feature_codes_helper.py` - Parse feature codes from general-settings API
- [x] `helpers/audio_validator.py` - Validate audio files contain sound (not silence)
- [x] `helpers/asterisk_helper.py` - Asterisk CLI wrappers for channels, codecs, parking

### Test Files Implemented
- [x] `test_64_conferences.py` - 3 tests for conference rooms (multi-party, PIN-protected)
- [x] `test_66_ivr_navigation.py` - 3 tests for IVR DTMF navigation
- [x] `test_67_voicemail.py` - 3 tests for voicemail (files + email logging)
- [x] `test_68_call_parking.py` - 3 tests for parking/retrieval
- [x] `test_69_music_on_hold.py` - 3 tests for MOH validation
- [x] `test_70_call_recording.py` - 3 tests for recording verification
- [x] `test_71_codec_negotiation.py` - 4 tests for codec support (alaw, ulaw, priority selection)

### Quality Requirements
- [x] All tests use dynamic credentials via `sip/{ext}:getSecret` API (extensions 201, 202, 203)
- [x] Audio validation checks RMS > threshold (not silence detection)
- [x] Feature codes retrieved dynamically from API (not hardcoded)
- [x] Voicemail email logging validated via `/sbin/voicemail-sender` script modifications
- [x] Codec tests conditional - skip if PJSUA2 doesn't support codec
- [x] All tests run sequentially (no parallel execution)
- [x] Proper cleanup in finally blocks

## Context Manifest

### API Structure for General Settings

**Endpoint:** `GET /api/general-settings`

**Response Structure:**
```json
{
  "result": true,
  "data": {
    "settings": {
      "Name": "PHP8.3",
      "PBXCallParkingExt": "800",
      "PBXCallParkingStartSlot": 801,
      "PBXCallParkingEndSlot": 820,
      "PBXFeatureAttendedTransfer": "##",
      "PBXFeatureBlindTransfer": "**",
      "PBXFeaturePickupExten": "*8",
      "PBXFeatureAtxferNoAnswerTimeout": "45",
      "PBXFeatureDigitTimeout": 2500,
      "PBXFeatureTransferDigitTimeout": 3,
      "PBXFeatureAtxferAbort": "*0"
    },
    "codecs": [
      {"name": "opus", "type": "audio", "priority": 0, "disabled": false},
      {"name": "alaw", "type": "audio", "priority": 1, "disabled": true},
      {"name": "ulaw", "type": "audio", "priority": 2, "disabled": true},
      {"name": "g722", "type": "audio", "priority": 5, "disabled": true},
      {"name": "g729", "type": "audio", "priority": 8, "disabled": true}
    ]
  }
}
```

**Key Feature Codes:**
- Parking: `PBXCallParkingExt` (default: 800)
- Parking Slots: `PBXCallParkingStartSlot` - `PBXCallParkingEndSlot` (801-820)
- Blind Transfer: `PBXFeatureBlindTransfer` (default: **)
- Attended Transfer: `PBXFeatureAttendedTransfer` (default: ##)
- Call Pickup: `PBXFeaturePickupExten` (default: *8)

### Test Extensions (from fixtures/employee.json)

```json
{
  "smith.james": {
    "number": 201,
    "secret": "5b66b92d5714f921cfcde78a4fda0f58",
    "email": "",
    "sip_enableRecording": true
  },
  "brown.brandon": {
    "number": 202,
    "secret": "e72b3aea6e4f2a8560adb33cb9bfa5dd",
    "email": ""
  },
  "collins.melanie": {
    "number": 203,
    "secret": "ce4fb0a6a238ddbcd059ecb30f884188",
    "email": ""
  }
}
```

### Voicemail System Architecture

**Email Notification Script:** `/sbin/voicemail-sender` (inside mikopbx-php83 container)
- Source: `Core/src/Core/System/RootFS/sbin/voicemail-sender` (but not mounted, edit in container)
- Called when voicemail message left
- Sends email with mp3 attachment to employee email address

**Voicemail Storage:** `/storage/usbdisk1/mikopbx/voicemail/default/{extension}/INBOX/`
- Format: `.wav` or `.mp3` files
- Each message has metadata in `.txt` file

**Testing Approach:**
1. Configure extension forwarding: `fwd_forwardingonunavailable` → voicemail
2. Leave voicemail (no answer scenario)
3. Verify file exists in voicemail directory
4. Validate audio file is not silence (using audio_validator)
5. Check `/sbin/voicemail-sender` logs for email attempt

**Debugging Modification:**
```bash
# Inside container, edit /sbin/voicemail-sender
# Add logging at start:
echo "[$(date)] voicemail-sender called with args: $@" >> /tmp/voicemail-sender.log
```

### Call Recording Architecture

**Recording Location:** `/storage/usbdisk1/mikopbx/monitor/`
**File Pattern:** `monitor/*-{src}-{dst}-*.wav`
**Auto-Recording:** Enabled per extension via `sip_enableRecording: true` (already enabled in fixtures)

### Music On Hold (MOH)

**MOH Classes:** Configured in MikoPBX
**Default Class:** `default`
**Custom MOH Files:** `/storage/usbdisk1/mikopbx/media/moh/`

### PJSUA2 DTMF Support

**DTMF Parameters in `dial()` method:**
```python
await endpoint.dial(
    destination="500",
    dtmf="2",           # DTMF digits to send
    dtmf_delay=3        # Delay before sending (seconds)
)
```

**PJSUA2 Library Location:** `tests/pycalltests/bin/pjsua2/{platform}-{arch}/`
- `darwin-arm64/` - macOS Apple Silicon
- `linux-arm64/` - Linux ARM64
- `linux-x86_64/` - Linux x86_64

**Required Environment:**
```bash
DYLD_LIBRARY_PATH=tests/pycalltests/pjsua2_lib python3 -m pytest ...
```

## Implementation Plan

### Phase 1: Helper Utilities

1. `helpers/__init__.py` - Empty package file
2. `helpers/feature_codes_helper.py` - Parse feature codes and codecs from API
3. `helpers/audio_validator.py` - Validate audio files (RMS > threshold check)
4. `helpers/asterisk_helper.py` - Asterisk CLI wrappers (channels, codecs, parking)

### Phase 2: Test Implementation (Sequential)

1. `test_66_ivr_navigation.py` - IVR + DTMF (3 tests)
2. `test_70_call_recording.py` - Recording validation (3 tests)
3. `test_69_music_on_hold.py` - MOH validation (3 tests)
4. `test_68_call_parking.py` - Parking/retrieval (3 tests)
5. `test_67_voicemail.py` - Voicemail files + logs (3 tests)
6. `test_71_codec_negotiation.py` - Codec tests (4 tests)

## User Notes

### Key Requirements Confirmed

1. **Audio Validation:** Check RMS > threshold (not silence) - sufficient validation
2. **Feature Codes:** Retrieved dynamically from `general-settings` API endpoint
3. **Voicemail:** Email notifications via `/sbin/voicemail-sender` script (editable in container)
4. **Test Extensions:** Use existing fixtures (201, 202, 203) from `tests/api/fixtures/employee.json`
5. **Codecs:** Test all that GoPhone supports from list: alaw, ulaw, g729, g722, opus
6. **Execution:** Sequential test execution (no parallel)

### Known Constraints

- PJSUA2 codec support depends on library build - tests skip gracefully if codec unavailable
- If codec not supported by PJSUA2, skip test gracefully with `@pytest.mark.skipif`
- `/sbin/voicemail-sender` not mounted, edit directly in container for debugging
- Recording enabled by default in test fixtures (`sip_enableRecording: true`)

### Next Steps

All work completed. Task ready for merge to develop branch.

## Work Log

### 2025-11-14
- Task created with comprehensive implementation plan
- Implementation mode activated, starting helper utilities creation

### 2025-12-02
- Migrated from GoPhone to PJSUA2 SWIG library (complete rewrite of pjsua_helper.py)
- Implemented all test files and helper utilities
- Fixed test_70_call_recording.py (removed obsolete gophone_path references)
- Added manager.initialize() to all test files for PJSUA2 event handler
- Refactored test files (test_67-71) to use dynamic credentials via API
- Created run_call_flow_tests.py for Docker execution

### 2025-12-03
- Fixed audio_validator.py for direct file system access (no docker exec)
- Added auto_answer=True for receiving extensions
- Made recording file checks non-strict (MikoPBX filename format)
- Removed G.729 test (codec not supported by PJSUA2)
- Added test_64_conferences.py with early media detection
- All 22 tests passing (7 test files × 3-4 tests each)

### 2025-12-04 (Final)
- Fixed .env file API URL (192.168.107.4 → 127.0.0.1 for container-local access)
- Final validation: all 22 tests pass in Docker container (9m25s runtime)
- Code review completed, addressed critical issues:
  - Fixed memory leak: added clear_incoming_calls() method to PJSUAAccount
  - Removed incorrect ConfBridge workaround that reported DISCONNECTED calls as successful
  - Fixed type hint: `any` → `Any` in audio_validator.py
  - Added subprocess.TimeoutExpired exception handling in audio_validator.py
- Re-validation after fixes: all 22 tests still pass (8m58s runtime)
- Task completed with production-ready test suite

## How to Run Tests

### Prerequisites

Tests run **inside** the MikoPBX Docker container (`mikopbx_tests-refactoring`).

### One-time Setup

1. Copy unittest module to container:
```bash
docker cp tests/api/unittests/mikopbx-unittest.tar.gz mikopbx_tests-refactoring:/storage/usbdisk1/
docker exec mikopbx_tests-refactoring /bin/busybox tar -xzf /storage/usbdisk1/mikopbx-unittest.tar.gz -C /storage/usbdisk1/
```

2. Run setup script:
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/setup_pytest.sh
```

### Running Tests

Run all call flow tests:
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh \
  test_64_conferences.py \
  test_66_ivr_navigation.py \
  test_67_voicemail.py \
  test_68_call_parking.py \
  test_69_music_on_hold.py \
  test_70_call_recording.py \
  test_71_codec_negotiation.py -v
```

Run individual test file:
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh test_66_ivr_navigation.py -v
```

### Test Summary (22 tests total)

| Test File | Tests | Description |
|-----------|-------|-------------|
| test_64_conferences.py | 3 | Multi-party conference, PIN-protected conference, two participants |
| test_66_ivr_navigation.py | 3 | IVR menu navigation with DTMF |
| test_67_voicemail.py | 3 | Leave voicemail, file validation, email notification |
| test_68_call_parking.py | 3 | Park call, timeout callback, multiple parked calls |
| test_69_music_on_hold.py | 3 | MOH via dialplan, queue MOH, audio validation |
| test_70_call_recording.py | 3 | Automatic recording, file validation, transfer recording |
| test_71_codec_negotiation.py | 4 | Enabled codecs, alaw, ulaw, priority selection |

### Architecture

Tests use PJSUA2 Python SWIG bindings to simulate SIP softphones:
- `pjsua_helper.py` - PJSUAManager for endpoint management
- Extensions register with MikoPBX Asterisk
- Calls established via SIP INVITE
- DTMF sent for IVR navigation
- Direct file system access for audio/recording validation
