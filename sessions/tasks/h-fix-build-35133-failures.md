---
name: h-fix-build-35133-failures
status: in-progress
created: 2025-12-30
build: "35133"
version: "2025.1.119-dev"
---

# Fix TeamCity Build #35133 Failures

## Summary

8 тестов упало в сборке RestAPI tests #35133 (2025.1.119-dev).
850 passed, 8 failed, 7 ignored.

---

## Failed Tests

| # | Test | Error | Type | Priority |
|---|------|-------|------|----------|
| 1 | `test_09_custom_files.test_01_create_or_update_pjsip_append_file` | mode='none' после PATCH | 🔴 System | P2 |
| 2 | `test_31_ivr_menu_initial.test_03_create_second_ivr_menu` | 409 extension exists | 🟡 Test | P3 |
| 3 | `test_43_cdr.test_08_filter_by_src_num` | wrong src_num | 🟡 Test | P3 |
| 4 | `test_43_cdr_delete.test_05_delete_by_linkedid` | need >1 records | 🟡 Test | P4 |
| 5 | `test_config_01_all_provider_types.test_03_create_sip_outbound_tls` | db locked | 🔴 System | P1 |
| 6 | `test_config_01_all_provider_types.test_06_create_sip_inbound_tls` | db locked | 🔴 System | P1 |
| 7 | `test_config_01_all_provider_types.test_09_create_iax_inbound` | db locked | 🔴 System | P1 |
| 8 | `test_custom_files_sequential_patch.test_rapid_sequential_patches` | 404 after create | 🟡 Test | P3 |

---

## Task 1: Custom Files Mode Not Updating

**Status:** 🔍 Investigating
**File:** `test_09_custom_files.py:489`
**Error:** `mode='none'` после PATCH с `mode='append'`

### Business Rule

- `mode='custom'` — immutable (user-created files)
- `mode='none'/'append'/'override'/'script'` — can be changed freely

### Code Analysis

**SaveRecordAction.php** (`src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php`):

Lines 229-240 (mode update):
```php
} elseif (isset($sanitizedData['mode'])) {
    if ($record->mode === CustomFiles::MODE_CUSTOM) {
        $record->mode = CustomFiles::MODE_CUSTOM;
    } else {
        $record->mode = $sanitizedData['mode']; // Should set 'append'
    }
}
```

**SUSPECT** - Lines 249-252:
```php
if (empty($record->getContent()) && $record->mode !== CustomFiles::MODE_CUSTOM) {
    $record->mode = CustomFiles::MODE_NONE;  // Resets mode!
}
```

### Hypothesis

Mode is set to 'append' in lines 229-240, but then reset to 'none' in lines 249-252 if `getContent()` returns empty.

### Investigation Steps

- [ ] Add logging to trace values at each step
- [ ] Verify `$record->content` is set before `getContent()` called
- [ ] Check base64 encoding flow
- [ ] Reproduce locally

---

## Task 2: IVR Menu Duplicate Extension

**Status:** 📋 Pending
**File:** `test_31_ivr_menu_initial.py:80`
**Error:** `409 Conflict: Extension number already exists`

### Problem

Hardcoded `extension: '2001'` conflicts with existing data.

### Fix

Use unique extension:
```python
extension = f"200{random.randint(10, 99)}"
```

---

## Task 3: CDR Filter Wrong Result

**Status:** 📋 Pending
**File:** `test_43_cdr.py:220`
**Error:** Filter `src_num=201` returned `79001234567`

### Analysis Needed

- Clarify filter semantics on grouped data
- Update test or fix API

---

## Task 4: CDR Delete Needs Multiple Records

**Status:** 📋 Pending
**File:** `test_43_cdr_delete.py:230`
**Error:** `assert linked_count_before > 1` failed

### Fix

Use `pytest.skip()` if data unavailable.

---

## Tasks 5-7: Database Locked (3 tests)

**Status:** 📋 Pending
**Error:** `SQLSTATE[HY000]: General error: 5 database is locked`

### Root Cause

SQLite concurrent write operations during rapid API calls.

### Fix Options

**System:**
1. Enable WAL mode: `PRAGMA journal_mode=WAL`
2. Increase busy_timeout: `PRAGMA busy_timeout=30000`

**Tests:**
1. Add delays between requests
2. Add retry logic on 422 with db lock

---

## Task 8: Custom Files 404 After Create

**Status:** 📋 Pending
**File:** `test_custom_files_sequential_patch.py:264`
**Error:** `404 Not Found` immediately after file creation

### Root Cause

Race condition: Worker hasn't persisted file when PATCH arrives.

### Fix

Add delay or retry after create:
```python
file_id = create_file(api_client)
time.sleep(2)  # or polling loop
```

---

## Work Log

### 2025-12-30

- Analyzed TeamCity build #35133
- Identified 8 failing tests
- Created detailed root cause analysis
- **Current focus:** Task 1 (custom_files mode bug)

---

## Context Manifest

### How Custom Files API Currently Works

When a user creates or updates a custom file via the REST API (`POST /pbxcore/api/v3/custom-files` or `PATCH /pbxcore/api/v3/custom-files/{id}`), the request flows through a well-defined 7-phase pipeline in `SaveRecordAction.php`.

**Phase 1 - Sanitization** (lines 72-91): The incoming data is sanitized using rules from `DataStructure::getSanitizationRules()`. The sanitization rules are derived from `getParameterDefinitions()` which defines: filepath (string, max 500), content (string), mode (enum: override/append/script/none/custom), description (text, max 500). The record ID is preserved from the original data to support UPDATE operations.

**Phase 2 - Determine Operation** (lines 94-123): The system determines if this is a CREATE or UPDATE operation by checking if an ID was provided and if a record exists with that ID. For `PUT`/`PATCH` requests with a non-existent ID, the action returns 404 "not found" error. For `POST` with a custom ID, it allows the operation (for migrations).

**Phase 3 - Required Fields Validation** (lines 125-164): For CREATE operations, `filepath` is required (content is optional, can be empty for MODE_NONE). For UPDATE/PATCH operations, only provided fields are validated.

**Phase 4 - Apply Defaults** (lines 166-174): **ONLY for CREATE operations**, defaults are applied via `DataStructure::applyDefaults()`. The default mode is 'none', default description is empty string, default changed is '1'.

**Phase 5 - Schema Validation** (lines 176-195): Validates against schema constraints (minLength, maxLength, enum values) and business rules (filepath uniqueness).

**Phase 6 - Save Transaction** (lines 197-265): This is where the **bug exists**. The save logic handles:

1. **Filepath update** (lines 205-207): Updates filepath if provided via `isset()` check for PATCH support.

2. **Content handling** (lines 209-219): Content is base64 encoded before storage. If content is not base64 encoded, it's encoded via `setContent()`. For CREATE without content, empty string is set.

3. **Mode handling** (lines 221-240):
   - For CREATE: Uses mode from request (or default applied in Phase 4)
   - For UPDATE: Protects MODE_CUSTOM files (user-created) from mode changes
   - For UPDATE on non-custom files: Allows free mode switching (none/append/override/script)

4. **THE BUG - Mode Reset Logic** (lines 249-252):
   ```php
   if (empty($record->getContent()) && $record->mode !== CustomFiles::MODE_CUSTOM) {
       $record->mode = CustomFiles::MODE_NONE;  // Resets mode!
   }
   ```
   This code **resets mode to 'none' if content is empty**, regardless of what mode was set in lines 221-240. This breaks the PATCH scenario where mode='append' is sent without content - the mode gets reset to 'none'.

5. **Changed flag** (line 255): Always sets `changed = '1'` to trigger worker processing.

**Phase 7 - Response** (lines 281-301): Returns the saved record via `DataStructure::createFromModel()` with HTTP 201 for CREATE, 200 for UPDATE.

### The Mode Reset Bug - Root Cause Analysis

The test `test_01_create_or_update_pjsip_append_file` in `test_09_custom_files.py` fails because:

1. Test finds existing custom file for `/etc/asterisk/pjsip.conf` (line 519-528)
2. Test sends PATCH request with `mode='append'` and `content=<base64_encoded>` (line 540-543)
3. SaveRecordAction processes the request:
   - Line 238: `$record->mode = $sanitizedData['mode'];` sets mode to 'append' correctly
   - Line 210-216: Content is set correctly via base64 handling
4. **BUT** line 249-252 then runs:
   - `$record->getContent()` decodes the base64 content
   - If the decoded content is empty string (which `base64_decode('')` returns as empty), the condition `empty($record->getContent())` is TRUE
   - Mode is reset to 'none'

The issue is that `getContent()` in `CustomFiles.php` (line 128-131) returns `base64_decode((string)$this->content)`. If content was just set via `setContent('')` or if content is empty, `getContent()` returns empty string, triggering the mode reset.

**The condition at lines 249-252 should check `$record->content` (raw base64) instead of `$record->getContent()` (decoded), OR should be moved BEFORE the mode is set, OR should not exist at all if the business logic allows append mode with empty content.**

### Test File Analysis

**test_09_custom_files.py** - `TestCustomFilesAppendMode` class:
- `test_01_create_or_update_pjsip_append_file` (line 490): Creates/updates custom file with mode='append'
- Sends PATCH with encoded content and mode='append'
- Verification at line 569 checks `data['mode'] == 'append'` - **this fails because mode was reset to 'none'**

### Task 2: IVR Menu Duplicate Extension

**test_31_ivr_menu_initial.py** - Line 81-97:
```python
ivr_data = {
    'name': fixture['name'],
    'extension': '2001',  # HARDCODED - causes conflict
    ...
}
```

The test uses hardcoded extension `'2001'` which may already exist from previous test runs or system data. The fixture file `i_v_r_menu.json` uses different extensions (`30021` and `20020`), but the test overrides with `'2001'`.

**Fix**: Use unique extension or use fixture extension:
```python
extension = f"200{random.randint(10, 99)}"
# or
'extension': fixture['extension'],  # Uses 30021 from fixture
```

### Task 3: CDR Filter Returns Wrong Result

**test_43_cdr.py** - `test_08_filter_by_src_num` (line 221-248):
- Test filters by `src_num='201'`
- API returns grouped CDR data (new format with linkedid + records[])
- The assertion checks if `'201'` is in `str(group['src_num'])`
- **Problem**: CDR grouping may have different src_num at group level vs individual records

The test expects `src_num` filter to return groups where the **group-level** `src_num` contains '201', but the API may return groups that have '201' in **any** record within the group.

**Fix**: Either update test expectation to check individual records, or document that filter works on record level but returns groups.

### Task 4: CDR Delete Needs Multiple Records

**test_43_cdr_delete.py** - `test_05_delete_by_linkedid` (line 231-282):
```python
assert linked_count_before > 1, "Need multiple records for this test"
```

The test requires a linkedid with multiple associated CDR records to test batch deletion. On fresh systems or after system reset, there may not be enough CDR data.

**Fix**: Use `pytest.skip()` when precondition not met:
```python
if linked_count_before <= 1:
    pytest.skip("Need linkedid with multiple records for this test")
```

### Tasks 5-7: Database Locked (SQLite Concurrency)

**test_config_01_all_provider_types.py** - Tests 03, 06, 09 fail with:
```
SQLSTATE[HY000]: General error: 5 database is locked
```

The test creates 10 providers rapidly (SIP OUTBOUND/INBOUND/PEER x UDP/TCP/TLS + IAX variants). Each provider creation triggers:
1. Database INSERT to m_Providers
2. Database INSERT to m_Sip or m_Iax
3. Potentially INSERTs to m_OutgoingRoutingTable
4. Beanstalkd message for config regeneration

SQLite uses file-level locking. When multiple write transactions overlap, SQLite returns "database is locked" error.

**Fix Options**:

*System-level (preferred):*
1. Enable WAL mode: `PRAGMA journal_mode=WAL;`
2. Increase busy_timeout: `PRAGMA busy_timeout=30000;`

*Test-level:*
1. Add `time.sleep(1)` between provider creations
2. Add retry logic in test when 422 with db lock is returned:
```python
def create_with_retry(api_client, endpoint, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = api_client.post(endpoint, data)
            return response
        except Exception as e:
            if 'database is locked' in str(e) and attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise
```

### Task 8: Custom Files 404 After Create

**test_custom_files_sequential_patch.py** - `test_rapid_sequential_patches` (line 228-298):
- Creates custom file via `_get_or_create_manager_conf_file()`
- Immediately sends PATCH requests
- **Problem**: 404 "Not Found" after create

**Root Cause**: The file creation is asynchronous:
1. `POST /custom-files` returns immediately with `id`
2. Worker processes the file asynchronously (5-15 seconds)
3. Test sends PATCH before worker persists the file

However, the CustomFiles record should be in the database immediately after POST returns (database save is synchronous). The 404 may indicate:
- Test is using wrong ID format
- API endpoint routing issue
- Worker hasn't processed `changed` flag yet

**Fix**: Add delay or polling after create:
```python
file_id = create_file(api_client)
time.sleep(2)  # Wait for worker
# or
for _ in range(10):
    response = api_client.get(f'custom-files/{file_id}')
    if response.get('result'):
        break
    time.sleep(1)
```

### Technical Reference Details

#### CustomFiles Model (`src/Common/Models/CustomFiles.php`)

```php
// Mode constants
const MODE_NONE = 'none';      // Do nothing
const MODE_APPEND = 'append';  // Append to file
const MODE_OVERRIDE = 'override'; // Replace file
const MODE_SCRIPT = 'script';  // Execute as script
const MODE_CUSTOM = 'custom';  // User-created (immutable mode)

// Base64 encoding methods
public function getContent(): string {
    return base64_decode((string)$this->content);
}

public function setContent(string $text): void {
    $this->content = base64_encode($text);
}
```

#### SaveRecordAction Bug Location

**File**: `src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php`
**Lines**: 249-252

```php
// THE BUG: This resets mode after it was already set correctly
if (empty($record->getContent()) && $record->mode !== CustomFiles::MODE_CUSTOM) {
    $record->mode = CustomFiles::MODE_NONE;
}
```

**Proposed Fix**:
```php
// Option 1: Check raw content instead of decoded
if (empty($record->content) && $record->mode !== CustomFiles::MODE_CUSTOM) {
    $record->mode = CustomFiles::MODE_NONE;
}

// Option 2: Remove this logic entirely (allow append/override with empty content)
// Business decision needed

// Option 3: Move this check BEFORE mode assignment (if business logic requires it)
```

#### Test File Locations

| Test | File Path |
|------|-----------|
| Custom Files Mode | `/tests/api/test_09_custom_files.py:489` |
| IVR Menu Extension | `/tests/api/test_31_ivr_menu_initial.py:81` |
| CDR Filter | `/tests/api/test_43_cdr.py:221` |
| CDR Delete | `/tests/api/test_43_cdr_delete.py:231` |
| Provider DB Lock | `/tests/api/test_config_01_all_provider_types.py:82,155,223` |
| Sequential PATCH | `/tests/api/test_custom_files_sequential_patch.py:228` |

#### API Client Pattern (`tests/api/conftest.py`)

The `MikoPBXClient` class provides:
- JWT authentication with auto-refresh
- Retry logic for transient failures (429, 502, 503, 504)
- Connection retry with exponential backoff
- `allow_404=True` parameter for PUT/PATCH to handle non-existent resources

```python
# Example usage in tests
response = api_client.patch(f'custom-files/{file_id}', data)
assert_api_success(response, "Failed to patch custom file")
```

#### DataStructure Field Definitions

**Mode enum values**: `['override', 'append', 'script', 'none', 'custom']`
**Default mode**: `'none'`
**Default changed**: `'1'`

### File Locations Summary

| Component | Path |
|-----------|------|
| SaveRecordAction | `src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php` |
| DataStructure | `src/PBXCoreREST/Lib/CustomFiles/DataStructure.php` |
| CustomFiles Model | `src/Common/Models/CustomFiles.php` |
| Test: Custom Files | `tests/api/test_09_custom_files.py` |
| Test: IVR Menu | `tests/api/test_31_ivr_menu_initial.py` |
| Test: CDR | `tests/api/test_43_cdr.py` |
| Test: CDR Delete | `tests/api/test_43_cdr_delete.py` |
| Test: Providers | `tests/api/test_config_01_all_provider_types.py` |
| Test: Sequential PATCH | `tests/api/test_custom_files_sequential_patch.py` |
| IVR Fixtures | `tests/api/fixtures/i_v_r_menu.json` |
| API Client | `tests/api/conftest.py` |
