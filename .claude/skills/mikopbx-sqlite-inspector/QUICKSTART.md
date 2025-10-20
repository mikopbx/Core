# Quick Start Guide - MikoPBX SQLite Inspector

## 5-Minute Introduction

This skill helps you verify MikoPBX database consistency after REST API operations.

## Installation Check

```bash
ls ~/.claude/skills/mikopbx-sqlite-inspector/SKILL.md
# Should show the file path if installed correctly
```

## Basic Usage

### 1. Get Container ID
```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
echo $CONTAINER_ID
```

### 2. Run Your First Query
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT number, type, callerid FROM m_Extensions LIMIT 5" -header -column
```

## Most Common Use Cases

### After Creating Extension
```bash
EXT="100"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE number='$EXT'" -header -column
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE extension='$EXT'" -header -column
```

### After Creating Provider
```bash
PROVIDER="SIP-PROVIDER-123"
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Providers WHERE uniqid='$PROVIDER'" -header -column
```

### Check for Orphaned Records
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT COUNT(*) FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE s.extension IS NOT NULL AND e.number IS NULL"
# Should return 0
```

### View Recent Calls
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT start, src_num, dst_num, disposition
   FROM cdr_general
   WHERE DATE(start) = DATE('now')
   ORDER BY start DESC LIMIT 10" -header -column
```

## Output Formats

```bash
# Readable columns
-header -column

# JSON (for scripts)
-json

# CSV (for export)
-csv -header

# Line-by-line
-line
```

## Using with Claude

Just ask Claude:
- "Verify the extension was created in the database"
- "Check the provider configuration in the database"
- "Query CDR records for today's calls"
- "Find orphaned SIP accounts"

Claude will automatically use this skill to execute the appropriate queries.

## Key Tables

- **m_Extensions** - All phone numbers (extensions, queues, IVR, conferences)
- **m_Sip** - SIP account configurations
- **m_Users** - User accounts
- **m_Providers** - SIP/IAX trunks
- **m_IncomingRoutingTable** - DID routing
- **m_OutgoingRoutingTable** - Outbound routing
- **m_CallQueues** - Queue configurations
- **cdr_general** - Call history

## Database Location

Main configuration: `/cf/conf/mikopbx.db`

## Helper Script

```bash
~/.claude/skills/mikopbx-sqlite-inspector/db-query.sh \
  $CONTAINER_ID \
  "SELECT COUNT(*) FROM m_Extensions" \
  column
```

## Test the Skill

```bash
~/.claude/skills/mikopbx-sqlite-inspector/test-skill.sh
```

## Learn More

- **SKILL.md** - Complete query patterns and examples
- **schema-reference.md** - All tables and fields
- **examples.md** - Step-by-step verification scenarios
- **README.md** - Full overview

## Typical Workflow

1. Execute REST API operation (POST, PUT, DELETE)
2. Capture response (ID, uniqid)
3. Query database with captured ID
4. Verify record exists and is correct
5. Check foreign key relationships
6. Validate data consistency

## Pro Tips

1. Always check relationships, not just existence
2. Use JSON format for automated testing
3. Export data before major changes
4. Check for orphaned records after deletions
5. Validate enum values match model constants

## Need Help?

1. Check examples.md for similar scenarios
2. Refer to schema-reference.md for table structure
3. Ask Claude to use this skill
4. Review SKILL.md for detailed patterns

---

**Total Size:** 2,747 lines of documentation and scripts
**Files:** SKILL.md, schema-reference.md, examples.md, README.md, INSTALLATION.md, db-query.sh, test-skill.sh
