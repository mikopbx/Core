# MikoPBX SQLite Inspector - Usage Examples

This file contains practical examples for common verification scenarios.

## Quick Start

### Get Container ID
```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
echo $CONTAINER_ID
```

### Basic Query Execution
```bash
# Using docker exec directly
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -header -column

# Using helper script
./db-query.sh $CONTAINER_ID "SELECT * FROM m_Extensions LIMIT 5" json
```

## REST API Verification Examples

### Example 1: Verify Extension Creation

**Scenario:** Created extension 201 via POST /extensions API

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
EXT_NUMBER="201"

# 1. Check extension record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, userid, show_in_phonebook
   FROM m_Extensions
   WHERE number='$EXT_NUMBER'" -header -column

# Expected: One record with correct values

# 2. Check SIP account
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, secret, transport, networkfilterid
   FROM m_Sip
   WHERE extension='$EXT_NUMBER'" -header -column

# Expected: SIP account with password, transport=udp

# 3. Verify relationship integrity
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     e.number,
     e.type,
     CASE WHEN s.extension IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as sip_account,
     CASE WHEN u.id IS NOT NULL THEN u.username ELSE 'NO USER' END as user
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   LEFT JOIN m_Users u ON e.userid = u.id
   WHERE e.number='$EXT_NUMBER'" -header -column

# Expected: sip_account = 'EXISTS', user shown if userid was set
```

### Example 2: Verify Provider Creation

**Scenario:** Created SIP provider via POST /providers API

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
PROVIDER_UNIQID="SIP-PROVIDER-1234567890"

# 1. Check provider record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type, description, host, disabled
   FROM m_Providers
   WHERE uniqid='$PROVIDER_UNIQID'" -header -column

# Expected: Provider with correct details, disabled='0'

# 2. Check SIP configuration
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, username, host, port, secret
   FROM m_Sip
   WHERE uniqid='$PROVIDER_UNIQID'" -header -column

# Expected: SIP config with auth credentials

# 3. Verify no orphaned routing rules exist yet
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider='$PROVIDER_UNIQID') as incoming,
     (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid='$PROVIDER_UNIQID') as outbound"

# Expected: Both 0 if no routes created yet
```

### Example 3: Verify Call Queue Creation

**Scenario:** Created call queue via POST /call-queues API

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
QUEUE_UNIQID="QUEUE-1234567890"

# 1. Check queue record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, name, extension, strategy, seconds_to_ring_each_member
   FROM m_CallQueues
   WHERE uniqid='$QUEUE_UNIQID'" -header -column

# Expected: Queue with correct strategy

# 2. Check extension was created
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.type
   FROM m_Extensions e
   JOIN m_CallQueues cq ON e.number = cq.extension
   WHERE cq.uniqid='$QUEUE_UNIQID'" -header -column

# Expected: Extension with type='QUEUE'

# 3. Check queue members
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.extension, cqm.priority, e.callerid
   FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cqm.queue='$QUEUE_UNIQID'
   ORDER BY cqm.priority" -header -column

# Expected: List of members with valid extensions

# 4. Verify no orphaned members
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.extension
   FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cqm.queue='$QUEUE_UNIQID' AND e.number IS NULL"

# Expected: No results (empty)
```

### Example 4: Verify Incoming Route Creation

**Scenario:** Created incoming route via POST /incoming-routes API

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
ROUTE_ID="123"

# 1. Check route record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, number, provider, extension, action, priority
   FROM m_IncomingRoutingTable
   WHERE id='$ROUTE_ID'" -header -column

# Expected: Route with correct DID and destination

# 2. Verify provider exists
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.provider, p.description, p.disabled
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Providers p ON ir.provider = p.uniqid
   WHERE ir.id='$ROUTE_ID'" -header -column

# Expected: Provider description shown, disabled='0'

# 3. Verify destination extension exists (if action=extension)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.extension, e.callerid, e.type
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.id='$ROUTE_ID' AND ir.action='extension'" -header -column

# Expected: Extension details shown

# 4. Check priority uniqueness (business rule)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, number, priority
   FROM m_IncomingRoutingTable
   WHERE provider=(SELECT provider FROM m_IncomingRoutingTable WHERE id='$ROUTE_ID')
   ORDER BY priority" -header -column

# Expected: No duplicate priorities for same provider
```

### Example 5: Verify User with Extensions

**Scenario:** Created user via POST /users API with multiple extensions

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
USER_ID="42"

# 1. Check user record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, email, username, language
   FROM m_Users
   WHERE id='$USER_ID'" -header -column

# Expected: User with unique email

# 2. Check user's extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, is_general_user_number
   FROM m_Extensions
   WHERE userid='$USER_ID'" -header -column

# Expected: One or more extensions

# 3. Verify exactly one primary extension
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) as primary_count
   FROM m_Extensions
   WHERE userid='$USER_ID' AND is_general_user_number='1'"

# Expected: primary_count = 1

# 4. Get complete user profile
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     u.username,
     u.email,
     e.number,
     e.type,
     e.callerid,
     s.secret as sip_password
   FROM m_Users u
   LEFT JOIN m_Extensions e ON u.id = e.userid
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE u.id='$USER_ID'" -header -column

# Expected: All extensions with SIP passwords
```

## Data Consistency Checks

### Check for Orphaned Records

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# 1. SIP accounts without extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension
   FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL AND s.extension IS NOT NULL" -header -column

# Expected: Empty (no orphans)

# 2. Extensions without SIP accounts (for SIP type)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL" -header -column

# Expected: Empty (no orphans)

# 3. Queue members pointing to non-existent extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.queue, cqm.extension
   FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE e.number IS NULL" -header -column

# Expected: Empty (no orphans)

# 4. Incoming routes with invalid extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.id, ir.number, ir.extension
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.action='extension' AND e.number IS NULL" -header -column

# Expected: Empty (no orphans)

# 5. Incoming routes with invalid providers
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.id, ir.number, ir.provider
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Providers p ON ir.provider = p.uniqid
   WHERE ir.provider IS NOT NULL AND p.uniqid IS NULL" -header -column

# Expected: Empty (no orphans)
```

### Validate Enum Values

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# 1. Check extension types
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type
   FROM m_Extensions
   WHERE type NOT IN ('SIP','EXTERNAL','QUEUE','CONFERENCE','DIALPLAN APPLICATION','IVR MENU')"

# Expected: Empty (all valid)

# 2. Check provider types
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type
   FROM m_Providers
   WHERE type NOT IN ('SIP','IAX')"

# Expected: Empty (all valid)

# 3. Check SIP transport
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, transport
   FROM m_Sip
   WHERE transport NOT IN ('udp','tcp','tls')"

# Expected: Empty (all valid)

# 4. Check incoming route actions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, number, action
   FROM m_IncomingRoutingTable
   WHERE action NOT IN ('extension','hangup','busy','voicemail')"

# Expected: Empty (all valid)

# 5. Check queue strategies
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, name, strategy
   FROM m_CallQueues
   WHERE strategy NOT IN ('ringall','leastrecent','random','rrmemory')"

# Expected: Empty (all valid)
```

### Validate Data Ranges

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# 1. Extension numbers (2-8 digits)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, LENGTH(number) as len
   FROM m_Extensions
   WHERE LENGTH(number) < 2 OR LENGTH(number) > 8"

# Expected: Empty

# 2. Routing priorities (0-9999)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, priority
   FROM m_IncomingRoutingTable
   WHERE priority < 0 OR priority > 9999"

# Expected: Empty

# 3. SIP passwords not empty
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension
   FROM m_Sip
   WHERE secret IS NULL OR secret = '' OR LENGTH(secret) < 8"

# Expected: Empty (all have strong passwords)

# 4. Required callerids
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type
   FROM m_Extensions
   WHERE callerid IS NULL OR callerid = ''"

# Expected: Empty or acceptable based on business rules
```

## CDR Verification Examples

### Verify Call Recording After Test Call

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# 1. Check recent calls
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT start, src_num, dst_num, duration, billsec, disposition, recordingfile
   FROM cdr_general
   WHERE DATE(start) = DATE('now')
   ORDER BY start DESC
   LIMIT 10" -header -column

# 2. Verify specific call was recorded
SRC="100"
DST="200"

docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     start,
     src_num,
     dst_num,
     duration,
     billsec,
     disposition,
     CASE
       WHEN recordingfile IS NOT NULL AND recordingfile != ''
       THEN 'RECORDED'
       ELSE 'NOT RECORDED'
     END as recording_status
   FROM cdr_general
   WHERE src_num='$SRC' AND dst_num='$DST'
   ORDER BY start DESC
   LIMIT 1" -header -column

# Expected: disposition='ANSWERED', recording_status='RECORDED'

# 3. Check active calls (should be empty after test)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT src_num, dst_num, start, duration
   FROM cdr
   WHERE endtime IS NULL OR endtime = ''" -header -column

# Expected: Empty (no active calls)
```

### Verify Call Routing via CDR

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# Check if incoming call went to correct extension
DID="1234567890"

docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     start,
     did,
     dst_num,
     disposition,
     duration
   FROM cdr_general
   WHERE did='$DID'
   ORDER BY start DESC
   LIMIT 5" -header -column

# Expected: dst_num matches expected route destination
```

## Bulk Verification Scripts

### Complete System Consistency Check

```bash
#!/bin/bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

echo "=== MikoPBX Database Consistency Check ==="
echo ""

echo "1. Checking for orphaned SIP accounts..."
ORPHAN_SIP=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL AND s.extension IS NOT NULL")
echo "   Orphaned SIP accounts: $ORPHAN_SIP (should be 0)"

echo "2. Checking for SIP extensions without accounts..."
MISSING_SIP=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL")
echo "   SIP extensions without accounts: $MISSING_SIP (should be 0)"

echo "3. Checking for invalid extension types..."
INVALID_TYPES=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions
   WHERE type NOT IN ('SIP','EXTERNAL','QUEUE','CONFERENCE','DIALPLAN APPLICATION','IVR MENU')")
echo "   Invalid extension types: $INVALID_TYPES (should be 0)"

echo "4. Checking for invalid provider types..."
INVALID_PROVIDERS=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Providers WHERE type NOT IN ('SIP','IAX')")
echo "   Invalid provider types: $INVALID_PROVIDERS (should be 0)"

echo "5. Checking for orphaned queue members..."
ORPHAN_MEMBERS=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE e.number IS NULL")
echo "   Orphaned queue members: $ORPHAN_MEMBERS (should be 0)"

echo "6. Checking for invalid incoming routes..."
INVALID_ROUTES=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.action='extension' AND e.number IS NULL")
echo "   Invalid incoming routes: $INVALID_ROUTES (should be 0)"

echo "7. Checking extension number format..."
INVALID_NUMBERS=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions
   WHERE LENGTH(number) < 2 OR LENGTH(number) > 8")
echo "   Invalid extension numbers: $INVALID_NUMBERS (should be 0)"

echo "8. Checking for weak SIP passwords..."
WEAK_PASSWORDS=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Sip
   WHERE secret IS NULL OR secret = '' OR LENGTH(secret) < 8")
echo "   Weak SIP passwords: $WEAK_PASSWORDS (should be 0)"

echo ""
echo "=== Summary ==="
TOTAL_ISSUES=$((ORPHAN_SIP + MISSING_SIP + INVALID_TYPES + INVALID_PROVIDERS + ORPHAN_MEMBERS + INVALID_ROUTES + INVALID_NUMBERS + WEAK_PASSWORDS))
if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "✓ Database is consistent (0 issues found)"
else
    echo "✗ Found $TOTAL_ISSUES consistency issues"
fi
```

## Tips for Effective Verification

1. **Always verify after each API operation** - Don't batch checks
2. **Check both existence and relationships** - Not just that record exists
3. **Validate enum values** - Ensure data quality
4. **Look for orphans** - Broken foreign keys indicate bugs
5. **Export for comparison** - Use JSON output to compare before/after states
6. **Use transactions for testing** - BEGIN...ROLLBACK to test queries safely
7. **Check CDR for call flow** - Verify routing worked as expected

## Common Patterns

### Before/After Comparison

```bash
# Before API operation
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -json > before.json

# Execute API operation
curl -X POST ...

# After API operation
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -json > after.json

# Compare
diff before.json after.json
```

### Count Verification

```bash
# Count before
BEFORE=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions")

# API operation (create extension)
curl -X POST ...

# Count after
AFTER=$(docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions")

# Verify increment
if [ $AFTER -eq $((BEFORE + 1)) ]; then
    echo "✓ Extension count increased by 1"
else
    echo "✗ Expected $((BEFORE + 1)), got $AFTER"
fi
```
