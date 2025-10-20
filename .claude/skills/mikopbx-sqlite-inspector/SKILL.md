---
name: mikopbx-sqlite-inspector
description: Verify data consistency in MikoPBX SQLite databases after REST API operations by running SQL queries and validating against model schemas
---

# MikoPBX SQLite Database Inspector

This skill provides low-level database verification for MikoPBX settings and CDR databases. Use it after REST API operations to ensure data consistency, validate foreign key relationships, and verify data integrity.

## When to Use This Skill

Use this skill when you need to:
- **Verify REST API results** - Check that API operations correctly modified database records
- **Validate data consistency** - Ensure foreign keys, relationships, and constraints are satisfied
- **Debug data issues** - Investigate inconsistencies between API responses and actual database state
- **Inspect CDR records** - Query call detail records for testing call routing and recording
- **Check model compliance** - Verify data matches model definitions and business rules

## Available Databases

### Main Database: `/cf/conf/mikopbx.db`
Primary configuration database containing all PBX settings:
- Extensions (SIP/IAX, queues, IVR, conferences)
- Users and authentication
- Routing rules (incoming/outgoing)
- Providers (SIP/IAX trunks)
- Security (firewall, fail2ban, network filters)
- System settings and configurations

### CDR Database: Varies by deployment
Call detail records database (location depends on storage configuration):
- `cdr_general` - Permanent call history
- `cdr` - Temporary active call records

## Database Schema Reference

All tables follow the `m_*` naming convention (except CDR tables). Refer to `/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/CLAUDE.md` for complete model documentation.

### Core Tables

#### m_Extensions (Central Hub)
The extensions table is the central hub connecting all phone number entities.

**Key columns:**
- `number` - Extension number (2-8 digits, PRIMARY KEY)
- `type` - Extension type: `SIP`, `EXTERNAL`, `QUEUE`, `CONFERENCE`, `DIALPLAN APPLICATION`, `IVR MENU`
- `callerid` - Display name
- `userid` - Foreign key to m_Users
- `show_in_phonebook` - "1" to display in phonebook
- `is_general_user_number` - "1" for primary user extension

**Common queries:**
```sql
-- All SIP extensions
SELECT * FROM m_Extensions WHERE type = 'SIP';

-- Extensions for specific user
SELECT e.* FROM m_Extensions e
WHERE e.userid = 'USER_ID';

-- Extensions with their users
SELECT e.number, e.callerid, u.username, u.email
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id;
```

#### m_Sip
SIP account configurations linked to extensions.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `extension` - Foreign key to m_Extensions.number (UNIQUE)
- `secret` - SIP password
- `transport` - Transport protocol: `udp`, `tcp`, `tls`
- `networkfilterid` - Foreign key to m_NetworkFilters
- `manualattributes` - Custom SIP headers

**Common queries:**
```sql
-- SIP accounts with network filters
SELECT s.extension, s.secret, s.transport, nf.permit, nf.deny
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id;

-- Check SIP account for extension
SELECT * FROM m_Sip WHERE extension = '100';
```

#### m_Users
User accounts and profiles.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `email` - User email (UNIQUE)
- `username` - Display name
- `language` - UI language code
- `avatar` - Avatar file path

**Common queries:**
```sql
-- Users with their extensions
SELECT u.id, u.username, u.email,
       GROUP_CONCAT(e.number) as extensions
FROM m_Users u
LEFT JOIN m_Extensions e ON u.id = e.userid
GROUP BY u.id;
```

#### m_Providers
SIP/IAX provider (trunk) configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `type` - Provider type: `SIP` or `IAX`
- `description` - Provider name
- `host` - Provider hostname/IP
- `disabled` - "1" if disabled

**Common queries:**
```sql
-- Active SIP providers
SELECT * FROM m_Providers
WHERE type = 'SIP' AND disabled = '0';

-- Provider with routing rules
SELECT p.description, p.host,
       (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider = p.uniqid) as incoming_rules,
       (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid = p.uniqid) as outbound_rules
FROM m_Providers p;
```

### Routing Tables

#### m_IncomingRoutingTable
DID/Incoming call routing rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `number` - DID pattern (can contain wildcards)
- `provider` - Foreign key to m_Providers.uniqid
- `extension` - Destination extension
- `action` - Action type: `extension`, `hangup`, `busy`, `voicemail`
- `priority` - Rule priority (0-9999, lower = higher priority)
- `timeout` - Ring timeout in seconds

**Common queries:**
```sql
-- All incoming routes ordered by priority
SELECT ir.number, ir.provider, ir.extension, ir.action, ir.priority,
       p.description as provider_name
FROM m_IncomingRoutingTable ir
LEFT JOIN m_Providers p ON ir.provider = p.uniqid
ORDER BY ir.priority;

-- Routes for specific provider
SELECT * FROM m_IncomingRoutingTable
WHERE provider = 'PROVIDER_UNIQID';
```

#### m_OutgoingRoutingTable
Outbound call routing rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `providerid` - Foreign key to m_Providers.uniqid
- `numberbeginswith` - Pattern to match (e.g., "1" for US, "00" for international)
- `restnumbers` - Number of remaining digits to match (-1 = any)
- `trimfrombegin` - Number of digits to strip from beginning
- `prepend` - Prefix to add before dialing
- `priority` - Rule order (0-9999, lower = higher priority)

**Common queries:**
```sql
-- Outbound routes by priority
SELECT or.numberbeginswith, or.restnumbers, or.trimfrombegin, or.prepend,
       p.description as provider_name, or.priority
FROM m_OutgoingRoutingTable or
LEFT JOIN m_Providers p ON or.providerid = p.uniqid
ORDER BY or.priority;
```

### Call Features

#### m_CallQueues
Call queue configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - Queue name
- `extension` - Queue extension number (Foreign key to m_Extensions.number)
- `strategy` - Ring strategy: `ringall`, `leastrecent`, `random`, `rrmemory`
- `seconds_to_ring_each_member` - Ring duration per member
- `timeout_extension` - Overflow destination
- `timeout_to_redirect_to_extension` - Timeout before overflow

**Related table:** `m_CallQueueMembers`
- `queue` - Foreign key to m_CallQueues.uniqid
- `extension` - Member extension (Foreign key to m_Extensions.number)
- `priority` - Member priority

**Common queries:**
```sql
-- Queue with members
SELECT cq.name, cq.extension, cq.strategy,
       e.number as member_extension, e.callerid as member_name,
       cqm.priority as member_priority
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
LEFT JOIN m_Extensions e ON cqm.extension = e.number
WHERE cq.uniqid = 'QUEUE_UNIQID'
ORDER BY cqm.priority;
```

#### m_ConferenceRooms
Conference room configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - Conference name
- `extension` - Conference extension (Foreign key to m_Extensions.number)
- `pinCode` - Access PIN code

#### m_IvrMenu & m_IvrMenuActions
Interactive Voice Response menus and digit actions.

**m_IvrMenu columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - IVR menu name
- `extension` - IVR extension (Foreign key to m_Extensions.number)
- `audio_message_id` - Greeting sound file ID
- `timeout_extension` - Timeout destination
- `number_of_repeat` - How many times to repeat menu

**m_IvrMenuActions columns:**
- `id` - Auto-increment PRIMARY KEY
- `ivr_menu_id` - Foreign key to m_IvrMenu.uniqid
- `digits` - Pressed digit: `0-9`, `*`, `#`, `timeout`
- `extension` - Destination extension

**Common queries:**
```sql
-- IVR menu with actions
SELECT im.name, im.extension,
       ima.digits, ima.extension as destination
FROM m_IvrMenu im
LEFT JOIN m_IvrMenuActions ima ON im.uniqid = ima.ivr_menu_id
WHERE im.uniqid = 'IVR_UNIQID'
ORDER BY ima.digits;
```

### Security & Network

#### m_NetworkFilters
IP-based access restrictions.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `description` - Filter description
- `permit` - Allowed IP/CIDR (can contain multiple comma-separated)
- `deny` - Blocked IP/CIDR
- `local_network` - "1" if this represents local network

**Common queries:**
```sql
-- SIP accounts with IP restrictions
SELECT s.extension, s.secret, nf.permit, nf.deny, nf.description
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE s.networkfilterid IS NOT NULL;
```

#### m_FirewallRules
Firewall access rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `category` - Service category: `SIP`, `WEB`, `SSH`, `AMI`, `ICMP`, `CTI`
- `networkfilterid` - Foreign key to m_NetworkFilters
- `action` - Action type: `allow` or `block`
- `description` - Rule description

**Common queries:**
```sql
-- Firewall rules with network filters
SELECT fr.category, fr.action, fr.description,
       nf.permit, nf.deny
FROM m_FirewallRules fr
LEFT JOIN m_NetworkFilters nf ON fr.networkfilterid = nf.id
ORDER BY fr.category;
```

#### m_Fail2BanRules
Fail2ban intrusion prevention rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `maxretry` - Max failed attempts before ban (default: 5)
- `findtime` - Time window to count retries in seconds (default: 1800)
- `bantime` - Ban duration in seconds (default: 86400)
- `whitelist` - IPs to never ban (comma-separated)

### Settings & Files

#### m_PbxSettings
Key-value configuration store.

**Key columns:**
- `key` - Setting name (PRIMARY KEY)
- `value` - Setting value

**Important keys:**
- `PBXVersion` - System version
- `PBXLanguage` - Default system language
- `WebAdminLogin` - Admin username
- `SSHPassword` - SSH password
- `PBXTimezone` - System timezone

**Common queries:**
```sql
-- Get specific setting
SELECT value FROM m_PbxSettings WHERE key = 'PBXVersion';

-- All language-related settings
SELECT * FROM m_PbxSettings WHERE key LIKE '%Language%';
```

#### m_SoundFiles
Audio file registry.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `name` - File display name
- `path` - Filesystem path
- `category` - File category: `moh` (music on hold), `custom`

#### m_CustomFiles
Custom configuration file overrides.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `filepath` - Path to file being customized
- `content` - Custom content
- `mode` - Override mode: `append`, `override`, `script`
- `changed` - "1" if modified since last apply

### CDR Tables

#### cdr_general (Permanent Records)
Historical call detail records.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `start` - Call start timestamp
- `answer` - Call answer timestamp
- `endtime` - Call end timestamp
- `src_chan` - Source channel
- `src_num` - Caller number
- `dst_chan` - Destination channel
- `dst_num` - Called number
- `duration` - Total call duration (seconds)
- `billsec` - Billable duration (seconds)
- `disposition` - Call outcome: `ANSWERED`, `NO ANSWER`, `BUSY`, `FAILED`
- `recordingfile` - Path to call recording
- `did` - DID used for this call
- `linkedid` - Unique call identifier

**Common queries:**
```sql
-- Calls for specific extension
SELECT start, src_num, dst_num, duration, billsec, disposition
FROM cdr_general
WHERE src_num = '100' OR dst_num = '100'
ORDER BY start DESC
LIMIT 20;

-- Answered calls today
SELECT COUNT(*) as total_calls, SUM(billsec) as total_duration
FROM cdr_general
WHERE DATE(start) = DATE('now')
  AND disposition = 'ANSWERED';

-- Calls with recordings
SELECT * FROM cdr_general
WHERE recordingfile IS NOT NULL AND recordingfile != ''
ORDER BY start DESC;
```

#### cdr (Temporary Active Calls)
Currently active calls.

**Same schema as cdr_general**, but records are:
- Inserted when call starts
- Updated during call
- Moved to `cdr_general` when call ends
- `endtime IS NULL` indicates active call

**Common queries:**
```sql
-- Active calls right now
SELECT src_num, dst_num, start, duration
FROM cdr
WHERE endtime IS NULL OR endtime = '';
```

## Docker Container Access

All database operations should be executed inside the MikoPBX Docker container.

### Get Container ID
```bash
# List running MikoPBX containers
docker ps | grep mikopbx
```

### Execute SQL Queries

**Via docker exec:**
```bash
# Single query
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Extensions LIMIT 5"

# Interactive mode
docker exec -it <container_id> sqlite3 /cf/conf/mikopbx.db

# With headers and column mode
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE type='SIP'" \
  -header -column

# JSON output
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE type='SIP'" \
  -json

# Export to CSV
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" \
  -csv -header > extensions.csv
```

**Via SSH (if configured):**
```bash
ssh root@<mikopbx_ip> "sqlite3 /cf/conf/mikopbx.db 'SELECT * FROM m_Extensions'"
```

## Common Verification Scenarios

### 1. Verify Extension Creation via REST API

After creating an extension via API, verify:

```bash
# Check extension exists
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, userid FROM m_Extensions WHERE number='NEW_NUMBER'"

# Check SIP account created
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, secret, transport FROM m_Sip WHERE extension='NEW_NUMBER'"

# Verify foreign key relationship
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.type, s.extension, s.secret
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.number='NEW_NUMBER'"
```

### 2. Verify Provider Configuration

After creating/updating a provider:

```bash
# Check provider record
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type, description, host, disabled FROM m_Providers
   WHERE uniqid='PROVIDER_ID'" -header -column

# Check associated SIP/IAX account
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE uniqid='PROVIDER_ID'" -header -column

# Verify routing rules exist
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider='PROVIDER_ID') as incoming,
     (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid='PROVIDER_ID') as outbound"
```

### 3. Verify Queue Configuration

After creating/modifying a call queue:

```bash
# Check queue settings
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, name, extension, strategy, seconds_to_ring_each_member
   FROM m_CallQueues WHERE uniqid='QUEUE_ID'" -header -column

# Check queue members
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.extension, cqm.priority, e.callerid
   FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cqm.queue='QUEUE_ID'
   ORDER BY cqm.priority" -header -column

# Verify extension record exists
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type FROM m_Extensions
   WHERE number=(SELECT extension FROM m_CallQueues WHERE uniqid='QUEUE_ID')"
```

### 4. Verify Routing Rules

After creating incoming/outbound routes:

```bash
# Check incoming route
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.provider, ir.extension, ir.action, ir.priority,
          p.description as provider_name
   FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Providers p ON ir.provider = p.uniqid
   WHERE ir.id='ROUTE_ID'" -header -column

# Check outbound route
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT or.numberbeginswith, or.restnumbers, or.trimfrombegin, or.prepend,
          or.priority, p.description as provider_name
   FROM m_OutgoingRoutingTable or
   LEFT JOIN m_Providers p ON or.providerid = p.uniqid
   WHERE or.id='ROUTE_ID'" -header -column
```

### 5. Verify User and Extension Relationship

After creating user with extensions:

```bash
# Check user record
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, email, username, language FROM m_Users WHERE id='USER_ID'" \
  -header -column

# Check user's extensions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, is_general_user_number
   FROM m_Extensions
   WHERE userid='USER_ID'" -header -column

# Full user profile with extensions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT u.username, u.email, e.number, e.type, e.callerid
   FROM m_Users u
   LEFT JOIN m_Extensions e ON u.id = e.userid
   WHERE u.id='USER_ID'" -header -column
```

### 6. Check Data Consistency

Verify referential integrity:

```bash
# Find orphaned SIP accounts (no matching extension)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL"

# Find extensions without SIP accounts (for SIP type)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL"

# Find routing rules pointing to non-existent extensions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.extension FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.action='extension' AND e.number IS NULL"

# Find queue members pointing to non-existent extensions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cqm.queue, cqm.extension FROM m_CallQueueMembers cqm
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE e.number IS NULL"
```

### 7. Verify Security Settings

After configuring network filters and firewall:

```bash
# Check network filter
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, description, permit, deny, local_network
   FROM m_NetworkFilters WHERE id='FILTER_ID'" -header -column

# Check what uses this filter
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_Sip WHERE networkfilterid='FILTER_ID') as sip_accounts,
     (SELECT COUNT(*) FROM m_FirewallRules WHERE networkfilterid='FILTER_ID') as firewall_rules"

# Check firewall rules
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT fr.category, fr.action, nf.permit, nf.deny
   FROM m_FirewallRules fr
   LEFT JOIN m_NetworkFilters nf ON fr.networkfilterid = nf.id" -header -column
```

## Data Validation Patterns

### Validate Enum Values

```bash
# Check extension types are valid
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT DISTINCT type FROM m_Extensions"
# Should only return: SIP, EXTERNAL, QUEUE, CONFERENCE, DIALPLAN APPLICATION, IVR MENU

# Check provider types
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT DISTINCT type FROM m_Providers"
# Should only return: SIP, IAX

# Check incoming route actions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT DISTINCT action FROM m_IncomingRoutingTable"
# Should only return: extension, hangup, busy, voicemail
```

### Validate Required Fields

```bash
# Extensions with missing callerid
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type FROM m_Extensions
   WHERE callerid IS NULL OR callerid = ''"

# SIP accounts without password
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension FROM m_Sip
   WHERE secret IS NULL OR secret = ''"

# Providers without host
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, description FROM m_Providers
   WHERE host IS NULL OR host = ''"
```

### Validate Data Ranges

```bash
# Check extension number format (should be 2-8 digits)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number FROM m_Extensions
   WHERE LENGTH(number) < 2 OR LENGTH(number) > 8"

# Check priority values (should be 0-9999)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT id, priority FROM m_IncomingRoutingTable
   WHERE priority < 0 OR priority > 9999"
```

## Advanced Queries

### Get Complete Extension Profile
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "
SELECT
  e.number,
  e.type,
  e.callerid,
  u.username,
  u.email,
  s.secret as sip_password,
  s.transport,
  nf.permit as ip_permit,
  nf.deny as ip_deny
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id
LEFT JOIN m_Sip s ON e.number = s.extension
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE e.number = '100'
" -header -column
```

### Get Provider Routing Summary
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "
SELECT
  p.description,
  p.host,
  p.type,
  COUNT(DISTINCT ir.id) as incoming_routes,
  COUNT(DISTINCT ort.id) as outbound_routes
FROM m_Providers p
LEFT JOIN m_IncomingRoutingTable ir ON p.uniqid = ir.provider
LEFT JOIN m_OutgoingRoutingTable ort ON p.uniqid = ort.providerid
GROUP BY p.uniqid
" -header -column
```

### Get Queue with Full Member Details
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "
SELECT
  cq.name as queue_name,
  cq.extension as queue_ext,
  cq.strategy,
  e.number as member_ext,
  e.callerid as member_name,
  s.secret as member_sip_pass,
  cqm.priority as member_priority
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
LEFT JOIN m_Extensions e ON cqm.extension = e.number
LEFT JOIN m_Sip s ON e.number = s.extension
WHERE cq.uniqid = 'QUEUE_ID'
ORDER BY cqm.priority
" -header -column
```

## Tips and Best Practices

### 1. Always Use Headers and Formatting
```bash
# Good - readable output
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Extensions LIMIT 5" -header -column

# Better - JSON for programmatic parsing
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Extensions LIMIT 5" -json
```

### 2. Quote Queries Properly
```bash
# Use double quotes for the entire query
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Users WHERE email='admin@example.com'"
```

### 3. Use Transactions for Safety
```bash
# Start transaction, make changes, then rollback to test
docker exec -it <container_id> sqlite3 /cf/conf/mikopbx.db <<EOF
BEGIN TRANSACTION;
UPDATE m_Extensions SET callerid='Test' WHERE number='100';
SELECT * FROM m_Extensions WHERE number='100';
ROLLBACK;
EOF
```

### 4. Export Results for Analysis
```bash
# CSV export
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM cdr_general WHERE DATE(start) = DATE('now')" \
  -csv -header > today_calls.csv

# JSON export for scripting
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -json > extensions.json
```

### 5. Check Schema When Unsure
```bash
# Show table schema
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db ".schema m_Extensions"

# List all tables
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db ".tables"

# Show all indexes
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db ".indexes"
```

## Integration with REST API Testing

### Typical Verification Workflow

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

### Example: Complete Extension Verification

```bash
#!/bin/bash
# After creating extension via API

CONTAINER_ID="<container_id>"
EXT_NUMBER="100"

echo "=== Checking Extension Record ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE number='$EXT_NUMBER'" -header -column

echo "=== Checking SIP Account ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE extension='$EXT_NUMBER'" -header -column

echo "=== Checking User Association ==="
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT u.* FROM m_Users u
   JOIN m_Extensions e ON u.id = e.userid
   WHERE e.number='$EXT_NUMBER'" -header -column

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

## Troubleshooting

### Database Locked
If you get "database is locked" error:
```bash
# Check for processes using the database
docker exec <container_id> lsof /cf/conf/mikopbx.db

# Wait and retry, or use read-only queries
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Extensions" -readonly
```

### Permission Denied
```bash
# Ensure you're running as root or with proper privileges
docker exec -u root <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT 1"
```

### Invalid Database Path
```bash
# Verify database file exists
docker exec <container_id> ls -l /cf/conf/mikopbx.db

# Check CDR database location
docker exec <container_id> find /storage -name "*.db"
```

## Summary

This skill enables you to:
- ✅ Verify REST API operations modified database correctly
- ✅ Validate foreign key relationships and referential integrity
- ✅ Check data consistency and business rule compliance
- ✅ Inspect CDR records for call routing verification
- ✅ Debug data issues at the lowest level
- ✅ Export data for external analysis

Always execute queries inside the Docker container and use proper output formatting for readability.
