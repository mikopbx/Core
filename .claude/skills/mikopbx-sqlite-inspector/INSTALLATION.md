# Installation and Usage Guide

## Installation

The skill is already installed in your Claude Code environment at:
```
~/.claude/skills/mikopbx-sqlite-inspector/
```

## Verification

To verify the skill is properly installed:

```bash
# Check skill files exist
ls -la ~/.claude/skills/mikopbx-sqlite-inspector/

# You should see:
# - SKILL.md (main skill documentation)
# - schema-reference.md (database schema reference)
# - examples.md (practical examples)
# - db-query.sh (helper script)
# - README.md (overview)
# - test-skill.sh (test script)
```

## Testing the Skill

Run the test script to verify functionality:

```bash
cd ~/.claude/skills/mikopbx-sqlite-inspector/
./test-skill.sh
```

This will:
1. Find your MikoPBX Docker container
2. Execute sample queries
3. Test different output formats
4. Verify data consistency
5. Demonstrate helper script usage

## How Claude Code Uses This Skill

Claude Code will automatically invoke this skill when you:

1. **Request database verification** after API operations
2. **Ask to check data consistency** in MikoPBX
3. **Want to inspect CDR records** for testing
4. **Need to validate relationships** between tables
5. **Request low-level database queries**

### Example Prompts

Here are prompts that will trigger this skill:

```
"Verify the extension was created correctly in the database"
"Check if the provider configuration is consistent in the database"
"Query the database to see if the queue members were added"
"Inspect the CDR records for the last test call"
"Check for orphaned records in the database"
"Validate that all foreign keys are correct"
"Show me the SIP account details from the database"
```

## Manual Usage

You can also use the skill tools directly:

### Using docker exec

```bash
# Get container ID
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# Execute query
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" -header -column
```

### Using the Helper Script

```bash
# Make executable (first time only)
chmod +x ~/.claude/skills/mikopbx-sqlite-inspector/db-query.sh

# Use the script
~/.claude/skills/mikopbx-sqlite-inspector/db-query.sh \
  <container_id> \
  "SELECT * FROM m_Extensions LIMIT 5" \
  column
```

## Common Workflows

### After Creating Extension via API

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
EXT_NUMBER="100"

# Check extension record
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions WHERE number='$EXT_NUMBER'" -header -column

# Check SIP account
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE extension='$EXT_NUMBER'" -header -column
```

### After Creating Provider

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')
PROVIDER_ID="SIP-PROVIDER-123"

# Check provider
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Providers WHERE uniqid='$PROVIDER_ID'" -header -column

# Check SIP config
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Sip WHERE uniqid='$PROVIDER_ID'" -header -column
```

### Data Consistency Check

```bash
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}')

# Find orphaned SIP accounts
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT s.extension FROM m_Sip s
   LEFT JOIN m_Extensions e ON s.extension = e.number
   WHERE s.extension IS NOT NULL AND e.number IS NULL"

# Should return empty (no orphans)
```

## Output Formats

The skill supports multiple output formats:

### Column Format (Default)
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 3" -header -column
```
Output:
```
number  type  callerid
------  ----  --------
100     SIP   John Doe
101     SIP   Jane Smith
```

### JSON Format
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 3" -json
```
Output:
```json
[
  {"number":"100","type":"SIP","callerid":"John Doe"},
  {"number":"101","type":"SIP","callerid":"Jane Smith"}
]
```

### CSV Format
```bash
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 3" -csv -header
```
Output:
```csv
number,type,callerid
100,SIP,John Doe
101,SIP,Jane Smith
```

## Documentation Files

- **SKILL.md** - Main documentation with query patterns and scenarios
- **schema-reference.md** - Complete database schema with all tables
- **examples.md** - Step-by-step examples for common use cases
- **README.md** - Overview and quick reference
- **INSTALLATION.md** - This file

## Troubleshooting

### Skill Not Recognized

If Claude doesn't invoke the skill automatically:
1. Check SKILL.md has proper YAML frontmatter
2. Verify files are in `~/.claude/skills/mikopbx-sqlite-inspector/`
3. Try restarting Claude Code

### Database Locked Error

```bash
# Use read-only mode
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db \
  "SELECT ..." -readonly
```

### Permission Denied

```bash
# Run as root
docker exec -u root $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "..."
```

### Container Not Found

```bash
# List all containers
docker ps -a | grep mikopbx

# Use specific container name
docker ps --filter "name=mikopbx"
```

## Integration with Testing

This skill is designed to work with:
- Manual REST API testing
- Automated test suites
- CI/CD pipelines
- Data migration validation
- System health monitoring

## Best Practices

1. **Always verify after API operations** - Don't assume API worked
2. **Check relationships, not just existence** - Validate foreign keys
3. **Use JSON format for scripting** - Easier to parse programmatically
4. **Export before major changes** - Save baseline for comparison
5. **Use transactions for testing** - BEGIN...ROLLBACK for safe testing

## Support and Updates

For issues or improvements:
- Check existing examples in examples.md
- Refer to schema-reference.md for table structure
- Consult main SKILL.md for detailed patterns
- Review MikoPBX models at `/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/CLAUDE.md`

## Version History

- **2025-10-20** - Initial creation
  - Complete schema reference
  - Verification patterns
  - Helper scripts
  - Comprehensive examples

## License

Part of MikoPBX development tools.
