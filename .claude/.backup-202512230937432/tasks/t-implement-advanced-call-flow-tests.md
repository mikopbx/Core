---
name: t-implement-advanced-call-flow-tests
branch: feature/advanced-call-flow-tests
status: in-progress
created: 2025-11-14
---

# Advanced Call Flow Testing with GoPhone and CipBX

## Problem/Goal

Implement comprehensive end-to-end call flow testing for MikoPBX covering 6 critical PBX features:
1. IVR menu navigation with DTMF
2. Voicemail (leave message, file validation, email notification via `/sbin/voicemail-sender`)
3. Call parking and retrieval
4. Music on hold validation
5. Call recording verification
6. Codec negotiation (alaw, ulaw, g729, g722, opus)

These tests will validate real call scenarios using GoPhone (SIP softphone) and CipBX (provider simulator) infrastructure already in place.

## Success Criteria

### Helper Utilities Created
- [ ] `helpers/__init__.py` - Python package initialization
- [ ] `helpers/feature_codes_helper.py` - Parse feature codes from general-settings API
- [ ] `helpers/audio_validator.py` - Validate audio files contain sound (not silence)
- [ ] `helpers/asterisk_helper.py` - Asterisk CLI wrappers for channels, codecs, parking

### Test Files Implemented
- [ ] `test_66_ivr_navigation.py` - 3 tests for IVR DTMF navigation
- [ ] `test_67_voicemail.py` - 3 tests for voicemail (files + email logging)
- [ ] `test_68_call_parking.py` - 3 tests for parking/retrieval
- [ ] `test_69_music_on_hold.py` - 3 tests for MOH validation
- [ ] `test_70_call_recording.py` - 3 tests for recording verification
- [ ] `test_71_codec_negotiation.py` - 5 tests for codec support (conditional on GoPhone support)

### Quality Requirements
- [ ] All tests use fixtures from `tests/api/fixtures/employee.json` (extensions 201, 202, 203)
- [ ] Audio validation checks RMS > threshold (not silence detection)
- [ ] Feature codes retrieved dynamically from API (not hardcoded)
- [ ] Voicemail email logging validated via `/sbin/voicemail-sender` script modifications
- [ ] Codec tests conditional - skip if GoPhone doesn't support codec
- [ ] All tests run sequentially (no parallel execution)
- [ ] Proper cleanup in finally blocks

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

### GoPhone DTMF Support

**DTMF Parameters in `dial()` method:**
```python
await endpoint.dial(
    destination="500",
    dtmf="2",           # DTMF digits to send
    dtmf_delay=3        # Delay before sending (seconds)
)
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
6. `test_71_codec_negotiation.py` - Codec tests (5 tests, conditional)

## User Notes

### Key Requirements Confirmed

1. **Audio Validation:** Check RMS > threshold (not silence) - sufficient validation
2. **Feature Codes:** Retrieved dynamically from `general-settings` API endpoint
3. **Voicemail:** Email notifications via `/sbin/voicemail-sender` script (editable in container)
4. **Test Extensions:** Use existing fixtures (201, 202, 203) from `tests/api/fixtures/employee.json`
5. **Codecs:** Test all that GoPhone supports from list: alaw, ulaw, g729, g722, opus
6. **Execution:** Sequential test execution (no parallel)

### Known Constraints

- GoPhone codec support unknown - need to verify before implementing codec tests
- If codec not supported by GoPhone, skip test gracefully with `@pytest.mark.skipif`
- `/sbin/voicemail-sender` not mounted, edit directly in container for debugging
- Recording enabled by default in test fixtures (`sip_enableRecording: true`)

## Work Log

- [2025-11-14] Task created with detailed implementation plan
- [2025-11-14] Implementation mode activated, starting helper utilities creation
