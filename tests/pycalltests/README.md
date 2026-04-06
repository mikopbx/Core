# MikoPBX Call Flow Tests (pycalltests)

Python-based test suite for testing MikoPBX call flows using PJSUA2 Python SWIG bindings.

## Overview

This test suite uses PJSUA2 (PJSIP User Agent) to simulate real SIP softphones and test advanced MikoPBX features:

- **Conference rooms** - Multi-party conferences, PIN protection, participant management
- **IVR navigation** - DTMF-based menu navigation, multi-level menus
- **Voicemail** - Message recording, file validation, email notifications
- **Call parking** - Park calls, timeout callbacks, retrieval from slots
- **Call recording** - Automatic recording, file validation, recording during transfers
- **Music on hold** - MOH validation via dialplan, queues, audio quality checks
- **Codec negotiation** - alaw, ulaw, opus, g722 support and priority selection
- **Call queues** - Agent login, call distribution, queue timeouts
- **Attended transfer** - DTMF ## transfer, cancel, no-answer scenarios

## Quick Start

### Prerequisites

- **Python 3.11+** installed in MikoPBX Docker container
- **MikoPBX container** running with Asterisk
- **Test extensions** configured (201, 202, 203) - auto-created from fixtures
- **PJSUA2 libraries** pre-installed in `bin/pjsua2/{platform}/`

### Running Tests

**Important:** Tests run **inside** the MikoPBX Docker container for direct file system access to voicemail, recordings, and audio files.

#### One-time Setup

1. Copy test dependencies to container:
```bash
docker cp tests/api/unittests/mikopbx-unittest.tar.gz mikopbx_tests-refactoring:/storage/usbdisk1/
docker exec mikopbx_tests-refactoring /bin/busybox tar -xzf /storage/usbdisk1/mikopbx-unittest.tar.gz -C /storage/usbdisk1/
```

2. Run setup script (installs pytest and dependencies):
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/setup_pytest.sh
```

#### Running Tests

Run all call flow tests (25 tests, ~10 minutes):
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh \
  test_64_conferences.py \
  test_66_ivr_navigation.py \
  test_67_voicemail.py \
  test_68_call_parking.py \
  test_69_music_on_hold.py \
  test_70_call_recording.py \
  test_71_codec_negotiation.py \
  test_72_attended_transfer.py -v
```

Run individual test suite:
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh test_66_ivr_navigation.py -v
```

Run specific test:
```bash
docker exec mikopbx_tests-refactoring /storage/usbdisk1/python_packages/run_pytest.sh test_66_ivr_navigation.py::test_ivr_single_level -v
```

## Test Suite Coverage

### Test Files (28 tests total)

| Test File | Tests | Description | Key Features |
|-----------|-------|-------------|--------------|
| **test_63_call_queues.py** | 3 | Call queue functionality | Agent login, call distribution, timeouts |
| **test_64_conferences.py** | 3 | Conference room features | Multi-party calls, PIN protection, early media |
| **test_66_ivr_navigation.py** | 3 | IVR menu navigation | DTMF routing, nested menus, invalid input |
| **test_67_voicemail.py** | 3 | Voicemail system | Message recording, file validation, email logs |
| **test_68_call_parking.py** | 3 | Call parking/retrieval | Park to slots, timeout callbacks, multi-park |
| **test_69_music_on_hold.py** | 3 | Music on hold | MOH via dialplan, queues, RMS validation |
| **test_70_call_recording.py** | 3 | Call recording | Auto-recording, file checks, transfer recording |
| **test_71_codec_negotiation.py** | 4 | Codec support | alaw, ulaw, opus, priority selection |
| **test_72_attended_transfer.py** | 6 | Attended transfer | DTMF ## transfer, cancel, no-answer, trunk transfer, CTI race condition |

**Total runtime:** ~10 minutes (sequential execution)

## Architecture

### PJSUA2 SIP Stack Integration

The test framework uses **PJSUA2 Python SWIG bindings** for SIP functionality:

- **Core library**: `pjsua_helper.py` - PJSUAManager and PJSUAEndpoint classes
- **Platform detection**: Automatically loads correct PJSUA2 libraries (darwin-arm64, linux-arm64, linux-x86_64)
- **Event-driven**: Asynchronous call handling via PJSIP callbacks
- **Resource management**: Automatic cleanup via pytest fixtures

### Key Components

#### PJSUAManager
Singleton manager for PJSIP endpoint and SIP accounts:
- Shared PJSIP endpoint across all tests
- Creates/registers multiple SIP endpoints (test phones)
- Background event handler thread for PJSIP callbacks
- Thread-safe asyncio integration

#### PJSUAEndpoint
Individual SIP softphone instance:
- SIP account registration with MikoPBX
- Outbound call initiation (`dial()`)
- Inbound call handling (auto-answer support)
- DTMF sending (`send_dtmf()`)
- Call state monitoring (EARLY, CONNECTING, CONFIRMED, DISCONNECTED)
- Audio stream management

#### Helper Utilities

**`helpers/audio_validator.py`** - Audio file validation
- Check audio files contain sound (not silence)
- RMS (Root Mean Square) level analysis
- Duration and file size validation
- Direct file system access (runs inside container)

**`helpers/feature_codes_helper.py`** - Feature code extraction
- Parse feature codes from `general-settings` API
- Dynamic parking slots, transfer codes, pickup codes
- Codec priority configuration

**`helpers/asterisk_helper.py`** - Asterisk CLI wrappers
- Execute Asterisk commands via `asterisk -rx`
- Channel monitoring (`core show channels`)
- Codec verification (`core show translation`)
- Call parking status (`parkedcalls show`)

**`helpers/ami_helper.py`** - AMI event watcher for transfer testing
- Async AMI client simulating external CTI module behavior
- Watches for AttendedTransfer events and fires Hangup to reproduce race conditions
- Used by test_05 and test_06 in test_72_attended_transfer.py

### Resource Management

PJSUA2 requires proper cleanup to prevent memory/socket leaks:

```python
# Automatic cleanup via pytest session fixture
# Tests inherit from conftest.py fixture

@pytest_asyncio.fixture(scope="session")
async def cleanup_pjsua():
    yield
    await PJSUAManager.shutdown()  # Stops event handler, destroys endpoint
```

**Important:** Tests must call `manager.initialize()` before creating endpoints to start the PJSIP event handler.

### Platform Support

Pre-built PJSUA2 libraries for multiple platforms:
- **macOS ARM64** (darwin-arm64) - Local development on Apple Silicon
- **Linux ARM64** (linux-arm64) - MikoPBX container (default)
- **Linux x86_64** (linux-x86_64) - Intel/AMD containers

Libraries located in `bin/pjsua2/{platform}/` with automatic platform detection.

## Configuration

### Environment Variables

Tests use environment variables (set via Docker ENV or `tests/api/.env`):

```bash
# API endpoint (required)
MIKOPBX_API_URL=https://127.0.0.1:8445/pbxcore/api/v3

# API credentials (required)
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=your_password

# Docker container name
MIKOPBX_CONTAINER=mikopbx-php83

# SIP server (resolved automatically via Docker container IP)
MIKOPBX_SIP_HOSTNAME=<auto-detected>
```

**Note:** The `run_pytest.sh` wrapper automatically maps legacy Docker env vars (`API_BASE_URL`, `API_LOGIN`, `API_PASSWORD`) to current names.

### Test Credentials

Test extensions auto-created from `tests/api/fixtures/employee.json`:

```json
{
  "smith.james": {"number": 201, "sip_enableRecording": true},
  "brown.brandon": {"number": 202},
  "collins.melanie": {"number": 203}
}
```

Credentials retrieved dynamically via `sip/{ext}:getSecret` API endpoint.

## How Tests Work

### Test Execution Flow

1. **Setup Phase** (per test)
   - Initialize PJSUAManager (start PJSIP event handler)
   - Get extension credentials from API (`sip/{ext}:getSecret`)
   - Create SIP endpoints for test extensions (201, 202, 203)
   - Register endpoints with MikoPBX Asterisk

2. **Test Phase**
   - Initiate SIP calls via `endpoint.dial(destination, dtmf="123")`
   - Monitor call states (EARLY, CONNECTING, CONFIRMED, DISCONNECTED)
   - Send DTMF tones for IVR navigation
   - Validate audio files (voicemail, recordings, MOH)
   - Check Asterisk state via CLI (`core show channels`, `parkedcalls show`)

3. **Cleanup Phase**
   - Hang up active calls
   - Unregister SIP endpoints
   - Destroy endpoint resources
   - Session-scoped fixture calls `PJSUAManager.shutdown()` at end

### Key Design Patterns

**Dynamic Credentials** - All tests retrieve SIP secrets via API (no hardcoded passwords)

**Direct File Access** - Tests run inside container to validate voicemail/recording files without `docker exec` overhead

**Feature Code Detection** - Parking extensions, transfer codes dynamically retrieved from `general-settings` API

**Conditional Codec Tests** - Tests skip gracefully if PJSUA2 doesn't support codec (e.g., G.729)

**Early Media Detection** - Conference tests detect ConfBridge prompts in EARLY state (before call answered)

**Auto-Answer Support** - Receiving endpoints can auto-answer via `auto_answer=True` parameter

## Writing New Tests

### Test Template

```python
import pytest
import pytest_asyncio
from pjsua_helper import PJSUAManager, PJSUAConfig
from conftest import MikoPBXClient, get_extension_secret

@pytest_asyncio.fixture
async def pjsua_manager(mikopbx_ip):
    manager = PJSUAManager(server_ip=mikopbx_ip)
    await manager.initialize()  # Start PJSIP event handler
    yield manager
    await manager.cleanup_all()

@pytest.mark.asyncio
async def test_my_feature(pjsua_manager, mikopbx_client):
    # Get credentials
    secret = await get_extension_secret(mikopbx_client, "201")

    # Create endpoint
    config = PJSUAConfig(extension="201", password=secret,
                         server_ip=pjsua_manager.server_ip)
    endpoint = await pjsua_manager.create_endpoint(config)

    # Make call
    call = await endpoint.dial("500", dtmf="1", dtmf_delay=3)

    # Wait for call states
    await call.wait_for_state("CONFIRMED", timeout=10)
    await asyncio.sleep(5)  # Let call establish

    # Cleanup
    await endpoint.hangup()
    await pjsua_manager.destroy_endpoint("201")
```

### Best Practices

1. **Always initialize manager** - Call `manager.initialize()` before creating endpoints
2. **Use dynamic credentials** - Never hardcode SIP passwords
3. **Wait for states** - Use `call.wait_for_state()` instead of fixed sleeps
4. **Clean up resources** - Hang up calls and destroy endpoints in `finally` blocks
5. **Validate audio** - Use `helpers/audio_validator.py` to check recordings/voicemail
6. **Check Asterisk state** - Use `helpers/asterisk_helper.py` to verify channel state
7. **Handle timeouts** - Use reasonable timeouts for call operations (10-30s)
8. **Sequential execution** - Tests run sequentially (no parallel calls)

## Troubleshooting

### Common Issues

**"Registration failed: 403 Forbidden"**
- Check extension credentials via API
- Verify extension exists in MikoPBX
- Check Asterisk SIP peer: `asterisk -rx "pjsip show endpoint 201"`

**"Call timeout in state CALLING"**
- Destination doesn't exist or not registered
- Check Asterisk dialplan: `asterisk -rx "dialplan show {extension}"`
- Verify network connectivity between container and Asterisk

**"Audio file validation failed"**
- File doesn't exist (timing issue - add sleep before check)
- File is silence (call didn't record properly)
- Check Asterisk logs: `/storage/usbdisk1/mikopbx/log/asterisk/messages`

**"PJSUA2 library not found"**
- Verify platform detection: `python3 -c "import platform; print(platform.system(), platform.machine())"`
- Check library exists: `ls bin/pjsua2/{platform}/`
- Set library path: `export LD_LIBRARY_PATH=bin/pjsua2/{platform}/`

### Debug Logging

Enable verbose logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check PJSIP logs:
```python
# In pjsua_helper.py, set log level
ep_cfg.logConfig.level = 5  # 0=none, 6=max verbosity
```

## Documentation

- **PJSUA2 Build Guide**: `bin/pjsua2/build/README.md`
- **Implementation Task**: `sessions/tasks/t-implement-advanced-call-flow-tests.md`
- **API Configuration**: `tests/api/.env`

## References

- **PJSIP Documentation**: https://docs.pjsip.org/
- **PJSUA2 Python Guide**: https://docs.pjsip.org/en/latest/pjsua2/intro_pjsua2.html
- **Asterisk Dialplan**: https://docs.asterisk.org/
- **pytest-asyncio**: https://github.com/pytest-dev/pytest-asyncio
