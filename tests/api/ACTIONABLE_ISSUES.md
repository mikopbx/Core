# MikoPBX REST API v3 - Actionable Issues for Developers

**Priority**: 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

---

## 🔴 CRITICAL - Must Fix Before Production

### Issue #1: Database Locking on Write Operations
**Priority**: 🔴 CRITICAL
**Affected**: ~20% of all write operations
**Error**: `SQLSTATE[HY000]: General error: 5 cannot open savepoint`

**Location**: Transaction management in model save operations

**Reproduction**:
```bash
# Any write operation fails after multiple requests
pytest test_09_providers.py::TestSIPProviders::test_05_update_sip_provider -v
```

**Expected Behavior**: Write operations should complete successfully

**Actual Behavior**: SQLite savepoint error

**Root Cause**: Nested transaction handling in Phalcon models

**Fix Required**:
- Review transaction usage in `src/Common/Models/*`
- Check DatabaseProviderBase transaction management
- Ensure savepoints are properly closed
- Add transaction isolation

**Files to Check**:
- `src/Common/Providers/DatabaseProviderBase.php`
- `src/Common/Models/ModelsBase.php`
- All Action classes in `src/PBXCoreREST/Lib/*/CreateRecordAction.php`
- All Action classes in `src/PBXCoreREST/Lib/*/UpdateRecordAction.php`

**Tests Affected**: 20+ tests across multiple files

**Reference**: See `README_DATABASE_LOCKING.md` for full details

---

### Issue #2: System Instability After restoreDefault
**Priority**: 🔴 CRITICAL
**Symptom**: API becomes unresponsive after system:restoreDefault

**Reproduction**:
```bash
# Run system reset
python3 test_real_system_delete.py --confirm

# Immediate API calls fail
curl http://127.0.0.1:8081/pbxcore/api/v3/extensions
# Connection refused or long timeout
```

**Expected**: System restarts cleanly and becomes available within 2-3 minutes

**Actual**: System may take 5-10 minutes or require manual restart

**Fix Required**:
1. Add proper health check endpoint that reflects true system state
2. Improve restart sequencing after restoreDefault
3. Add WebSocket progress updates during reset
4. Ensure all services restart in correct order

**Files to Check**:
- System restore implementation
- Service restart logic
- Health check endpoint

---

## 🟡 HIGH PRIORITY - Fix This Sprint

### Issue #3: Authentication Endpoint Session Handling
**Priority**: 🟡 HIGH
**Affected**: test_21_auth.py (6 failures)
**Error**: `AttributeError: 'MikoPBXAPIClient' object has no attribute 'cookies'`

**Reproduction**:
```python
# test_21_auth.py::TestAuth::test_01_login_with_password
response = api_client.post('auth:login', {'login': 'admin', 'password': '...'})
# Fails with AttributeError
```

**Root Cause**: Test expects `api_client.cookies` but client class doesn't expose cookies

**Fix Required**:
- Update conftest.py MikoPBXAPIClient to expose session.cookies
- Or update tests to use different approach for cookie validation

**Files to Fix**:
- `tests/api/conftest.py` - Add cookie exposure
- `test_21_auth.py` - Update cookie access

---

### Issue #4: Advice Endpoint Returns Empty Results
**Priority**: 🟡 HIGH
**Affected**: test_20_advice.py (11 failures)
**Error**: `AssertionError: Advice list should not be empty`

**Reproduction**:
```bash
pytest test_20_advice.py::TestAdvice::test_01_get_advice_list_default -v
```

**Expected**: Returns list of system recommendations

**Actual**: Returns empty array `[]`

**Possible Causes**:
1. Advice generation hasn't run on fresh system
2. Advice requires initial configuration
3. Endpoint implementation incomplete

**Fix Required**:
1. Check if advice generation is triggered
2. Add default advice templates
3. Or update tests to handle empty state gracefully

**Files to Check**:
- Advice generation logic
- `src/PBXCoreREST/Lib/Advice/*`
- Background workers that generate advice

---

### Issue #5: Extensions Endpoint Response Structure
**Priority**: 🟡 HIGH
**Affected**: test_23_extensions.py (4 failures)
**Error**: `AssertionError` on response structure

**Reproduction**:
```bash
pytest test_23_extensions.py::TestExtensions::test_01_get_default_template -v
```

**Expected**: Returns extensions default template in specific format

**Actual**: Different response structure

**Fix Required**:
- Verify actual response format from extensions endpoint
- Update test expectations to match
- Or fix endpoint to match OpenAPI spec

**Files to Check**:
- `test_23_extensions.py` - Update assertions
- `src/PBXCoreREST/Lib/Extensions/DataStructure.php` - Verify schema

---

## 🟢 MEDIUM PRIORITY - Fix Next Sprint

### Issue #6: CDR Endpoint Type Handling
**Priority**: 🟢 MEDIUM
**Affected**: test_22_cdr.py (2 failures)
**Error**: `AttributeError: 'str' object has no attribute 'get'`

**Reproduction**:
```bash
pytest test_22_cdr.py::TestCDR::test_12_get_active_calls -v
```

**Root Cause**: Response sometimes returns string instead of dict

**Fix Required**:
- Add type checking in test before accessing dict methods
- Or ensure endpoint always returns dict

---

### Issue #7: Mail Settings Diagnostics
**Priority**: 🟢 MEDIUM
**Affected**: test_25_mail_settings.py (2 failures)

**Reproduction**:
```bash
pytest test_25_mail_settings.py::TestMailSettings::test_03_get_diagnostics -v
```

**Expected**: Returns mail diagnostics

**Actual**: Different structure or missing data

**Fix Required**: Update test expectations or fix endpoint

---

### Issue #8: Network Filters Endpoint Implementation
**Priority**: 🟢 MEDIUM
**Affected**: test_48_network_filters.py (2 failures)
**Error**: `KeyError` accessing response data

**Reproduction**:
```bash
pytest test_48_network_filters.py::TestNetworkFilters::test_02_get_list -v
```

**Fix Required**:
- Verify network-filters endpoint implementation
- Check DataStructure class
- Update test expectations

---

### Issue #9: Provider List Endpoint After System Reset
**Priority**: 🟢 MEDIUM
**Affected**: test_29_sip_providers.py
**Error**: Connection errors

**Root Cause**: Likely related to system restart issue

**Fix Required**: Part of Issue #2 fix

---

## 🔵 LOW PRIORITY - Edge Cases & Validation

### Issue #10: IVR Menu Edge Cases
**Priority**: 🔵 LOW
**Affected**: test_07_ivr_menu.py (2 failures)

**Tests**:
- Delete nonexistent record should return 404
- Duplicate extension should return 409

**Fix Required**: Add proper validation and error responses

---

### Issue #11: Outbound Route Digit Manipulation Validation
**Priority**: 🔵 LOW
**Affected**: test_12_outbound_routes.py::test_04_validate_digit_manipulation

**Fix Required**: Implement validation for digit manipulation patterns

---

### Issue #12: Extensions Limit Validation
**Priority**: 🔵 LOW
**Affected**: test_23_extensions.py::test_05_limit_exceeds_maximum

**Fix Required**: Add validation for pagination limit parameter

---

### Issue #13: Multiple Concurrent Login Sessions
**Priority**: 🔵 LOW
**Affected**: test_21_auth.py::test_09_multiple_concurrent_logins

**Fix Required**: Verify behavior when same user logs in multiple times

---

## Quick Wins (Easy Fixes)

### QW #1: Test Warning - Return None
**Files**: test_05_dialplan_applications.py, test_06_call_queues.py
**Issue**: Test functions return values instead of None
**Fix**: Remove return statements from test functions

```python
# Before
def test_create_single_call_queue(api_client):
    queue_id = create_queue(...)
    return queue_id  # ❌ Remove this

# After
def test_create_single_call_queue(api_client):
    queue_id = create_queue(...)
    # No return statement ✅
```

---

### QW #2: Update Test Fixtures
**File**: conftest.py
**Issue**: MikoPBXAPIClient needs cookie access
**Fix**: Add property to expose cookies

```python
class MikoPBXAPIClient:
    def __init__(self):
        self.session = requests.Session()

    @property
    def cookies(self):
        return self.session.cookies
```

---

## Testing Checklist After Fixes

### After Database Locking Fix:
- [ ] Run: `pytest test_09_providers.py -v`
- [ ] Run: `pytest test_17_asterisk_managers.py -v`
- [ ] Run: `pytest test_18_api_keys.py -v`
- [ ] Run: `pytest test_19_asterisk_rest_users.py -v`
- [ ] Expected: All write operations pass

### After System Stability Fix:
- [ ] Run: `python3 test_real_system_delete.py --confirm`
- [ ] Wait 2 minutes
- [ ] Run: `pytest test_21_auth.py -v`
- [ ] Run: `pytest test_28_employees.py -v`
- [ ] Expected: All tests pass after restart

### After Response Structure Updates:
- [ ] Run: `pytest test_20_advice.py -v`
- [ ] Run: `pytest test_23_extensions.py -v`
- [ ] Run: `pytest test_25_mail_settings.py -v`
- [ ] Expected: All assertions pass

---

## Metrics Tracking

### Current State (2025-10-14):
- Total Tests: 467
- Passing: 367 (78.6%)
- Failing: 78 (16.7%)
- Skipped: 22 (4.7%)

### Target After Critical Fixes:
- Total Tests: 467
- Passing: 445+ (95%+)
- Failing: <10 (2%)
- Skipped: 22 (4.7%)

### Target After All Fixes:
- Total Tests: 467
- Passing: 455+ (97%+)
- Failing: <5 (1%)
- Skipped: 22 (4.7%)

---

## Support & Resources

**Documentation**:
- Full Test Report: `TEST_FAILURES_REPORT.md`
- Database Issue: `README_DATABASE_LOCKING.md`
- Quick Start: `QUICKSTART.md`
- Statistics: `STATISTICS.md`

**Run Specific Test Category**:
```bash
# Working tests only (guaranteed to pass)
./run_all_tests.sh working

# High priority tests (core features)
./run_all_tests.sh high

# Single test file
pytest test_09_providers.py -v -s

# Single test method
pytest test_09_providers.py::TestSIPProviders::test_05_update_sip_provider -v -s
```

**Debug Single Test**:
```bash
pytest test_name.py::TestClass::test_method -v -s --pdb
```

---

**Created**: 2025-10-14
**Last Updated**: 2025-10-14
**Status**: Active Development
