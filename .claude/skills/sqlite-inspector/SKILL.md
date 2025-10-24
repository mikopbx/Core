---
name: sqlite-inspector
description: Проверка консистентности данных в SQLite базах данных MikoPBX после операций REST API. Использовать при валидации результатов API, отладке проблем с данными, проверке связей внешних ключей или инспектировании CDR записей для тестирования.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX SQLite Database Inspecting

Quick database verification for MikoPBX after REST API operations to ensure data consistency and referential integrity.

## What This Skill Does

- ✅ Verifies REST API results are correctly persisted in database
- ✅ Validates foreign key relationships and referential integrity
- ✅ Checks data consistency against model schemas
- ✅ Inspects CDR (Call Detail Records) for call routing verification
- ✅ Debugs data issues at the lowest database level

## When to Use

Use this skill when you need to:
- **After API operations** - Verify create/update/delete operations modified database correctly
- **Debugging data issues** - Investigate inconsistencies between API responses and database state
- **Before integration tests** - Ensure database is in expected state
- **Validating foreign keys** - Check relationships between tables are correct
- **Inspecting CDR records** - Query call history for testing routing and recording

## How It Works

All queries execute inside the MikoPBX Docker container using `docker exec` with `sqlite3`:

```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT * FROM m_Extensions LIMIT 5"
```

## Available Databases

### Main Database: `/cf/conf/mikopbx.db`
Primary configuration database containing:
- Extensions (SIP/IAX, queues, IVR, conferences)
- Users and authentication
- Routing rules (incoming/outgoing)
- Providers (SIP/IAX trunks)
- Security settings (firewall, fail2ban, network filters)

### CDR Database: Location varies
Call detail records database:
- `cdr_general` - Historical call records
- `cdr` - Active calls

---

## Quick Start

### 1. Get Container ID

```bash
# List MikoPBX containers
docker ps | grep mikopbx

# Or use auto-detection script
./scripts/db_query.sh "SELECT 1"
```

### 2. Execute Simple Query

```bash
# Using docker exec directly
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -header -column

# Using helper script
./scripts/db_query.sh "SELECT * FROM m_Extensions LIMIT 5"
```

### 3. Common Output Formats

```bash
# Column format (default, readable)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -header -column

# JSON format (for scripts)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -json

# CSV export
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -csv -header > extensions.csv
```

---

## Top 5 Common Verification Patterns

### 1. Verify Extension Creation

After creating extension via API:

```bash
# Check extension exists
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid, userid FROM m_Extensions WHERE number='100'" \
  -header -column

# Check SIP account created (for SIP extensions)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, secret, transport FROM m_Sip WHERE extension='100'" \
  -header -column

# Verify complete profile with foreign keys
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, e.type, e.callerid, u.username, u.email, s.secret
   FROM m_Extensions e
   LEFT JOIN m_Users u ON e.userid = u.id
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.number='100'" \
  -header -column
```

**Expected**: All fields populated, foreign keys valid (no NULLs for required relationships)

---

### 2. Verify Provider Configuration

After creating/updating provider:

```bash
# Check provider record
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT uniqid, type, description, host, disabled FROM m_Providers
   WHERE uniqid='PROVIDER_ID'" -header -column

# Verify routing rules exist
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT
     (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider='PROVIDER_ID') as incoming,
     (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid='PROVIDER_ID') as outbound"
```

**Expected**: Provider exists, has at least one routing rule

---

### 3. Verify Queue Configuration

After creating/modifying queue:

```bash
# Check queue with members
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT cq.name, cq.extension, cq.strategy,
          e.number as member_ext, e.callerid as member_name,
          cqm.priority
   FROM m_CallQueues cq
   LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
   LEFT JOIN m_Extensions e ON cqm.extension = e.number
   WHERE cq.uniqid='QUEUE_ID'
   ORDER BY cqm.priority" -header -column
```

**Expected**: Queue exists, all members have valid extensions, priorities are correct

---

### 4. Check Data Consistency (Find Orphans)

Find broken foreign key relationships:

```bash
# Orphaned SIP accounts (no matching extension)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL"

# SIP extensions without accounts
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL"

# Routing rules pointing to non-existent extensions
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT ir.number, ir.extension FROM m_IncomingRoutingTable ir
   LEFT JOIN m_Extensions e ON ir.extension = e.number
   WHERE ir.action='extension' AND e.number IS NULL"
```

**Expected**: No results (empty) - indicates data integrity is maintained

---

### 5. Query CDR Records

Verify call routing and recording:

```bash
# Calls for specific extension (last 20)
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT start, src_num, dst_num, duration, billsec, disposition
   FROM cdr_general
   WHERE src_num = '100' OR dst_num = '100'
   ORDER BY start DESC
   LIMIT 20" -header -column

# Answered calls today
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) as total_calls, SUM(billsec) as total_duration
   FROM cdr_general
   WHERE DATE(start) = DATE('now')
     AND disposition = 'ANSWERED'"

# Active calls right now
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT src_num, dst_num, start, duration FROM cdr
   WHERE endtime IS NULL OR endtime = ''" -header -column
```

**Expected**: Call records match expected call flow

---

## Key Tables Reference

### Core Tables
- **m_Extensions** - All phone numbers (SIP, queues, IVR, conferences)
- **m_Sip** - SIP account configurations
- **m_Users** - User accounts and profiles
- **m_Providers** - SIP/IAX trunks

### Routing
- **m_IncomingRoutingTable** - DID/incoming routes
- **m_OutgoingRoutingTable** - Outbound routes

### Call Features
- **m_CallQueues** + **m_CallQueueMembers** - Call queues
- **m_ConferenceRooms** - Conference rooms
- **m_IvrMenu** + **m_IvrMenuActions** - IVR menus

### Security
- **m_NetworkFilters** - IP-based restrictions
- **m_FirewallRules** - Firewall rules
- **m_Fail2BanRules** - Intrusion prevention

### CDR
- **cdr_general** - Historical call records
- **cdr** - Active calls

For complete schema with all columns and relationships, see [Schema Reference](reference/schema-reference.md)

---

## Helper Script Usage

The `scripts/db_query.sh` helper script simplifies queries:

```bash
# Auto-detect container
./scripts/db_query.sh "SELECT * FROM m_Extensions LIMIT 5"

# Specify container
./scripts/db_query.sh -c abc123 "SELECT * FROM m_Users"

# JSON output
./scripts/db_query.sh -f json "SELECT * FROM m_Extensions"

# CSV export
./scripts/db_query.sh -f csv "SELECT * FROM m_Extensions" > extensions.csv

# Different database (CDR)
./scripts/db_query.sh -d /storage/usbdisk1/mikopbx/astlogs/asterisk_cdr/master.db \
  "SELECT * FROM cdr LIMIT 10"

# Show help
./scripts/db_query.sh --help
```

---

## Troubleshooting

### Database Locked Error

```bash
# Check processes using database
docker exec <container_id> lsof /cf/conf/mikopbx.db

# Use read-only mode
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -readonly
```

### Permission Denied

```bash
# Run as root
docker exec -u root <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT 1"
```

### Database Not Found

```bash
# Verify database exists
docker exec <container_id> ls -l /cf/conf/mikopbx.db

# Find CDR database location
docker exec <container_id> find /storage -name "*.db"
```

---

## Additional Resources

### Complete Documentation

- **[Schema Reference](reference/schema-reference.md)** - Complete table definitions, columns, foreign keys, enum values
- **[Common Queries](reference/common-queries.md)** - SQL query patterns library with 50+ examples
- **[Verification Scenarios](reference/verification-scenarios.md)** - Step-by-step verification workflows for all entity types

### Related Resources

- **Model Documentation** - `/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/CLAUDE.md`
- **REST API Documentation** - `/Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/CLAUDE.md`

---

## Tips & Best Practices

1. **Always use `-header -column`** for readable output during development
2. **Use `-json`** for scripting and automation
3. **Check both directions** of relationships (e.g., extension→user AND user→extensions)
4. **Use LEFT JOIN** to detect missing foreign key relationships
5. **Export to CSV** for complex analysis in spreadsheets
6. **Quote queries properly** - use double quotes for entire query
7. **Limit large queries** - Use `LIMIT` for tables like CDR
8. **Verify enum values** - Check DISTINCT values match expected enums

---

## Quick Commands Cheat Sheet

```bash
# List all tables
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db ".tables"

# Show table schema
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db ".schema m_Extensions"

# Count records
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db "SELECT COUNT(*) FROM m_Extensions"

# Interactive mode
docker exec -it <container_id> sqlite3 /cf/conf/mikopbx.db
```

---

**Need more examples?** See [Common Queries](reference/common-queries.md) for 50+ query patterns.

**Need verification workflows?** See [Verification Scenarios](reference/verification-scenarios.md) for complete step-by-step guides.
