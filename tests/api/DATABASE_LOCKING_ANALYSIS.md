# Database Locking Issue - Detailed Analysis

**Issue**: SQLite database locking errors blocking write operations
**Impact**: ~20% of write operations fail
**Status**: 🔴 CRITICAL - Requires backend fix

---

## Error Types Found

### Type 1: "database is locked"
```
SQLSTATE[HY000]: General error: 5 database is locked
```
**Meaning**: Another transaction holds a lock on the database

### Type 2: "cannot open savepoint"
```
SQLSTATE[HY000]: General error: 5 cannot open savepoint - SQL statements in progress
```
**Meaning**: Nested transaction attempting to create savepoint while other statements active

---

## Affected Tests - Complete List

### 1. IAX Providers (test_09_providers.py)
**Test**: `test_03_create_no_registration_iax_provider`
**Operation**: POST /iax-providers
**Error**: `database is locked`

```python
# Reproduction
pytest test_09_providers.py::TestIAXProviders::test_03_create_no_registration_iax_provider -v -s
```

**API Call**:
```bash
curl -X POST http://127.0.0.1:8081/pbxcore/api/v3/iax-providers \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "Test IAX Provider",
    "host": "iax.example.com",
    "disabled": "0"
  }'
# Returns: 422 Unprocessable Entity
# Error: database is locked
```

---

### 2. SIP Providers (test_09_providers.py)
**Multiple Tests Affected**:
- `test_03_get_sip_providers_list` (indirectly - after previous failures)
- `test_05_update_sip_provider` (UPDATE operation)
- `test_07_delete_sip_providers` (DELETE operation)

**Operations**: GET (list), PUT, DELETE /sip-providers
**Error**: `database is locked`

```python
# Reproduction
pytest test_09_providers.py::TestSIPProviders::test_05_update_sip_provider -v -s
```

**Pattern**: Once database locks, subsequent operations on same resource fail

---

### 3. Incoming Routes (test_11_incoming_routes.py)
**Test**: `test_04_create_provider_route`
**Operation**: POST /incoming-routes
**Error**: `database is locked`

```python
# Reproduction
pytest test_11_incoming_routes.py::TestIncomingRoutes::test_04_create_provider_route -v -s
```

**Data Structure**:
```json
{
  "rulename": "Provider Route Test",
  "number": "74952293042",
  "provider": "SIP-PROVIDER-1234567890AB",
  "extension": "201",
  "timeout": 120
}
```

---

### 4. Outbound Routes (test_12_outbound_routes.py)
**Tests**:
- `test_03_create_international_route` (CREATE)
- `test_04_validate_digit_manipulation` (CREATE with validation)

**Operation**: POST /outbound-routes
**Error**: `database is locked`

```python
# Reproduction
pytest test_12_outbound_routes.py::TestOutboundRoutes::test_03_create_international_route -v -s
```

---

### 5. Off-Work Times (test_13_off_work_times.py)
**Test**: `test_03_create_weekend_period`
**Operation**: POST /off-work-times
**Error**: `database is locked`

```python
# Reproduction
pytest test_13_off_work_times.py::TestOffWorkTimes::test_03_create_weekend_period -v -s
```

**Data Structure**:
```json
{
  "date_from": "2025-01-01",
  "date_to": "2025-01-02",
  "weekday_from": 6,
  "weekday_to": 0,
  "time_from": "00:00",
  "time_to": "23:59",
  "action": "extension",
  "extension": "201",
  "audio_message_id": ""
}
```

---

### 6. Firewall (test_15_firewall.py)
**Test**: `test_12_disable_firewall`
**Operation**: POST /firewall:disable (custom method)
**Error**: `database is locked`

```python
# Reproduction
pytest test_15_firewall.py::TestFirewall::test_12_disable_firewall -v -s
```

**Special**: This is a custom method that updates firewall state

---

### 7. Asterisk Managers (test_17_asterisk_managers.py)
**Test**: `test_02_create_manager_basic`
**Operation**: POST /asterisk-managers
**Error**: `cannot open savepoint - SQL statements in progress`

```python
# Reproduction
pytest test_17_asterisk_managers.py::TestAsteriskManagers::test_02_create_manager_basic -v -s
```

**Data Structure**:
```json
{
  "username": "test_manager",
  "secret": "SecurePassword123!",
  "call": "1",
  "cdr": "1",
  "dialplan": "0",
  "originate": "1"
}
```

**Important**: This shows the **savepoint variant** of the error!

---

### 8. API Keys (test_18_api_keys.py)
**Tests**:
- `test_04_create_api_key_basic` (CREATE)
- `test_05_create_api_key_with_paths` (CREATE with permissions)
- `test_06_create_api_key_full_permissions` (CREATE with full access)

**Operation**: POST /api-keys
**Error**: `cannot open savepoint - SQL statements in progress`

```python
# Reproduction
pytest test_18_api_keys.py::TestApiKeys::test_04_create_api_key_basic -v -s
```

**Pattern**: All API key creation fails with savepoint error

---

### 9. Asterisk REST Users (test_19_asterisk_rest_users.py)
**Test**: `test_03_create_ari_user_minimal`
**Operation**: POST /asterisk-rest-users
**Error**: `database is locked`

```python
# Reproduction
pytest test_19_asterisk_rest_users.py::TestAsteriskRestUsers::test_03_create_ari_user_minimal -v -s
```

**Additional Failures** (cascading):
- `test_04_get_users_list` - No users created, list empty
- `test_05_get_users_with_search` - No users to search
- `test_06_get_user_by_id` - No user to retrieve
- `test_07_update_user` - No user to update
- `test_08_patch_user` - No user to patch

---

## Pattern Analysis

### When Does It Occur?

1. **After Multiple Sequential Writes**:
   - Employees batch create (26 records) → Success ✅
   - Conference rooms batch (9 records) → Success ✅
   - Dialplan apps batch (10 records) → Success ✅
   - Call queues batch (10 records) → Success ✅
   - **IAX Provider create** → ❌ LOCKED

2. **Specific Resource Types**:
   - Providers (SIP/IAX) ❌
   - Routes (Incoming/Outgoing) ❌
   - Off-work times ❌
   - Firewall settings ❌
   - Asterisk managers ❌
   - API Keys ❌
   - ARI Users ❌

3. **Resources That Work**:
   - Employees ✅
   - Conference Rooms ✅
   - Dialplan Applications ✅
   - Call Queues ✅
   - IVR Menus ✅
   - Custom Files ✅
   - Storage ✅
   - Time Settings ✅

---

## Technical Investigation

### Hypothesis 1: Transaction Nesting
**Theory**: Failed resources use nested transactions (savepoints), successful ones don't

**Check**:
```bash
# Compare implementation
grep -r "beginTransaction\|savepoint" src/PBXCoreREST/Lib/Providers/
grep -r "beginTransaction\|savepoint" src/PBXCoreREST/Lib/Employees/
```

---

### Hypothesis 2: Foreign Key Constraints
**Theory**: Failed resources have complex foreign key relationships causing locks

**Evidence**:
- Providers → Have relationships to Extensions, Routes
- Routes → Reference Providers, Extensions
- Asterisk Managers → Reference NetworkFilters
- API Keys → Reference Permissions

**Successful Resources**:
- Employees → Simple structure
- Call Queues → References exist but maybe handled differently

---

### Hypothesis 3: Model Save Hooks
**Theory**: Failed resources trigger additional DB operations in beforeSave/afterSave hooks

**Check**:
```php
// Compare model implementations
src/Common/Models/Providers.php - afterSave() hook
src/Common/Models/Extensions.php - afterSave() hook
src/Common/Models/AsteriskManagerUsers.php - afterSave() hook
```

---

### Hypothesis 4: Config Generation Triggers
**Theory**: Failed resources trigger Asterisk config regeneration which holds locks

**Evidence**:
```php
// After saving provider, system regenerates:
- sip.conf
- iax.conf
- extensions.conf
// These operations might hold DB lock
```

---

## Code Locations to Investigate

### 1. DatabaseProviderBase.php
**Location**: `src/Common/Providers/DatabaseProviderBase.php`

**Check**:
```php
// Transaction handling
public function register(): void {
    $this->di->setShared('db', function () {
        $connection = new Sqlite([...]);
        // Check transaction isolation level
        // Check if transactions are nested
        return $connection;
    });
}
```

---

### 2. Action Classes with Savepoint Errors

**Asterisk Managers**:
- `src/PBXCoreREST/Lib/AsteriskManagers/CreateRecordAction.php`
- Check if uses explicit transactions

**API Keys**:
- `src/PBXCoreREST/Lib/ApiKeys/CreateRecordAction.php`
- Check if uses explicit transactions

---

### 3. Model Save Operations

**Providers Model**:
```bash
cat src/Common/Models/Providers.php | grep -A20 "afterSave\|beforeSave"
```

**Check for**:
- Additional queries in hooks
- Nested transaction calls
- Foreign key operations

---

### 4. Config Regeneration Triggers

**PBXConfModulesProvider**:
- `src/Common/Providers/PBXConfModulesProvider.php`
- Check if config generation holds DB connection

---

## Reproduction Script

Create a minimal test to reproduce the issue:

```python
#!/usr/bin/env python3
"""
Minimal reproduction of database locking issue
"""
import requests

API_URL = "http://127.0.0.1:8081/pbxcore/api/v3"

# Login
response = requests.post(f"{API_URL}/auth:login", data={
    'login': 'admin',
    'password': '123456789MikoPBX#1'
})
token = response.json()['data']['accessToken']
headers = {'Authorization': f'Bearer {token}'}

# Create multiple employees (works)
print("Creating employees...")
for i in range(5):
    response = requests.post(f"{API_URL}/employees", headers=headers, json={
        'number': f'90{i}',
        'user_username': f'Test User {i}',
        'sip_secret': 'test123'
    })
    print(f"  Employee {i}: {response.status_code}")

# Try to create IAX provider (should fail with lock)
print("\nCreating IAX provider...")
response = requests.post(f"{API_URL}/iax-providers", headers=headers, json={
    'description': 'Test IAX Provider',
    'host': 'iax.example.com',
    'disabled': '0'
})
print(f"  IAX Provider: {response.status_code}")
if response.status_code != 201:
    print(f"  Error: {response.json().get('messages', {})}")
```

**Run**:
```bash
python3 test_db_lock_minimal.py
```

---

## Potential Fixes

### Fix #1: Disable Nested Transactions
**Location**: Model classes
**Change**: Use flat transactions instead of savepoints

```php
// Before
$this->getDI()->get('db')->begin(); // Might be nested
$model->save();
$this->getDI()->get('db')->commit();

// After
$db = $this->getDI()->get('db');
if (!$db->isUnderTransaction()) {
    $db->begin();
    $needCommit = true;
}
$model->save();
if ($needCommit ?? false) {
    $db->commit();
}
```

---

### Fix #2: Use WAL Mode for SQLite
**Location**: DatabaseProviderBase.php
**Change**: Enable Write-Ahead Logging

```php
public function register(): void {
    $this->di->setShared('db', function () {
        $connection = new Sqlite([...]);

        // Enable WAL mode for better concurrency
        $connection->execute('PRAGMA journal_mode=WAL');
        $connection->execute('PRAGMA busy_timeout=5000'); // 5 second timeout

        return $connection;
    });
}
```

---

### Fix #3: Defer Config Regeneration
**Change**: Don't regenerate config during API transaction

```php
// Instead of immediate regeneration
public function afterSave() {
    $this->regenerateConfig(); // Holds DB lock
}

// Queue for later
public function afterSave() {
    $this->getDI()->get('queue')->put('config-regeneration', [
        'model' => get_class($this),
        'id' => $this->id
    ]);
}
```

---

### Fix #4: Increase SQLite Busy Timeout
**Location**: DatabaseProviderBase.php

```php
$connection->execute('PRAGMA busy_timeout=30000'); // 30 seconds instead of default
```

---

## Testing After Fix

### Minimal Test
```bash
# Should all pass after fix
pytest test_09_providers.py::TestIAXProviders::test_03_create_no_registration_iax_provider -v
pytest test_17_asterisk_managers.py::TestAsteriskManagers::test_02_create_manager_basic -v
pytest test_18_api_keys.py::TestApiKeys::test_04_create_api_key_basic -v
```

### Full Test Suite
```bash
# All write operations should pass
./run_all_tests.sh all
# Expected: 445+ tests pass (95%+)
```

---

## Related Issues

- Issue mentioned in: `README_DATABASE_LOCKING.md`
- Affects: 20+ tests across 7 test files
- Discovered: During full test suite run (2025-10-14)

---

## Next Steps

1. **Investigate Code** (1-2 hours):
   - Check transaction usage in failed Action classes
   - Compare with successful Action classes
   - Check model afterSave/beforeSave hooks

2. **Test Fix** (30 min):
   - Implement WAL mode + busy timeout
   - Run minimal reproduction script
   - Verify fix doesn't break working tests

3. **Full Test** (10 min):
   - Run complete test suite
   - Verify all write operations pass
   - Check performance impact

4. **Deploy** (if successful):
   - Commit fix with test evidence
   - Update documentation
   - Close related issues

---

**Created**: 2025-10-14
**Priority**: 🔴 CRITICAL
**Assigned**: Backend Team
**Estimated Time**: 2-3 hours investigation + fix + testing
