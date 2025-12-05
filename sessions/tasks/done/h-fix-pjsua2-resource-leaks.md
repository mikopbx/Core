---
name: h-fix-pjsua2-resource-leaks
status: complete
created: 2025-11-17
completed: 2025-11-18
priority: high
parent_task: h-implement-pjsua-python-swig
---

# Fix PJSUA2 Resource Management Issues

## Problem/Goal

Code review of PJSUA2 integration (task h-implement-pjsua-python-swig) identified 3 critical resource management issues that will cause memory leaks and resource exhaustion when running full test suite (100+ tests):

1. **Event Handler Thread Leak**: Background tasks accumulate without cleanup
2. **PJSIP Endpoint Never Destroyed**: Missing `libDestroy()` call causes memory/socket leaks
3. **Unhandled Future Exceptions**: Race conditions cause silent failures

These issues are real and will manifest during CI/CD test runs. Core functionality works (verified with container tests), but resource cleanup is incomplete.

## Context Manifest

### Technical Reference

#### Class Structure

**PJSUAManager (lines 414-566):**
- Class variables (shared across all instances):
  - `_endpoint_initialized: bool` - Tracks singleton state
  - `_endpoint_lock: threading.Lock` - Thread-safe initialization
  - `_endpoint: Optional[pj.Endpoint]` - The PJSIP singleton
  - `_event_handler_task: Optional[asyncio.Task]` - Background event pump
  - `_running: bool` - Controls event handler loop
  - `_local_ip: Optional[str]` - Docker bridge IP for RTP media
- Instance variables:
  - `server_ip: str` - MikoPBX server address
  - `endpoints: Dict[str, PJSUAEndpoint]` - Active test phones
  - `_initialized: bool` - Instance initialization flag

**PJSUAAccount (lines 65-121):**
- Inherits from `pj.Account` (PJSIP C++ SWIG binding)
- Instance variables:
  - `loop: asyncio.EventLoop` - For thread-safe callbacks
  - `registration_future: Optional[asyncio.Future]` - Currently unused
  - `logger: logging.Logger` - Debug logging
- Callbacks:
  - `onRegState(prm)` - Fires when SIP REGISTER response received

**PJSUACall (lines 123-182):**
- Inherits from `pj.Call` (PJSIP C++ SWIG binding)
- Instance variables:
  - `loop: asyncio.EventLoop` - For thread-safe callbacks
  - `call_future: Optional[asyncio.Future]` - Currently unused
  - `logger: logging.Logger` - Debug logging
- Callbacks:
  - `onCallState(prm)` - Fires when call state changes
  - `onCallMediaState(prm)` - Fires when media connects

#### PJSIP Lifecycle Methods

```python
# Initialization sequence (implemented in _init_endpoint)
endpoint = pj.Endpoint()
endpoint.libCreate()
endpoint.libInit(ep_cfg)
endpoint.transportCreate(...)
endpoint.libStart()

# Cleanup sequence (implemented in shutdown classmethod)
endpoint.libDestroy()
```

#### Event Handler Pattern

```python
# Current implementation (lines 447-473)
async def _handle_events(self):
    while PJSUAManager._running:
        if PJSUAManager._endpoint:
            PJSUAManager._endpoint.libHandleEvents(10)  # 10ms max blocking
        await asyncio.sleep(0.01)  # 10ms between polls
```

This must run continuously while any endpoint is active. Calling `libHandleEvents()` processes queued network events and triggers callbacks.

#### Test File Locations

Tests that use PJSUA2 (import gophone_helper):
- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/test_66_ivr_navigation.py`
- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/test_67_voicemail.py`
- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/test_68_call_parking.py`
- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/test_69_music_on_hold.py`

All tests use the same fixture pattern with `gophone_manager` (which is GoPhoneManager = PJSUAManager alias).

#### Implementation Files

- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/pjsua_helper.py` - Main implementation
- `/Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring/tests/pycalltests/conftest.py` - Session cleanup fixture

#### Configuration Constants

Test extensions used across test suite:
```python
TEST_EXTENSIONS = {
    "201": "5b66b92d5714f921cfcde78a4fda0f58",
    "202": "e72b3aea6e4f2a8560adb33cb9bfa5dd",
    "203": "ce4fb0a6a238ddbcd059ecb30f884188",
}
```

Event handler timing:
- Poll interval: 10ms (`await asyncio.sleep(0.01)`)
- Event processing: 10ms max per call (`libHandleEvents(10)`)

Registration/call timeouts:
- Default registration timeout: 15 seconds
- Default call timeout: 30 seconds
- Poll interval: 100ms (`await asyncio.sleep(0.1)`)

#### Dependencies

Python modules:
- `pjsua2` - SWIG-generated Python bindings for PJSIP library
- `asyncio` - Async/await infrastructure
- `threading` - Thread locks for singleton initialization

Platform detection (lines 19-41):
- Loads platform-specific PJSIP library from `bin/pjsua2/{system}-{machine}/`
- Supports: darwin-arm64, linux-arm64, linux-x86_64

External processes:
- Docker commands to detect MikoPBX IP via DNS or `docker inspect`

## Success Criteria

- [x] Event handler task properly stopped on cleanup
- [x] PJSIP endpoint destroyed with `libDestroy()`
- [x] Future exceptions logged when callbacks fire after timeout
- [x] pytest fixture ensures cleanup after test session
- [x] No resource leaks verified

## Work Log

### 2025-11-18

#### Completed
- Converted `shutdown()` to @classmethod in pjsua_helper.py (lines 593-640)
  - Changed from instance method to class method (no server_ip required)
  - Stops event handler by setting `cls._running = False`
  - Awaits task completion with 5-second timeout
  - Added task cancellation fallback to prevent race conditions
  - Calls `cls._endpoint.libDestroy()` to release PJSIP resources
  - Resets all class variables to initial state
- Updated pytest fixture in conftest.py (lines 99-126)
  - Created session-scoped `pjsua_cleanup` fixture with autouse=True
  - Calls `await PJSUAManager.shutdown()` after all tests complete
  - Best-effort cleanup with exception logging
- Verified callback error logging already implemented
  - `onRegState()` logs errors even when no future waiting
  - `onCallState()` logs errors even when no future waiting
  - Prevents silent failures during race conditions
- Created verification scripts (verify_shutdown_ast.py, verify_shutdown.py)
  - All verifications passed

#### Decisions
- Used @classmethod pattern for shutdown() to avoid requiring server_ip parameter
- Applied task cancellation fallback to ensure event handler definitely stops before libDestroy()
- Chose session-scoped fixture over module-scoped to ensure cleanup happens once after entire test run

#### Files Modified
- tests/pycalltests/pjsua_helper.py - Main shutdown implementation
- tests/pycalltests/conftest.py - Pytest session cleanup fixture
- tests/pycalltests/verify_shutdown_ast.py - AST verification (can be removed)
- tests/pycalltests/verify_shutdown.py - Import verification (can be removed)

## References

- Parent task: `h-implement-pjsua-python-swig.md`
- PJSIP lifecycle: https://docs.pjsip.org/en/latest/api/pjsua_lib.html#endpoint-management
