# Database Verification Scenarios

Step-by-step scenarios for verifying database state after REST API operations.

## Overview

After performing REST API operations (create, update, delete), use these scenarios to verify that database records were modified correctly and maintain referential integrity.

---

## Scenario 1: Verify Extension Creation

**When to use**: After creating an extension via REST API

**What to verify**:
- Extension record exists in m_Extensions
- SIP account created in m_Sip (for SIP extensions)
- Foreign key relationship is correct
- User association is valid

**Step-by-step verification**:

### Step 1: Check Extension Record
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, userid FROM m_Extensions WHERE number='NEW_NUMBER'" \
  -header -column
```

**Expected result**:
- Record exists
- `type` is correct (SIP, EXTERNAL, etc.)
- `callerid` matches API request
- `userid` references valid user (if specified)

### Step 2: Check SIP Account Created
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, secret, transport FROM m_Sip WHERE extension='NEW_NUMBER'" \
  -header -column
```

**Expected result**:
- Record exists for SIP extensions
- `extension` matches extension number
- `secret` (password) is set
- `transport` is valid (udp/tcp/tls)

### Step 3: Verify Foreign Key Relationship
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.type, s.extension, s.secret
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.number='NEW_NUMBER'" \
  -header -column
```

**Expected result**:
- JOIN returns data (no NULL for SIP type)
- `e.number` = `s.extension`

### Step 4: Verify Complete Profile
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.type, e.callerid, u.username, u.email, s.secret
   FROM m_Extensions e
   LEFT JOIN m_Users u ON e.userid = u.id
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.number='NEW_NUMBER'" \
  -header -column
```

**Expected result**: All fields populated correctly

---

## Scenario 2: Verify Provider Configuration

**When to use**: After creating/updating a SIP or IAX provider via REST API

**What to verify**:
- Provider record exists in m_Providers
- SIP/IAX account record exists
- Routing rules reference correct provider
- Provider is not orphaned

**Step-by-step verification**:

### Step 1: Check Provider Record
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type, description, host, disabled FROM m_Providers
   WHERE uniqid='PROVIDER_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- `type` is SIP or IAX
- `host` is set
- `disabled` matches API request

### Step 2: Check Associated SIP/IAX Account
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE uniqid='PROVIDER_ID'" \
  -header -column
```

**Expected result**:
- Record exists for SIP providers
- Account credentials are set

### Step 3: Verify Routing Rules Exist
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider='PROVIDER_ID') as incoming,
     (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid='PROVIDER_ID') as outbound"
```

**Expected result**: Counts match expected number of routes

### Step 4: Check Provider Not Orphaned
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT p.description,
          (SELECT COUNT(*) FROM m_IncomingRoutingTable ir WHERE ir.provider = p.uniqid) as incoming,
          (SELECT COUNT(*) FROM m_OutgoingRoutingTable ort WHERE ort.providerid = p.uniqid) as outbound
   FROM m_Providers p
   WHERE p.uniqid='PROVIDER_ID'"
```

**Expected result**: Provider has at least one routing rule

---

## Scenario 3: Verify Call Queue Configuration

**When to use**: After creating/modifying a call queue via REST API

**What to verify**:
- Queue record exists in m_CallQueues
- Queue extension exists in m_Extensions
- Queue members exist in m_CallQueueMembers
- Member extensions are valid

**Step-by-step verification**:

### Step 1: Check Queue Settings
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, name, extension, strategy, seconds_to_ring_each_member
   FROM m_CallQueues WHERE uniqid='QUEUE_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- `strategy` is valid (ringall, leastrecent, random, rrmemory)
- `extension` is set

### Step 2: Check Queue Members
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.extension, cqm.priority, e.callerid
   FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cqm.queue='QUEUE_ID'
   ORDER BY cqm.priority" \
  -header -column
```

**Expected result**:
- All members have valid extensions (e.callerid NOT NULL)
- Priorities are unique and sequential
- Member count matches API request

### Step 3: Verify Extension Record Exists
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type FROM m_Extensions
   WHERE number=(SELECT extension FROM m_CallQueues WHERE uniqid='QUEUE_ID')"
```

**Expected result**:
- Extension exists
- `type` = 'QUEUE'

### Step 4: Check Complete Queue Configuration
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cq.name, cq.extension, cq.strategy,
          e.number as member_ext, e.callerid as member_name,
          cqm.priority
   FROM m_CallQueues cq
   LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cq.uniqid='QUEUE_ID'
   ORDER BY cqm.priority" \
  -header -column
```

**Expected result**: Complete configuration matches API request

---

## Scenario 4: Verify Routing Rules

**When to use**: After creating/updating incoming or outbound routing rules

**What to verify**:
- Routing rule exists
- Provider reference is valid
- Destination extension exists (for incoming routes)
- Priority is correct

**Step-by-step verification**:

### For Incoming Routes:

```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.provider, ir.extension, ir.action, ir.priority,
          p.description as provider_name
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Providers p ON ir.provider = p.uniqid
   WHERE ir.id='ROUTE_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- `provider` references valid provider (p.description NOT NULL)
- `extension` exists if action='extension'
- `priority` is correct
- `action` is valid enum value

### For Outbound Routes:

```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT or.numberbeginswith, or.restnumbers, or.trimfrombegin, or.prepend,
          or.priority, p.description as provider_name
   FROM m_OutgoingRoutingTable or
   LEFT JOIN m_Providers p ON or.providerid = p.uniqid
   WHERE or.id='ROUTE_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- `providerid` references valid provider
- Pattern fields (numberbeginswith, restnumbers) are correct
- Priority is correct

### Check Destination Extension (Incoming Only):

```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.extension, e.type, e.callerid
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.id='ROUTE_ID' AND ir.action='extension'"
```

**Expected result**: Extension exists (e.type NOT NULL)

---

## Scenario 5: Verify User and Extension Relationship

**When to use**: After creating user with extensions via REST API

**What to verify**:
- User record exists in m_Users
- Extensions exist and reference user
- Primary extension is marked correctly
- All extension types are valid

**Step-by-step verification**:

### Step 1: Check User Record
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, email, username, language FROM m_Users WHERE id='USER_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- Email is unique
- Username is set

### Step 2: Check User's Extensions
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, is_general_user_number
   FROM m_Extensions
   WHERE userid='USER_ID'" \
  -header -column
```

**Expected result**:
- All extensions exist
- Exactly ONE extension has `is_general_user_number='1'`
- Extension count matches API request

### Step 3: Full User Profile with Extensions
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT u.username, u.email, e.number, e.type, e.callerid
   FROM m_Users u
   LEFT JOIN m_Extensions e ON u.id = e.userid
   WHERE u.id='USER_ID'" \
  -header -column
```

**Expected result**: Complete profile matches API request

### Step 4: Verify No Orphaned Extensions
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number
   FROM m_Extensions e
   LEFT JOIN m_Users u ON e.userid = u.id
   WHERE e.userid='USER_ID' AND u.id IS NULL"
```

**Expected result**: No results (empty)

---

## Scenario 6: Check Data Consistency

**When to use**: After any batch operations or before release testing

**What to verify**:
- No orphaned records
- Foreign key integrity
- Referential integrity

**Step-by-step verification**:

### Step 1: Find Orphaned SIP Accounts
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL"
```

**Expected result**: No results (empty)

### Step 2: Find SIP Extensions Without Accounts
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL"
```

**Expected result**: No results (empty)

### Step 3: Find Routing Rules with Invalid Destinations
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.extension FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.action='extension' AND e.number IS NULL"
```

**Expected result**: No results (empty)

### Step 4: Find Queue Members with Invalid Extensions
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.queue, cqm.extension FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE e.number IS NULL"
```

**Expected result**: No results (empty)

### Step 5: Find Invalid Provider References
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.id, ir.provider FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Providers p ON ir.provider = p.uniqid
   WHERE p.uniqid IS NULL"
```

**Expected result**: No results (empty)

### Step 6: Find Invalid Network Filter References
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension, s.networkfilterid FROM m_Sip s
   LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
   WHERE s.networkfilterid IS NOT NULL AND nf.id IS NULL"
```

**Expected result**: No results (empty)

---

## Scenario 7: Verify Security Settings

**When to use**: After configuring network filters and firewall rules

**What to verify**:
- Network filter exists
- Filter is referenced by SIP accounts or firewall rules
- IP/CIDR format is valid
- Firewall rules reference valid filters

**Step-by-step verification**:

### Step 1: Check Network Filter
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, description, permit, deny, local_network
   FROM m_NetworkFilters WHERE id='FILTER_ID'" \
  -header -column
```

**Expected result**:
- Record exists
- `permit` or `deny` is set
- IP/CIDR format is correct

### Step 2: Check What Uses This Filter
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_Sip WHERE networkfilterid='FILTER_ID') as sip_accounts,
     (SELECT COUNT(*) FROM m_FirewallRules WHERE networkfilterid='FILTER_ID') as firewall_rules"
```

**Expected result**: At least one reference (not orphaned)

### Step 3: Check Firewall Rules
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT fr.category, fr.action, nf.permit, nf.deny
   FROM m_FirewallRules fr
   LEFT JOIN m_NetworkFilters nf ON fr.networkfilterid = nf.id
   WHERE fr.networkfilterid='FILTER_ID'" \
  -header -column
```

**Expected result**:
- Rules exist
- `category` is valid enum
- `action` is allow or block
- Network filter data is populated

### Step 4: Verify SIP Accounts Using Filter
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension, s.secret, e.callerid
   FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE s.networkfilterid='FILTER_ID'" \
  -header -column
```

**Expected result**: SIP accounts using the filter are listed

---

## Complete Extension Verification Script

**Use this complete script** after creating an extension to verify everything at once:

```bash
#!/bin/bash
# After creating extension via API

CONTAINER_ID="<container_id>"
EXT_NUMBER="100"

echo "=== Checking Extension Record ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE number='$EXT_NUMBER'" -header -column

echo ""
echo "=== Checking SIP Account ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE extension='$EXT_NUMBER'" -header -column

echo ""
echo "=== Checking User Association ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT u.* FROM m_Users u
   JOIN m_Extensions e ON u.id = e.userid
   WHERE e.number='$EXT_NUMBER'" -header -column

echo ""
echo "=== Checking Data Integrity ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     CASE WHEN type IN ('SIP','EXTERNAL','QUEUE','CONFERENCE','DIALPLAN APPLICATION','IVR MENU')
          THEN 'VALID' ELSE 'INVALID' END as type_valid,
     CASE WHEN LENGTH(number) BETWEEN 2 AND 8
          THEN 'VALID' ELSE 'INVALID' END as number_valid,
     CASE WHEN callerid IS NOT NULL AND callerid != ''
          THEN 'VALID' ELSE 'INVALID' END as callerid_valid
   FROM m_Extensions WHERE number='$EXT_NUMBER'" -header -column
```

**Expected output**: All checks return "VALID"

---

## Typical Verification Workflow

1. **Execute REST API operation** (create/update/delete)
2. **Capture API response** (get IDs, uniqids)
3. **Query database** using captured IDs
4. **Verify data integrity**:
   - Record exists with correct values
   - Foreign keys are valid
   - Related records created/updated/deleted
   - Enum values are valid
   - Required fields populated
5. **Check for orphans** (broken relationships)
6. **Validate business rules** (priorities, defaults, etc.)

---

## Tips for Effective Verification

1. **Always use -header -column** for readable output
2. **Check both directions** of relationships (e.g., extension→user AND user→extensions)
3. **Verify counts** match expected numbers
4. **Test edge cases** (NULL values, empty strings)
5. **Use LEFT JOIN** to detect missing relationships
6. **Export results** for complex verifications
7. **Compare before/after** states for updates
8. **Test cascade deletes** by checking related tables

---

## See Also

- [Common Queries](common-queries.md) - SQL query patterns library
- [Schema Reference](schema-reference.md) - Complete table definitions
