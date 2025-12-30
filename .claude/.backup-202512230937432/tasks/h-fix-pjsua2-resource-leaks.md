---
name: h-fix-pjsua2-resource-leaks
status: pending
created: 2025-11-17
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

## Success Criteria

- [ ] Event handler task properly stopped on cleanup
- [ ] PJSIP endpoint destroyed with `libDestroy()` when no longer needed
- [ ] Future exceptions logged when callbacks fire after timeout
- [ ] pytest fixture ensures cleanup after test session
- [ ] No resource leaks when running full test suite (verify with pytest --count=100)

## Critical Issues to Fix

### Issue 1: Event Handler Thread Leak
**File**: `tests/pycalltests/pjsua_helper.py:430-445`

**Current Code**:
```python
async def initialize(self):
    if PJSUAManager._event_handler_task is None or PJSUAManager._event_handler_task.done():
        PJSUAManager._running = True
        loop = asyncio.get_running_loop()
        PJSUAManager._event_handler_task = loop.create_task(self._handle_events())
        # Event handler starts but cleanup_all() doesn't stop it
```

**Problem**: 
- `cleanup_all()` (line 551-562) explicitly does NOT stop event handler
- Comment says "let it run for the entire session" but creates new task per test
- With 100 tests → 100 background tasks all calling `libHandleEvents()` every 10ms

**Required Fix**:
```python
async def shutdown(self):
    """Stop event handler and cleanup endpoint"""
    PJSUAManager._running = False
    if PJSUAManager._event_handler_task:
        await PJSUAManager._event_handler_task
        PJSUAManager._event_handler_task = None
    
    # Destroy endpoint (fixes Issue 2)
    if PJSUAManager._endpoint:
        PJSUAManager._endpoint.libDestroy()
        PJSUAManager._endpoint = None
        PJSUAManager._endpoint_initialized = False
```

**Pytest Integration**:
```python
# tests/pycalltests/conftest.py
@pytest.fixture(scope="session", autouse=True)
async def pjsua_cleanup():
    """Ensure PJSUA resources cleaned up after test session"""
    yield
    # Cleanup after all tests complete
    from pjsua_helper import PJSUAManager
    manager = PJSUAManager()
    await manager.shutdown()
```

---

### Issue 2: PJSIP Endpoint Never Destroyed
**File**: `tests/pycalltests/pjsua_helper.py:475-528`

**Current Code**:
```python
def _init_endpoint(self):
    with self._endpoint_lock:
        if not PJSUAManager._endpoint_initialized:
            PJSUAManager._endpoint = pj.Endpoint()
            PJSUAManager._endpoint.libCreate()
            PJSUAManager._endpoint.libInit(ep_cfg)
            PJSUAManager._endpoint.libStart()
            # MISSING: No libDestroy() cleanup anywhere
```

**Problem**:
- PJSIP requires lifecycle: `libCreate()` → `libInit()` → `libStart()` → **`libDestroy()`**
- Without `libDestroy()`: memory pools, thread pools, socket descriptors leak
- Full test suite accumulates resources across all tests

**Required Fix**: Add cleanup to `shutdown()` method (see Issue 1 fix above)

**Verification**:
```bash
# Run test suite multiple times, check resource usage
pytest tests/pycalltests/test_66_ivr_navigation.py --count=10 -v
# Monitor with: watch -n 1 'lsof -p $(pgrep -f pytest) | wc -l'
```

---

### Issue 3: Unhandled Future Exceptions
**File**: `tests/pycalltests/pjsua_helper.py:87-104, 151-165`

**Current Code**:
```python
def onRegState(self, prm):
    if self.registration_future and not self.registration_future.done():
        if status >= 400:
            if self.loop:
                self.loop.call_soon_threadsafe(
                    self.registration_future.set_exception,
                    RuntimeError(f"Registration failed: {status} - {reason}")
                )
    # If future is done/None, exception is silently lost
```

**Problem**:
- Race: PJSIP callback fires AFTER test already timed out and abandoned future
- Exception set on done/None future → silently lost
- Test sees generic timeout instead of real error (e.g., "401 Unauthorized")

**Scenario**:
```python
# Test times out at 15s waiting for registration
success = await endpoint.register(timeout=15)  # Returns False

# At 16s, PJSIP receives "401 Unauthorized" response
# Callback fires but future already done → exception lost
# Developer sees "timeout" instead of "wrong password"
```

**Required Fix**:
```python
def onRegState(self, prm):
    try:
        ai = self.account.getInfo()
        status = ai.regStatus
        reason = ai.regStatusText
        
        if status >= 400:
            error = RuntimeError(f"Registration failed: {status} - {reason}")
            if self.registration_future and not self.registration_future.done():
                self.loop.call_soon_threadsafe(
                    self.registration_future.set_exception, error
                )
            else:
                # Log errors even if no future waiting
                self.logger.error(f"Registration failed but no future to notify: {error}")
    except Exception as e:
        self.logger.error(f"Error in onRegState callback: {e}", exc_info=True)

# Same pattern for onCallState()
```

---

## Additional Improvements (Optional)

### Warning: Import Confusion
**Issue**: Tests import deleted `gophone_helper` but file doesn't exist
**File**: All test files (test_66-71)

**Current**:
```python
from gophone_helper import GoPhoneConfig, GoPhoneEndpoint, GoPhoneManager
```

**Problem**: `gophone_helper.py` was deleted, but imports still reference it

**Investigation Needed**: 
- Is file still in working directory? (`ls -la tests/pycalltests/gophone_helper.py`)
- Git shows `D` but Python still imports - how?

**Fix**: Update all test imports to:
```python
from pjsua_helper import PJSUAConfig, PJSUAEndpoint, PJSUAManager
# Or use backward compat aliases if migration in progress
```

---

## Testing Plan

1. **Unit Test**: Verify cleanup methods work
2. **Integration Test**: Run single test, verify no leaks
3. **Stress Test**: Run full suite 100 times, monitor resources
4. **Regression Test**: Ensure existing tests still pass

**Verification Commands**:
```bash
# Check for resource leaks
pytest tests/pycalltests/test_66_ivr_navigation.py --count=100 -v

# Monitor resources during test
watch -n 1 'ps aux | grep pytest; lsof -p $(pgrep -f pytest) | wc -l'

# Verify cleanup with pytest-asyncio
pytest tests/pycalltests/ -v --log-cli-level=DEBUG
```

## References

- Parent task: `h-implement-pjsua-python-swig.md`
- Code review findings in parent task Work Log
- PJSIP lifecycle: https://docs.pjsip.org/en/latest/api/pjsua_lib.html#endpoint-management

## Notes

- Core PJSUA2 functionality works correctly (verified with container tests)
- These fixes are about proper resource cleanup, not core functionality
- Issues will manifest primarily in CI/CD environments running large test suites
- Local development with single tests may not notice the leaks
