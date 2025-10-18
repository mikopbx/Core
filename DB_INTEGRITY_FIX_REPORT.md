# Database Integrity Fix Report

## Problem

API endpoint `GET /pbxcore/api/v3/providers` returned error:
```
Error: Call to a member function getRepresent() on null
in RecordRepresentationTrait.php:302
```

## Root Cause

Invalid foreign key references in demo databases (`mikopbx.db` and `mikopbx-ru.db`) caused by inconsistent `uniqid` values.

### Identified Issues

**1. Provider Record (m_Providers)**
- `uniqid`: `SIP-PROVIDER-34F7`
- `sipuid`: `SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43` ❌ (incorrect)

**2. SIP Configuration (m_Sip)**
- Correct record exists with `uniqid`: `SIP-PROVIDER-34F7`
- No record with `uniqid`: `SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43`

**3. Cascade Effect**
- `m_IncomingRoutingTable`: record #12 referenced broken provider ID
- `m_OutgoingRoutingTable`: record #21 referenced broken provider ID

## Solution Applied

### 1. Demo Database Fixes

**Both databases** (`mikopbx.db` and `mikopbx-ru.db`):

```sql
-- Fix Provider reference
UPDATE m_Providers
SET sipuid='SIP-PROVIDER-34F7'
WHERE uniqid='SIP-PROVIDER-34F7' AND type='SIP';

-- Fix IncomingRoutingTable reference
UPDATE m_IncomingRoutingTable
SET provider='SIP-PROVIDER-34F7'
WHERE provider='SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43';

-- Fix OutgoingRoutingTable reference
UPDATE m_OutgoingRoutingTable
SET providerid='SIP-PROVIDER-34F7'
WHERE providerid='SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43';
```

### 2. Code Protection (RecordRepresentationTrait.php)

Added nullsafe operator to prevent crashes from invalid data:

```php
case Providers::class:
    if ($this->type === "IAX") {
        $name = $this->Iax?->getRepresent() ?? 'IAX Provider (not configured)';
    } else {
        $name = $this->Sip?->getRepresent() ?? 'SIP Provider (not configured)';
    }
    break;
```

## Verification

### Comprehensive Integrity Checks ✅

**English DB (mikopbx.db):**
- SIP Providers: 1 record, 0 broken
- IAX Providers: 0 records
- IncomingRoutingTable: 1 record, 0 broken
- OutgoingRoutingTable: 1 record, 0 broken
- Extensions-Users: 6 records, 0 broken
- Extensions-Sip: 3 records, 0 broken

**Russian DB (mikopbx-ru.db):**
- SIP Providers: 1 record, 0 broken
- IAX Providers: 0 records
- IncomingRoutingTable: 1 record, 0 broken
- OutgoingRoutingTable: 1 record, 0 broken
- Extensions-Users: 6 records, 0 broken
- Extensions-Sip: 3 records, 0 broken

### API Test ✅

```bash
curl http://172.16.32.72:8081/pbxcore/api/v3/providers \
  -H "Authorization: Bearer miko_ak_29FCA6656D9DBB95"
```

**Response:** 200 OK with valid provider list

## Impact

- **Users affected:** All installations using demo databases
- **Severity:** High (API endpoint completely broken)
- **Data loss:** None (only metadata corrected)
- **Breaking changes:** None

## Prevention

1. Added nullsafe operator protection in `RecordRepresentationTrait.php`
2. Recommended: Add database integrity constraints to prevent orphaned records
3. Recommended: Add unit tests for foreign key relationships
