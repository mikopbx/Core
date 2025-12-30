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
