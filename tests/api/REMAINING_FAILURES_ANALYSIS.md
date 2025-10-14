# Remaining 56 Test Failures - Detailed Analysis

## Overview

After fixing the database locking issue, 56 tests remain failing. This document provides detailed analysis of each failure category with actual API responses and proposed fixes.

---

## Category 1: API Response Structure Mismatches (27 tests - 48%)

### Problem: Tests Expect Wrong Data Structure

#### 1.1 Advice Endpoint (12 tests)

**Files Affected**: `test_20_advice.py`

**Current API Response**:
```json
{
  "result": true,
  "data": {
    "advice": {
      "warning": [...],
      "critical": [...],
      "info": [...]
    }
  }
}
```

**Test Expectation** (WRONG):
```python
data = response['data']
assert isinstance(data, list)  # ❌ Expects list
```

**Correct Expectation**:
```python
data = response['data']
assert isinstance(data, dict)  # ✅ Should expect dict
assert 'advice' in data
assert isinstance(data['advice'], dict)
```

**Tests to Fix**:
- test_01_get_advice_list_default
- test_02_filter_by_category_security
- test_03_filter_by_category_configuration
- test_04_filter_by_category_performance
- test_05_filter_by_severity_critical
- test_06_filter_by_severity_warning
- test_07_filter_by_severity_info
- test_08_combined_filters
- test_09_refresh_advice_normal
- test_10_refresh_advice_force
- test_11_refresh_advice_post
- TestAdviceEdgeCases::test_05_empty_advice_list

**Fix Priority**: High - 12 tests affected

---

#### 1.2 Auth Endpoint (7 tests)

**Files Affected**: `test_21_auth.py`

**Issue 1**: Test tries to access `api_client.username` and `api_client.password` which don't exist

**Current Code** (WRONG):
```python
def test_01_login_with_password(self, api_client):
    login_data = {
        'login': api_client.username,  # ❌ AttributeError
        'password': api_client.password,
        'rememberMe': False
    }
```

**Fix**: Use constants from conftest.py
```python
def test_01_login_with_password(self, api_client):
    from conftest import API_USERNAME, API_PASSWORD
    login_data = {
        'login': API_USERNAME,
        'password': API_PASSWORD,
        'rememberMe': False
    }
```

**Issue 2**: Test expects cookies but JWT auth doesn't use cookies for access token

**Current API Response**:
```json
{
  "result": true,
  "data": {
    "accessToken": "eyJ0eXAiOiJKV1Q...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "login": "admin"
  }
}
```

**Cookie**: Only `refreshToken` is sent as httpOnly cookie (not accessToken)

**Tests to Fix**:
- test_01_login_with_password
- test_02_login_remember_me
- test_08_login_again
- TestAuthEdgeCases::test_05_refresh_without_cookie
- TestAuthEdgeCases::test_06_logout_without_token
- TestAuthEdgeCases::test_09_multiple_concurrent_logins

**Additional Issue**: Test tries to access `api_client.cookies` which doesn't exist
```python
# WRONG
assert 'refreshToken' in api_client.cookies

# CORRECT - need to access session.cookies
assert 'refreshToken' in api_client.session.cookies
```

**Fix Priority**: High - 7 tests affected

---

#### 1.3 Extensions Endpoint (4 tests)

**Files Affected**: `test_23_extensions.py`

**Issue**: Tests expect list structure but API returns different format

**Tests to Fix**:
- test_01_get_default_template
- test_04_filter_by_type_sip
- test_07_get_extension_by_number
- TestExtensionsEdgeCases::test_05_limit_exceeds_maximum

**Fix Priority**: Medium - 4 tests affected

---

#### 1.4 Other Endpoints (4 tests)

**Files Affected**:
- `test_25_mail_settings.py` (2 tests)
- `test_48_network_filters.py` (2 tests)

**Tests to Fix**:
- test_25_mail_settings.py::test_01_get_default_template
- test_25_mail_settings.py::test_03_get_diagnostics
- test_48_network_filters.py::test_01_get_default_template
- test_48_network_filters.py::test_02_get_list (KeyError in response)

**Fix Priority**: Medium - 4 tests affected

---

## Category 2: Test Data Dependencies (15 tests - 27%)

### Problem: Tests Expect Data That May Not Exist

#### 2.1 Connection Errors During Container Restart (10+ tests)

**Error**: `503 Server Error: Service Temporarily Unavailable`

**Affected Tests**:
- test_28_employees.py (4 tests)
- test_29_sip_providers.py::test_03_get_by_id
- test_38_users.py (2 tests)
- test_39_modules.py::test_01_get_list
- test_43_license.py::test_01_get_license_info
- test_44_sysinfo.py::test_01_get_system_info
- test_45_system.py::test_01_get_system_status
- test_46_sip.py::test_01_get_sip_peers
- test_employees_quick.py::test_create_employee

**Root Cause**: Tests ran while container was restarting

**Fix**: Add retry logic or wait for container stabilization

**Fix Priority**: Low - Transient issue

---

#### 2.2 Missing Test Data (5 tests)

**Error**: `IndexError: list index out of range`

**Examples**:
```python
# test_snapshot_mechanism.py
employee = response.json()['data']['data'][0]  # ❌ No employees with number 202
```

**Affected Tests**:
- test_snapshot_mechanism.py::test_snapshot_with_partial_update
- test_03_employee_crud.py::test_employee_delete_cascade
- test_22_cdr.py::TestCDREdgeCases::test_01_get_nonexistent_cdr

**Fix**:
1. Add test data setup fixtures
2. Make tests resilient to missing data
3. Use dynamic test data generation

**Fix Priority**: Medium - 5 tests affected

---

## Category 3: Validation Errors (9 tests - 16%)

### Problem: Business Logic Validation Rejecting Test Data

#### 3.1 API Keys Validation (3 tests)

**Files Affected**: `test_18_api_keys.py`

**Error**: `422 Unprocessable Entity: "API key is required for new records"`

**Current Test Data**:
```python
key_data = {
    'description': 'Test API Key',
    'enabled': True,
    'full_permissions': False
}
```

**Missing Field**: `api_key` field is required for creation

**Actual Requirement**: API Keys endpoint expects the key value to be provided on creation

**Tests to Fix**:
- test_04_create_api_key_basic
- test_05_create_api_key_with_paths
- test_06_create_api_key_full_permissions

**Fix Options**:
1. Update tests to provide `api_key` field
2. Review backend validation - should API generate key automatically?

**Fix Priority**: High - May indicate API design issue

---

#### 3.2 Asterisk Managers Validation (3 tests)

**Files Affected**: `test_17_asterisk_managers.py`

**Error**: `422 Unprocessable Entity` with various validation errors

**Tests to Fix**:
- test_02_create_manager_basic (intermittent)
- test_03_create_manager_full_permissions
- TestAsteriskManagersEdgeCases::test_02_validate_username_uniqueness

**Issue**: Validation rules not fully understood or test data invalid

**Fix Priority**: Medium - 3 tests affected

---

#### 3.3 ARI Users Validation (3 tests)

**Files Affected**: `test_19_asterisk_rest_users.py`

**Error**: `422 Unprocessable Entity`

**Tests to Fix**:
- test_02_create_ari_user_basic
- test_03_create_ari_user_minimal
- test_04_get_users_list
- test_05_get_users_with_search
- TestAsteriskRestUsersEdgeCases::test_02_validate_username_uniqueness

**Fix Priority**: Medium - 5 tests affected (includes 2 from data dependencies)

---

## Category 4: Test Implementation Bugs (5 tests - 9%)

### Problem: Test Code Bugs

#### 4.1 Fail2Ban Settings Test

**File**: `test_16_fail2ban.py`

**Test**: `test_03_patch_settings_partial`

**Error**:
```python
assert response.json()['result'] is True
AssertionError: assert False is True
```

**Issue**: PATCH operation fails but test doesn't check why

**Fix**: Add error handling and check messages

**Fix Priority**: Low - 1 test

---

#### 4.2 CDR Active Calls Test

**File**: `test_22_cdr.py`

**Test**: `test_12_get_active_calls`

**Error**: `AttributeError: 'str' object has no attribute 'json'`

**Issue**: Test tries to call `.json()` on string instead of response object

**Fix**: Correct test implementation

**Fix Priority**: Low - 1 test

---

#### 4.3 Provider Status Test

**File**: `test_09_providers.py`

**Test**: `TestIAXProvidersCustomMethods::test_02_get_statuses_collection`

**Error**: Response structure mismatch

**Fix**: Update test expectations

**Fix Priority**: Low - 1 test

---

#### 4.4 Employee Cascade Delete Test

**File**: `test_03_employee_crud.py`

**Test**: `test_employee_delete_cascade`

**Error**: `422 Unprocessable Entity`

**Issue**: Employee being deleted has constraints (SIP account, etc.)

**Fix**: Properly clean up related records before deletion

**Fix Priority**: Low - 1 test

---

## Summary by Fix Priority

### 🔴 High Priority (22 tests)

1. **Advice Endpoint** (12 tests) - Response structure mismatch
   - Fix: Update all test expectations from list to dict
   - Estimated time: 30 minutes

2. **Auth Endpoint** (7 tests) - AttributeError and cookie handling
   - Fix: Update to use correct attributes and session.cookies
   - Estimated time: 45 minutes

3. **API Keys Validation** (3 tests) - Missing required field
   - Fix: Add api_key field or review backend logic
   - Estimated time: 30 minutes

**Total High Priority**: 22 tests, ~2 hours

---

### 🟡 Medium Priority (17 tests)

1. **Extensions Endpoint** (4 tests) - Structure mismatch
   - Estimated time: 30 minutes

2. **Network Filters/Mail Settings** (4 tests) - Structure mismatch
   - Estimated time: 30 minutes

3. **Missing Test Data** (5 tests) - Add fixtures
   - Estimated time: 1 hour

4. **Asterisk Managers Validation** (3 tests) - Review validation
   - Estimated time: 45 minutes

5. **ARI Users** (3 tests) - Validation issues
   - Estimated time: 45 minutes (partial, 2 tests are in data dependencies)

**Total Medium Priority**: 17 tests, ~3.5 hours

---

### 🟢 Low Priority (17 tests)

1. **Connection Errors** (10+ tests) - Transient failures
   - Fix: Add retry logic or wait
   - Estimated time: 30 minutes

2. **Test Implementation Bugs** (5 tests) - Code fixes
   - Estimated time: 45 minutes

**Total Low Priority**: 17 tests, ~1.25 hours

---

## Recommended Fix Order

### Phase 1: High Priority (Day 1)
1. ✅ Fix advice endpoint tests (12 tests)
2. ✅ Fix auth endpoint tests (7 tests)
3. ✅ Fix API keys validation (3 tests)

**Expected Result**: 22 additional tests passing (389 → 411, 92.5% pass rate)

---

### Phase 2: Medium Priority (Day 2)
1. Fix extensions endpoint tests (4 tests)
2. Fix network filters/mail settings tests (4 tests)
3. Add test data fixtures (5 tests)
4. Review validation logic (6 tests)

**Expected Result**: 17 additional tests passing (411 → 428, 96.2% pass rate)

---

### Phase 3: Low Priority (Day 3)
1. Add retry logic for transient failures (10 tests)
2. Fix test implementation bugs (5 tests)

**Expected Result**: 15 additional tests passing (428 → 443, 99.6% pass rate)

---

## Final Expected Results

```
Current:  389 passed, 56 failed (87.4%)
Phase 1:  411 passed, 34 failed (92.5%)
Phase 2:  428 passed, 17 failed (96.2%)
Phase 3:  443 passed, 2 failed  (99.6%)
```

---

**Created**: 2025-10-14
**Status**: Ready to implement
**Estimated Total Time**: 6-7 hours
**Expected Final Pass Rate**: 99.6%+
