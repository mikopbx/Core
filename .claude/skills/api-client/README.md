# MikoPBX API Client

Universal REST API client for MikoPBX with automatic authentication and container execution.

## Quick Start

```bash
# Get list of extensions
./.claude/skills/api-client/scripts/api-request.sh GET extensions

# Search extensions
./.claude/skills/api-client/scripts/api-request.sh GET "extensions?search=admin"

# Create extension
./.claude/skills/api-client/scripts/api-request.sh POST extensions \
  --data "number=201&username=test&mobile=1234567890"

# Update extension
./.claude/skills/api-client/scripts/api-request.sh PATCH "extensions/201" \
  --data "mobile=9999999999"

# Delete extension
./.claude/skills/api-client/scripts/api-request.sh DELETE "extensions/201"
```

## Features

✅ Automatic JWT authentication
✅ Container auto-detection (mikopbx-php83/mikopbx-php74)
✅ All HTTP methods (GET, POST, PATCH, DELETE, PUT)
✅ JSON pretty-printing
✅ Form data and JSON payload support
✅ Query parameter handling
✅ Error messages and debugging

## Common Examples

### CDR (Call Detail Records)
```bash
# Get recent calls
./.claude/skills/api-client/scripts/api-request.sh GET "cdr?limit=10"

# Search by date range
./.claude/skills/api-client/scripts/api-request.sh GET "cdr?dateFrom=2025-10-17&dateTo=2025-10-18%2023:59:59"

# Search by phone number
./.claude/skills/api-client/scripts/api-request.sh GET "cdr?search=79643442732&limit=5"

# Search by name
./.claude/skills/api-client/scripts/api-request.sh GET "cdr?search=Ivan&limit=3"
```

### Providers
```bash
# List providers
./.claude/skills/api-client/scripts/api-request.sh GET providers

# Create SIP provider
./.claude/skills/api-client/scripts/api-request.sh POST providers \
  --json '{"type":"sip","description":"Test","host":"sip.example.com"}'

# Update provider
./.claude/skills/api-client/scripts/api-request.sh PATCH "providers/1" --data "disabled=0"

# Delete provider
./.claude/skills/api-client/scripts/api-request.sh DELETE "providers/1"
```

### System
```bash
# System info
./.claude/skills/api-client/scripts/api-request.sh GET "system/info"

# Check for updates
./.claude/skills/api-client/scripts/api-request.sh GET "system:check-for-updates"

# Global search
./.claude/skills/api-client/scripts/api-request.sh GET "search?query=admin"
```

## Options

```bash
./.claude/skills/api-client/scripts/api-request.sh <METHOD> <ENDPOINT> [OPTIONS]

Options:
  --data "key=value"    Form data for POST/PATCH
  --json '{"key":"v"}'  JSON payload
  --container NAME      Specific container
  --lines N             Limit output lines (default: 80)
  --debug               Debug mode
```

## Environment Variables

```bash
MIKOPBX_LOGIN="admin"                   # Username
MIKOPBX_PASSWORD="123456789MikoPBX#1"  # Password
MIKOPBX_CONTAINER="mikopbx-php83"       # Container name
```

## Documentation

- **[SKILL.md](SKILL.md)** - Complete documentation
- **[HTTP Methods](reference/http-methods.md)** - Method reference
- **[Common Endpoints](reference/common-endpoints.md)** - Endpoint guide
- **[CRUD Examples](examples/crud-examples.md)** - Complete workflows

## How It Works

1. Detects running MikoPBX container (mikopbx-php83 or mikopbx-php74)
2. Gets JWT token using auth-token-manager skill
3. Executes curl request inside container (http://127.0.0.1:8081)
4. Formats JSON response with python3
5. Returns result with configurable line limit

## Integration

Works with:
- **auth-token-manager** - Automatic authentication
- **container-inspector** - Container detection
- **sqlite-inspector** - Database verification
- **openapi-analyzer** - Endpoint documentation

## Quick Examples

```bash
# From project root directory
cd /Users/nb/PhpstormProjects/mikopbx/Core

# List extensions
./.claude/skills/api-client/scripts/api-request.sh GET extensions

# Create and verify
./.claude/skills/api-client/scripts/api-request.sh POST extensions --data "number=777&username=test"
./.claude/skills/api-client/scripts/api-request.sh GET "extensions/777"

# Update and verify
./.claude/skills/api-client/scripts/api-request.sh PATCH "extensions/777" --data "mobile=1111111111"
./.claude/skills/api-client/scripts/api-request.sh GET "extensions/777" | grep mobile

# Delete and verify (should fail with 404)
./.claude/skills/api-client/scripts/api-request.sh DELETE "extensions/777"
./.claude/skills/api-client/scripts/api-request.sh GET "extensions/777" || echo "Deleted successfully"
```

## Troubleshooting

**Container not found?**
```bash
docker ps --filter "name=mikopbx"
docker start mikopbx-php83
```

**Authentication failed?**
```bash
export MIKOPBX_LOGIN="admin"
export MIKOPBX_PASSWORD="123456789MikoPBX#1"
```

**Want more output?**
```bash
./.claude/skills/api-client/scripts/api-request.sh GET extensions --lines 200
./.claude/skills/api-client/scripts/api-request.sh GET extensions --lines 0  # No limit
```

**Debug mode:**
```bash
./.claude/skills/api-client/scripts/api-request.sh GET extensions --debug
```

## See Also

- [Main MikoPBX Documentation](../../CLAUDE.md)
- [REST API Development Guide](../../src/PBXCoreREST/CLAUDE.md)
- [API Tests](../../tests/api/)
