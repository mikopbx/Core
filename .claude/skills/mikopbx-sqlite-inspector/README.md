# MikoPBX SQLite Inspector Skill

A comprehensive Claude Code skill for low-level database verification and inspection of MikoPBX SQLite databases.

## Purpose

This skill enables verification of MikoPBX data consistency at the database level, particularly after REST API operations. It provides query templates, validation patterns, and best practices for ensuring data integrity.

## Files in This Skill

- **SKILL.md** - Main skill documentation with query patterns and usage
- **schema-reference.md** - Complete database schema reference
- **examples.md** - Practical examples for common scenarios
- **db-query.sh** - Helper script for executing queries
- **README.md** - This file

## Quick Start

### 1. Get Container ID

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
echo $CONTAINER_ID
```

### 2. Execute a Query

```bash
# Using docker exec
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -header -column

# Using helper script
./db-query.sh $CONTAINER_ID "SELECT * FROM m_Extensions LIMIT 5" json
```

### 3. Verify API Operation

After creating extension via API:

```bash
EXT_NUMBER="100"

# Check extension exists
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid FROM m_Extensions WHERE number='$EXT_NUMBER'" \
  -header -column

# Check SIP account created
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT extension, secret FROM m_Sip WHERE extension='$EXT_NUMBER'" \
  -header -column
```

## Key Features

### 1. Complete Schema Documentation
- All tables with field descriptions
- Foreign key relationships
- Enum value validation
- Data type reference

### 2. Verification Patterns
- Post-API operation checks
- Data consistency validation
- Orphaned record detection
- Business rule verification

### 3. Common Scenarios
- Extension creation/deletion
- Provider configuration
- Queue management
- Routing rule validation
- CDR inspection

### 4. Export Capabilities
- JSON export for scripting
- CSV export for analysis
- Before/after comparisons
- Bulk data extraction

## Use Cases

### REST API Testing
Verify that API operations correctly modified database records:
```bash
# Before API call
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions" > before.txt

# Execute API operation
curl -X POST ...

# After API call - verify count increased
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Extensions" > after.txt

diff before.txt after.txt
```

### Data Consistency Checks
Find orphaned records and broken relationships:
```bash
# Find SIP accounts without extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE e.number IS NULL AND s.extension IS NOT NULL"
```

### Call Detail Analysis
Inspect CDR records for testing:
```bash
# Recent calls
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT start, src_num, dst_num, disposition, recordingfile
   FROM cdr_general
   WHERE DATE(start) = DATE('now')
   ORDER BY start DESC" -header -column
```

## Database Locations

- **Main DB**: `/cf/conf/mikopbx.db` - All PBX configuration
- **CDR DB**: Location varies by storage configuration

## Important Tables

### Core Configuration
- `m_Extensions` - Central hub for all phone numbers
- `m_Users` - User accounts
- `m_Sip` - SIP account configurations
- `m_Providers` - SIP/IAX trunks

### Routing
- `m_IncomingRoutingTable` - DID routing rules
- `m_OutgoingRoutingTable` - Outbound routing rules

### Features
- `m_CallQueues` & `m_CallQueueMembers` - Call queues
- `m_ConferenceRooms` - Conference rooms
- `m_IvrMenu` & `m_IvrMenuActions` - IVR menus

### Security
- `m_NetworkFilters` - IP restrictions
- `m_FirewallRules` - Firewall rules
- `m_Fail2BanRules` - Intrusion prevention

### Call Records
- `cdr_general` - Permanent call history
- `cdr` - Active/temporary calls

## Output Formats

```bash
# Column-aligned (default)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "..." -header -column

# JSON (best for scripting)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "..." -json

# CSV (best for export)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "..." -csv -header

# Line (one value per line)
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "..." -line
```

## Helper Script Usage

The `db-query.sh` script simplifies query execution:

```bash
# Make executable (first time only)
chmod +x db-query.sh

# Usage
./db-query.sh <container_id> <query> [format]

# Examples
./db-query.sh abc123 "SELECT * FROM m_Extensions LIMIT 5" column
./db-query.sh abc123 "SELECT * FROM m_Users" json
./db-query.sh abc123 "SELECT * FROM m_Providers" csv
```

## Best Practices

### 1. Always Verify After API Operations
Don't assume API worked - verify in database:
```bash
# After POST /extensions
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE number='NEW_EXT'" -header -column
```

### 2. Check Relationships, Not Just Existence
Verify foreign keys are valid:
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT e.number, s.extension
   FROM m_Extensions e
   LEFT JOIN m_Sip s ON e.number = s.extension
   WHERE e.type='SIP' AND s.extension IS NULL"
# Should return empty
```

### 3. Validate Enum Values
Ensure data quality:
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type FROM m_Extensions
   WHERE type NOT IN ('SIP','EXTERNAL','QUEUE','CONFERENCE','DIALPLAN APPLICATION','IVR MENU')"
# Should return empty
```

### 4. Use Transactions for Testing
Test queries safely:
```bash
docker exec -it $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db <<EOF
BEGIN TRANSACTION;
UPDATE m_Extensions SET callerid='Test' WHERE number='100';
SELECT * FROM m_Extensions WHERE number='100';
ROLLBACK;
EOF
```

### 5. Export for Analysis
Save results for comparison:
```bash
# Before
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -json > before.json

# After API operation
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" -json > after.json

# Compare
diff before.json after.json
```

## Common Verification Workflow

1. **Execute REST API Operation**
   - Create/update/delete via API
   - Capture response (IDs, uniqids)

2. **Query Database**
   - Use captured IDs to query records
   - Check record exists with correct values

3. **Verify Relationships**
   - Check foreign keys are valid
   - Ensure related records created/updated

4. **Validate Data Quality**
   - Enum values are valid
   - Required fields populated
   - Data ranges correct

5. **Check for Orphans**
   - No broken relationships
   - No dangling references

6. **Validate Business Rules**
   - Priorities correct
   - Defaults applied
   - Constraints satisfied

## Troubleshooting

### Database Locked
```bash
# Check processes using DB
docker exec $CONTAINER_ID lsof /cf/conf/mikopbx.db

# Use read-only mode
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "SELECT ..." -readonly
```

### Permission Denied
```bash
# Run as root
docker exec -u root $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "SELECT 1"
```

### Database Not Found
```bash
# Verify path
docker exec $CONTAINER_ID ls -l /cf/conf/mikopbx.db

# Find CDR database
docker exec $CONTAINER_ID find /storage -name "*.db"
```

## Integration with Testing

This skill is designed to work with:
- REST API testing workflows
- Automated test suites
- Manual verification processes
- Data migration validation
- System health checks

## Examples

See `examples.md` for detailed examples including:
- Extension creation verification
- Provider configuration checks
- Queue setup validation
- Routing rule verification
- CDR inspection
- Data consistency checks
- Orphaned record detection
- Enum validation
- Complete verification scripts

## Schema Reference

See `schema-reference.md` for:
- Complete table schemas
- Field descriptions
- Relationship diagrams
- Data types
- Indexes
- Common JOIN patterns
- SQLite-specific notes

## Support

For issues or questions:
- Check SKILL.md for query templates
- Review examples.md for similar scenarios
- Consult schema-reference.md for table structure
- Refer to /Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/CLAUDE.md for model documentation

## Version

This skill is compatible with MikoPBX running in Docker containers with SQLite databases.

Last updated: 2025-10-20
