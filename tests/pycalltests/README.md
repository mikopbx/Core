# MikoPBX Call Flow Tests (pycalltests)

Python-based test suite for testing MikoPBX call flows using PJSUA2 SIP library.

## Overview

This test suite uses PJSUA2 (PJSIP User Agent) to simulate real SIP phones and test various MikoPBX features:

- IVR navigation
- Voicemail
- Call parking
- Call recording
- Music on hold
- Codec negotiation
- Conference rooms
- Call queues

## Quick Start

### Prerequisites

- Python 3.11+
- MikoPBX container running
- Test extensions configured (201, 202, 203)

### Running Tests

```bash
cd tests/pycalltests
pytest test_66_ivr_navigation.py -v
pytest test_67_voicemail.py -v
# ... or run all tests
pytest
```

## Architecture

### PJSUA2 Integration

The test framework uses PJSUA2 Python bindings for SIP functionality:

- **Helper module**: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/pjsua_helper.py`
- **Platform detection**: Automatically loads correct libraries (darwin-arm64 or linux-arm64)
- **Resource management**: Session-scoped pytest fixture ensures proper cleanup

### Key Components

**PJSUAManager** - Manages PJSIP endpoint and SIP accounts
- Singleton pattern for shared PJSIP endpoint
- Creates/manages multiple SIP endpoints (test phones)
- Handles event processing in background task

**PJSUAEndpoint** - Individual SIP phone/account
- SIP registration
- Outbound/inbound calls
- DTMF sending
- Call state management

**Resource Cleanup** - Automatic via pytest fixture
- `shutdown()` class method stops event handler and destroys endpoint
- Session-scoped fixture in `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/conftest.py` (lines 99-126)
- No manual cleanup required in tests

## Important Notes

### Resource Management

PJSUA2 requires proper cleanup to prevent memory/socket leaks. This is handled automatically by the test framework:

```python
# Cleanup happens automatically via pytest fixture
# Tests don't need to call shutdown() manually

# The fixture calls:
await PJSUAManager.shutdown()
```

### Platform Support

- macOS ARM64 (darwin-arm64) - local development
- Linux ARM64 (linux-arm64) - MikoPBX container

Libraries located in `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/bin/pjsua2/{platform}/`

## Configuration

Test configuration in `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/.env`:

```bash
MIKOPBX_API_URL=https://mikopbx-php83.dev-docker.orb.local/pbxcore/api/v3
MIKOPBX_CONTAINER=mikopbx_modules-api-refactoring
MIKOPBX_SIP_HOSTNAME=mikopbx-php83.dev-docker.orb.local
```

Test extension credentials in `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/api/fixtures/employee.json`

## Documentation

- **Build Guide**: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/bin/pjsua2/build/README.md`
- **Implementation Task**: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/sessions/tasks/done/h-implement-pjsua-python-swig.md`
- **Resource Fix Task**: `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/sessions/tasks/h-fix-pjsua2-resource-leaks.md`

## References

- PJSIP: https://docs.pjsip.org/
- PJSUA2 Python Guide: https://docs.pjsip.org/en/latest/pjsua2/intro_pjsua2.html
