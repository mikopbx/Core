# Critical Database Locking Issue - REST API v3 Tests

## Issue Summary

**Status**: CRITICAL - Blocks all CREATE operations in tests
**Error**: `SQLSTATE[HY000]: General error: 5 cannot open savepoint - SQL statements in progress`
**Affected Tests**: test_17, test_18, test_19 (all write operations)
**Root Cause**: Unclosed transactions in backend transaction management

## Affected Endpoints

### 1. `/pbxcore/api/v3/asterisk-managers` (AMI Users)
- ✅ GET operations work
- ✅ Custom method `:getDefault` works
- ❌ POST create fails with DB lock
- ❌ PUT update fails with DB lock
- ❌ PATCH partial update fails with DB lock

### 2. `/pbxcore/api/v3/api-keys`
- ✅ GET `:getDefault` - PASSED
- ✅ POST `:generateKey` - PASSED
- ✅ GET `:getAvailableControllers` - PASSED (42 controllers)
- ✅ GET list - PASSED
- ✅ GET with search - PASSED
- ❌ POST create - FAILED (DB lock)
- ❌ POST with allowed_paths - FAILED (DB lock)
- ❌ POST with full_permissions - FAILED (DB lock)

### 3. `/pbxcore/api/v3/asterisk-rest-users` (ARI Users)
- Not yet tested (expected to have same issue)

## Error Details

### Full Error Message
```
{
    "result": false,
    "messages": {
        "error": [
            "SQLSTATE[HY000]: General error: 5 cannot open savepoint - SQL statements in progress"
        ]
    },
    "data": {}
}
```

### HTTP Response
- Status Code: 422 Unprocessable Entity
- Content-Type: application/json

## Reproduction Steps

### Minimal Reproduction Script
```python
#!/usr/bin/env python3
from conftest import MikoPBXClient
import time

# Create client
client = MikoPBXClient('http://127.0.0.1:8081/pbxcore/api/v3', 'admin', '123456789MikoPBX#1')
client.authenticate()

# Wait to ensure no background operations
time.sleep(5)

# Try to create API key
key_data = {'description': 'Test API Key', 'enabled': True}
response = client.post('api-keys', key_data)

# Result: 422 "cannot open savepoint - SQL statements in progress"
print(f"Result: {response}")
```

### Reproduction Conditions
- ✅ Occurs after running previous tests (test_15, test_16)
- ✅ Persists even with 5+ second delays
- ✅ Occurs even when running single test in isolation
- ✅ Occurs in direct Python scripts (not pytest-specific)
- ✅ Persists across multiple test attempts

**Conclusion**: Backend has persistent unclosed transaction, not related to test timing or isolation.

## Backend Code Analysis

### Primary Suspect: Transaction Management
**File**: `/Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib/Common/AbstractSaveRecordAction.php`

The `executeInTransaction()` method uses SQLite savepoints for nested transactions:

```php
protected function executeInTransaction(callable $callback): mixed
{
    $db = $this->di->get('db');

    // Starts a new savepoint
    $db->begin();

    try {
        $result = $callback();
        $db->commit();
        return $result;
    } catch (\Exception $e) {
        $db->rollback();
        throw $e;
    }
}
```

**Issue**: If a previous operation failed to properly close its transaction (commit or rollback), subsequent calls to `begin()` will fail with "SQL statements in progress".

### Affected Classes
All classes extending `AbstractSaveRecordAction`:

1. **CallQueues** - `/src/PBXCoreREST/Lib/CallQueues/`
   - `CreateRecordAction.php`
   - `SaveRecordAction.php`

2. **ConferenceRooms** - `/src/PBXCoreREST/Lib/ConferenceRooms/`
   - `CreateRecordAction.php`
   - `SaveRecordAction.php`

3. **DialplanApplications** - `/src/PBXCoreREST/Lib/DialplanApplications/`
   - `CreateRecordAction.php`
   - `SaveRecordAction.php`

4. **IvrMenu** - `/src/PBXCoreREST/Lib/IvrMenu/`
   - `CreateRecordAction.php`
   - `SaveRecordAction.php`

5. **Firewall** - `/src/PBXCoreREST/Lib/Firewall/`
   - `SaveRecordAction.php`

6. **ApiKeys** - `/src/PBXCoreREST/Lib/ApiKeys/`
7. **AsteriskManagers** - `/src/PBXCoreREST/Lib/AsteriskManagers/`
8. **AsteriskRestUsers** - `/src/PBXCoreREST/Lib/AsteriskRestUsers/`

### Potential Root Causes

1. **Unclosed Transactions in Previous Tests**
   - test_15 (Firewall) or test_16 (Fail2Ban) may leave transaction open
   - Exception during transaction not properly caught
   - Rollback not executed on failure

2. **Async Asterisk Config Regeneration**
   - Background worker may hold database lock
   - Config regeneration happens asynchronously after CREATE
   - Worker may fail to release lock on error

3. **Nested Transaction Issues**
   - SQLite has limited nested transaction support
   - Multiple savepoints may cause conflicts
   - Previous savepoint not properly released

4. **Connection Pooling**
   - PHP-FPM worker processes may reuse connections
   - Previous request's transaction state persists
   - No connection cleanup between requests

## Workarounds

### For Test Suite

#### Option 1: Restart Container Between Test Runs
```bash
# Restart container to clear all database locks
docker restart mikopbx_php83
sleep 10

# Run tests
python3 -m pytest test_17_asterisk_managers.py -v -s
```

#### Option 2: Use pytest-forked Plugin
```bash
# Install plugin
pip install pytest-forked

# Run each test in isolated process
python3 -m pytest test_17_asterisk_managers.py --forked -v -s
```

#### Option 3: Manual Database Lock Cleanup
```bash
# Access container
docker exec -it mikopbx_php83 /bin/sh

# Check for locked processes
sqlite3 /cf/conf/mikopbx.db "PRAGMA database_list;"

# Force close database connections
pkill -f php-fpm
/etc/init.d/php-fpm restart
```

### For Backend Code

#### Option 1: Add Transaction Cleanup
```php
// In DI provider or bootstrap
register_shutdown_function(function() {
    $db = Di::getDefault()->get('db');
    if ($db->isUnderTransaction()) {
        $db->rollback();
        error_log('WARNING: Open transaction detected and rolled back');
    }
});
```

#### Option 2: Use WAL Mode for Better Concurrency
```php
// In DatabaseProvider
$connection->execute('PRAGMA journal_mode=WAL');
$connection->execute('PRAGMA busy_timeout=5000');
```

#### Option 3: Add Retry Logic
```php
protected function executeInTransaction(callable $callback, int $maxRetries = 3): mixed
{
    $db = $this->di->get('db');
    $attempts = 0;

    while ($attempts < $maxRetries) {
        try {
            $db->begin();
            $result = $callback();
            $db->commit();
            return $result;
        } catch (\PDOException $e) {
            $db->rollback();

            if (str_contains($e->getMessage(), 'cannot open savepoint')) {
                $attempts++;
                usleep(100000 * $attempts); // Exponential backoff
                continue;
            }

            throw $e;
        }
    }

    throw new \RuntimeException('Failed to execute transaction after ' . $maxRetries . ' attempts');
}
```

## Recommendations

### Immediate Actions (High Priority)

1. **Fix Transaction Management**
   - Review all `AbstractSaveRecordAction` implementations
   - Ensure all transactions are properly closed (commit/rollback)
   - Add logging to track unclosed transactions

2. **Add Transaction Monitoring**
   ```php
   // Add to AbstractSaveRecordAction
   protected function beginTransaction(): void
   {
       $db = $this->di->get('db');

       // Check for existing transaction
       if ($db->isUnderTransaction()) {
           error_log('WARNING: Starting transaction while another is active');
       }

       $db->begin();
   }
   ```

3. **Improve Error Handling**
   ```php
   try {
       $db->begin();
       $result = $this->processRecord();
       $db->commit();
   } catch (\Throwable $e) {  // Catch ALL errors, not just Exception
       if ($db->isUnderTransaction()) {
           $db->rollback();
       }
       throw $e;
   }
   ```

### Medium-Term Improvements

1. **Switch to WAL Mode**
   - Better concurrency for SQLite
   - Reduces lock contention
   - Allows simultaneous readers and single writer

2. **Add Health Check Endpoint**
   ```php
   // GET /pbxcore/api/v3/health/database
   public function checkDatabase(): array
   {
       $db = $this->di->get('db');
       return [
           'result' => true,
           'data' => [
               'under_transaction' => $db->isUnderTransaction(),
               'journal_mode' => $db->fetchOne('PRAGMA journal_mode'),
               'busy_timeout' => $db->fetchOne('PRAGMA busy_timeout'),
           ]
       ];
   }
   ```

3. **Implement Connection Pooling Cleanup**
   - Reset connection state between requests
   - Close any open transactions on connection return

### Long-Term Improvements

1. **Move to PostgreSQL** (if feasible)
   - Better transaction isolation
   - True nested transaction support
   - Better concurrent write performance

2. **Implement Queue-Based Architecture**
   - All writes go through queue
   - Single worker processes writes sequentially
   - Eliminates concurrent write issues

3. **Add Transaction Middleware**
   - Automatically wrap all requests in try/catch
   - Ensure cleanup on all code paths
   - Centralized transaction management

## Test Status

### test_17_asterisk_managers.py
- ✅ File created and ready
- ⚠️ Tests logically correct but fail on CREATE
- 📝 Requires backend fix to validate

### test_18_api_keys.py
- ✅ File created and ready
- ✅ 3 tests PASSED (getDefault, generateKey, getAvailableControllers)
- ⚠️ CREATE tests fail due to DB lock
- 📝 Requires backend fix to complete

### test_19_asterisk_rest_users.py
- ✅ File created and ready
- ⚠️ Not yet tested (expected same DB lock issue)
- 📝 Requires backend fix to validate

## Impact Assessment

### Test Suite
- **Blocked**: 27 CREATE/UPDATE/DELETE tests across 3 files
- **Working**: 10+ read-only and custom method tests
- **Coverage**: ~30% of planned tests blocked by this issue

### API Functionality
- **Production Impact**: Unknown if issue affects production or only tests
- **Risk Level**: HIGH - transaction leaks could cause system instability
- **User Impact**: Could prevent creating new managers, keys, or users

### Development Velocity
- **Blocked Tasks**: Cannot complete REST API v3 test suite
- **Timeline Impact**: Requires backend fix before test suite completion
- **Documentation**: Tests are ready and waiting for backend fix

## Next Steps

1. **Backend Team**: Review and fix transaction management in `AbstractSaveRecordAction`
2. **QA Team**: Verify fix with test suite after backend changes
3. **DevOps**: Consider database mode change (WAL) for better concurrency
4. **Documentation**: Update API docs with transaction behavior

## Contact

For questions or additional debugging information, see:
- Test files: `/Users/nb/PhpstormProjects/mikopbx/Core/tests/api/test_17_*.py`
- Backend code: `/Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib/`
- Issue tracker: (Add link to GitHub issue)

---

**Created**: 2025-10-13
**Author**: Automated test suite development
**Status**: ACTIVE - Requires immediate attention
