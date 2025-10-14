# Database Locking Issue - Root Cause & Solution

## Root Cause Analysis

### Problem Chain:
```
1. DatabaseProviderBase.php:68
   → $connection->setNestedTransactionsWithSavepoints(true);

2. BaseActionHelper.php:executeInTransaction()
   → $db->begin(); // Starts transaction

3. SaveRecordAction.php:95
   → self::executeInTransaction(function() use ($manager) {
       $manager->save(); // ← Phalcon model save

4. Inside $manager->save():
   → beforeSave() hook executes
   → Queries to check constraints/foreign keys
   → afterSave() hook executes (may trigger config regeneration)
   → All these create ACTIVE SQL statements

5. If another nested operation tries to begin():
   → Phalcon tries to create SAVEPOINT
   → SQLite error: "cannot open savepoint - SQL statements in progress"
```

### Why It Happens:

**SQLite Limitation**: Cannot create savepoints while other statements are active
- When `$manager->save()` executes, it runs multiple queries
- beforeSave/afterSave hooks add more queries
- Foreign key checks add queries
- All these keep statements "in progress"
- Nested `begin()` tries to create savepoint → **FAILS**

### Visual Flow:

```
Transaction Level 0 (None)
    ↓
executeInTransaction() calls $db->begin()
    ↓
Transaction Level 1 (Active Transaction)
    ↓
$manager->save() executes
    ├─ beforeSave() hook: SELECT for validation (statement active)
    ├─ INSERT/UPDATE main record (statement active)
    ├─ Foreign key check: SELECT from NetworkFilters (statement active)
    └─ afterSave() hook: Queue config regeneration (statement active)
    ↓
If nested save() tries $db->begin() → Creates SAVEPOINT
    ↓
SQLite: ❌ ERROR "cannot open savepoint - SQL statements in progress"
```

---

## Why Some Resources Work and Others Fail

### ✅ Resources That Work:
- **Employees** - Simple structure, minimal hooks
- **Conference Rooms** - No complex relationships
- **Call Queues** - Batch operations complete before next starts
- **Dialplan Applications** - No config regeneration during save

### ❌ Resources That Fail:
- **Providers (SIP/IAX)** - Complex afterSave hooks trigger config regeneration
- **Asterisk Managers** - Foreign key to NetworkFilters + permission processing
- **API Keys** - Complex permission validation in beforeSave
- **Routes** - Foreign keys to Providers + Extensions + multiple lookups
- **Firewall** - System-wide config regeneration

---

## The Fix: Three Options

### Option 1: Disable Nested Transactions with Savepoints ⭐ RECOMMENDED

**File**: `src/Common/Providers/DatabaseProviderBase.php`

**Change Line 68**:
```php
// Before
$connection->setNestedTransactionsWithSavepoints(true);

// After
$connection->setNestedTransactionsWithSavepoints(false);
```

**Pros**:
- Simple one-line fix
- No code changes needed elsewhere
- Transactions still work, just not nested
- SQLite is happy

**Cons**:
- Nested transactions will silently be ignored
- Need to ensure no code relies on nested behavior

---

### Option 2: Smart Transaction Check

**File**: `src/PBXCoreREST/Lib/Common/BaseActionHelper.php`

**Replace `executeInTransaction` method**:
```php
public static function executeInTransaction(callable $callback)
{
    $di = Di::getDefault();
    $db = $di->get(MainDatabaseProvider::SERVICE_NAME);

    // Check if we're already in a transaction
    $alreadyInTransaction = $db->isUnderTransaction();

    // Only begin if not already in transaction
    if (!$alreadyInTransaction) {
        $db->begin();
    }

    try {
        $result = $callback();

        // Only commit if we started the transaction
        if (!$alreadyInTransaction) {
            $db->commit();
        }

        return $result;
    } catch (\Exception $e) {
        // Only rollback if we started the transaction
        if (!$alreadyInTransaction) {
            $db->rollback();
        }
        throw $e;
    }
}
```

**Pros**:
- Prevents nested transaction attempts
- Safe - only outer transaction commits/rollbacks
- No other code changes needed

**Cons**:
- More complex logic
- Need to test edge cases

---

### Option 3: Move Config Regeneration Outside Transaction

**File**: Various SaveRecordAction files

**Pattern**:
```php
// Before
public static function main(array $data): PBXApiResult
{
    $res = self::createApiResult(__METHOD__);

    $savedModel = self::executeInTransaction(function() use ($data) {
        $model->save();
        $this->regenerateConfig(); // ← Inside transaction
        return $model;
    });

    return $res;
}

// After
public static function main(array $data): PBXApiResult
{
    $res = self::createApiResult(__METHOD__);

    $savedModel = self::executeInTransaction(function() use ($data) {
        $model->save();
        return $model;
    });

    // Config regeneration AFTER transaction
    if ($savedModel) {
        $this->queueConfigRegeneration($savedModel); // ← Queue for async
    }

    return $res;
}
```

**Pros**:
- Cleaner separation of concerns
- Faster API responses
- Better for async operations

**Cons**:
- Need to refactor many files
- Requires queue system setup
- More complex change

---

## Recommended Solution: Option 1 + Option 2

### Step 1: Disable Nested Savepoints
```php
// src/Common/Providers/DatabaseProviderBase.php:68
$connection->setNestedTransactionsWithSavepoints(false);
```

### Step 2: Add Smart Transaction Check
```php
// src/PBXCoreREST/Lib/Common/BaseActionHelper.php
public static function executeInTransaction(callable $callback)
{
    $di = Di::getDefault();
    $db = $di->get(MainDatabaseProvider::SERVICE_NAME);

    $alreadyInTransaction = $db->isUnderTransaction();

    if (!$alreadyInTransaction) {
        $db->begin();
    }

    try {
        $result = $callback();
        if (!$alreadyInTransaction) {
            $db->commit();
        }
        return $result;
    } catch (\Exception $e) {
        if (!$alreadyInTransaction) {
            $db->rollback();
        }
        throw $e;
    }
}
```

---

## Testing Plan

### Phase 1: Apply Fix
```bash
# Edit DatabaseProviderBase.php
vi src/Common/Providers/DatabaseProviderBase.php
# Change line 68 to: $connection->setNestedTransactionsWithSavepoints(false);

# Edit BaseActionHelper.php
vi src/PBXCoreREST/Lib/Common/BaseActionHelper.php
# Update executeInTransaction method

# Restart container
docker restart mikopbx_container_id
```

### Phase 2: Test Failed Operations
```bash
# Test Asterisk Managers
pytest test_17_asterisk_managers.py::TestAsteriskManagers::test_02_create_manager_basic -v -s
# Expected: ✅ PASS

# Test API Keys
pytest test_18_api_keys.py::TestApiKeys::test_04_create_api_key_basic -v -s
# Expected: ✅ PASS

# Test IAX Providers
pytest test_09_providers.py::TestIAXProviders::test_03_create_no_registration_iax_provider -v -s
# Expected: ✅ PASS

# Test Incoming Routes
pytest test_11_incoming_routes.py::TestIncomingRoutes::test_04_create_provider_route -v -s
# Expected: ✅ PASS

# Test Off-Work Times
pytest test_13_off_work_times.py::TestOffWorkTimes::test_03_create_weekend_period -v -s
# Expected: ✅ PASS
```

### Phase 3: Full Test Suite
```bash
# Run all tests
./run_all_tests.sh all

# Expected results:
# Before fix: 367 passed, 78 failed (78.6% pass rate)
# After fix:  445+ passed, <25 failed (95%+ pass rate)
```

### Phase 4: Regression Check
```bash
# Ensure working tests still work
pytest test_01_employee_create.py -v
pytest test_02_employee_batch_create.py -v
pytest test_04_conference_rooms.py -v
pytest test_05_dialplan_applications.py -v

# All should still pass ✅
```

---

## Verification Commands

### Check Current Setting:
```php
// In PHP console or test script
$di = \Phalcon\Di\Di::getDefault();
$db = $di->get('db');
$reflection = new ReflectionClass($db);
$property = $reflection->getProperty('_transactionsWithSavepoints');
$property->setAccessible(true);
echo $property->getValue($db) ? 'ENABLED' : 'DISABLED';
```

### Monitor Transactions:
```bash
# Enable DB debug mode in config
# Then watch logs
tail -f /var/log/mikopbx/database.log | grep -E "BEGIN|COMMIT|SAVEPOINT"
```

---

## Impact Analysis

### Before Fix:
- **Failed Tests**: 78 (16.7%)
- **Database Errors**: ~20 tests with savepoint errors
- **Affected Resources**: 7 resource types
- **User Impact**: Cannot create/update critical resources

### After Fix:
- **Expected Pass Rate**: 95%+ (445+ tests)
- **Remaining Failures**: ~20 (mostly connection issues from system restart)
- **Database Errors**: 0
- **User Impact**: All CRUD operations work

---

## Rollback Plan

If fix causes issues:

```bash
# Revert DatabaseProviderBase.php
git checkout src/Common/Providers/DatabaseProviderBase.php

# Revert BaseActionHelper.php
git checkout src/PBXCoreREST/Lib/Common/BaseActionHelper.php

# Restart container
docker restart mikopbx_container_id
```

---

## Additional Recommendations

### 1. Add Transaction Depth Logging
```php
// In BaseActionHelper::executeInTransaction()
$depth = 0;
if ($db->isUnderTransaction()) {
    $depth++;
}
error_log("Transaction depth: $depth");
```

### 2. Monitor SQLite PRAGMA Settings
```bash
# Check current settings
sqlite3 /cf/conf/mikopbx.db "PRAGMA journal_mode; PRAGMA busy_timeout;"
# Should show: WAL, 5000
```

### 3. Consider Moving to PostgreSQL (Long Term)
- PostgreSQL handles nested transactions better
- Better concurrency for multi-user scenarios
- More robust for production environments

---

## Related Documentation

- **Issue Report**: `DATABASE_LOCKING_ANALYSIS.md`
- **Test Failures**: `TEST_FAILURES_REPORT.md`
- **Actionable Items**: `ACTIONABLE_ISSUES.md`

---

## Conclusion

The database locking issue is caused by:
1. Enabled nested transactions with savepoints
2. SQLite's limitation with active statements
3. Model hooks creating additional queries during save

**Solution**: Disable savepoints + smart transaction checking

**Expected Result**: 95%+ test pass rate, all write operations working

**Time to Fix**: 10 minutes (code change + restart)
**Time to Test**: 5 minutes (run failed tests)
**Time to Verify**: 10 minutes (full test suite)

**Total**: ~25 minutes to complete fix and verification

---

**Created**: 2025-10-14
**Status**: Ready to implement
**Priority**: 🔴 CRITICAL
**Estimated Impact**: Fixes 20+ test failures (~5% improvement in pass rate)
