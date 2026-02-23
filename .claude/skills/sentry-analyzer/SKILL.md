---
name: sentry-analyzer
description: Анализ ошибок из self-hosted Sentry (sentry.miko.ru:8443). Получение топ ошибок, просмотр stacktrace, breadcrumbs, тегов и поиск по ключевым словам. Фильтрация по релизу. Использовать при анализе и исправлении ошибок в MikoPBX.
allowed-tools: Bash, Read, Grep
---

# Sentry Error Analyzer

Analyze errors from self-hosted Sentry instance for MikoPBX project.

## What This Skill Does

- Connects to self-hosted Sentry API (v0) at `sentry.miko.ru:8443`
- Retrieves top errors sorted by frequency or recency
- **Filters issues by release version** (`--release`)
- Shows detailed issue info (title, culprit, count, first/last seen)
- Fetches full stacktrace from latest event (with release and server info)
- **Lists multiple events** for an issue to see affected servers/releases
- **Shows tag breakdown** (server_name, release, level distributions)
- Retrieves breadcrumbs for error context
- Searches issues by keyword
- Lists projects and releases

## Environment Requirements

```bash
# Required - Bearer token (Internal Integration or Auth Token)
SENTRY_TOKEN  # Set via: export SENTRY_TOKEN="your_token_placeholder"

# Optional - Override defaults
SENTRY_URL      # Default: https://sentry.miko.ru:8443
SENTRY_ORG      # Default: miko
SENTRY_PROJECT  # Default: mikopbx
```

### How to Get Token

1. Log in to `https://sentry.miko.ru:8443`
2. Go to **Settings > Developer Settings > Internal Integrations**
3. Create new Internal Integration or use existing one
4. Copy the **Token** value
5. Set it: `export SENTRY_TOKEN="your_token_placeholder"`

Required scopes: `project:read`, `event:read`, `issue:read`

## Quick Commands

### Check Connection

```bash
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh projects
```

### Auto-detect Organization and Project

```bash
# List all organizations
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh orgs

# List all projects (auto-detects SENTRY_ORG, defaults to mikopbx project)
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh projects
```

### Top Errors by Frequency

```bash
# Top errors in last 14 days (default)
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues

# Top errors in last 24 hours
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --period 24h

# Limit to top 5
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --limit 5
```

### Filter Issues by Release

```bash
# Errors only from a specific dev release
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --release "mikopbx@2025.1.209-dev"

# Errors from a release in last 24 hours
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --release "mikopbx@2025.1.196-dev" --period 24h
```

### Latest New Errors

```bash
# Most recently created issues
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --sort new

# New issues in last 24 hours
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --sort new --period 24h
```

### Issue Details

```bash
# Get details for a specific issue
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issue 12345
```

### Stacktrace (Latest Event)

```bash
# Get full stacktrace of the latest event for an issue
# Also shows release version and server name
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh event 12345
```

### List Events for an Issue

```bash
# See recent events with release and server info
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh events 12345

# Useful to determine if error affects one server or many
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh events 12345 --limit 50
```

### Tag Breakdown

```bash
# See distribution of tags (release, server_name, level, etc.)
# Useful to see which servers/releases are affected
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh tags 12345
```

### Breadcrumbs

```bash
# Get breadcrumbs (execution context) for the latest event
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh breadcrumbs 12345
```

### Search Issues

```bash
# Search by keyword
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh search "database is locked"

# Search with Sentry query syntax
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh search "is:unresolved level:error"

# Search by filename
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh search "filename:WorkerBase.php"
```

### Releases

```bash
# List recent releases (filtered to mikopbx project)
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh releases

# List more releases
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh releases --limit 50
```

## Analysis Workflow

### Step 1: Get Releases and Top Errors

```bash
# See available releases
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh releases --limit 10

# See the most frequent unresolved errors
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --limit 10

# Or filter by specific release
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issues --release "mikopbx@2025.1.209-dev" --limit 10
```

Review the output: issue ID, title, event count, userCount, first/last seen.

### Step 2: Triage — Is It One Client or Many?

```bash
# Check tag breakdown to see affected servers/releases
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh tags <ISSUE_ID>

# List individual events to see server distribution
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh events <ISSUE_ID> --limit 20
```

**Key indicator**: `userCount` in issues list + `server_name` tag distribution.
- `userCount=1` → likely client-specific environment issue
- `userCount>5` → likely a real bug in our code

### Step 3: Get Issue Details

```bash
# Pick an issue ID from step 1
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issue <ISSUE_ID>
```

Review: culprit (function/file), tags, assignee, status.

### Step 4: Get Stacktrace

```bash
# Get the full stacktrace from the latest event
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh event <ISSUE_ID>
```

Identify the exception type, message, and code location. Note the release version and server name in stderr output.

### Step 5: Get Breadcrumbs for Context

```bash
# Understand what happened before the error
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh breadcrumbs <ISSUE_ID>
```

Review: SQL queries, HTTP requests, log messages leading to the error.

### Step 6: Find and Fix in Codebase

Use the stacktrace to locate the relevant source file:
```bash
# Search for the culprit function/class in the codebase
sg --pattern 'class ClassName' --lang php src/
```

### Step 7: Verify Fix

After deploying a fix, monitor:
```bash
# Check if the issue stopped recurring
./.claude/skills/sentry-analyzer/scripts/sentry-api.sh issue <ISSUE_ID>
```

## Error Classification Guide (MikoPBX)

### Real Bugs (Fix in Code)

| Pattern | Likely Cause | Where to Look |
|---------|--------------|---------------|
| `TypeError: Argument N passed to ... must be of the type string, null given` | Missing null-check before calling typed method | Controller/Provider passing unvalidated input |
| `Allowed memory size exhausted` in Worker | Unbounded query result set loaded into memory | Add LIMIT, use pagination or streaming |
| `JOB_TOO_BIG: job data exceeds server-enforced limit` | Beanstalk reply payload > 65535 bytes | Compress or chunk response, add LIMIT to queries |
| `Cache didn't return a valid resultset` | Redis cache corruption after MISCONF recovery | Add try-catch, clear cache on failure, retry without cache |
| `Call to undefined method` | Missing Phalcon model method | Model class or trait |
| `Class 'X' not found` | Missing autoload or module | ClassLoader.php or module config |

### Client Environment Issues (Not Our Bug)

| Pattern | Likely Cause | Indicator |
|---------|--------------|-----------|
| `Redis MISCONF ... save RDB snapshots` | Client disk full, Redis can't persist | `userCount=1-6`, check `server_name` tag |
| `SQLSTATE[HY000]: General error: 13 database or disk is full` | Client disk full | `userCount=1-2` |
| `SQLSTATE[HY000]: General error: 8 attempt to write a readonly database` | Disk/permissions issue | `userCount=1` |
| `Redis connection refused` / `Connection lost` | Redis service down | Often transient, check if recurring |
| `Beanstalk connection refused` | Beanstalkd crashed | `userCount=1` |
| `cURL error 56: Connection reset by peer` | Internal service restart | Transient, ignore if low count |

### Module Bugs (Report to Module Developer)

| Pattern | Indicator |
|---------|-----------|
| Culprit path contains `/custom_modules/Module*` | Third-party module code |
| JS error with `ModuleAmoCrm`, `ModuleBitrix24`, etc. | Frontend module bug |
| `Undefined array key` in module code | Missing validation in module |

## Search Query Syntax

Sentry supports structured search queries:

| Query | Description |
|-------|-------------|
| `is:unresolved` | Only unresolved issues |
| `is:resolved` | Only resolved issues |
| `level:error` | Only error-level events |
| `level:fatal` | Only fatal-level events |
| `release:mikopbx@2025.1.209-dev` | Filter by release |
| `filename:WorkerBase.php` | Events in specific file |
| `has:user` | Events with user context |
| `assigned:me` | Assigned to current user |
| `!is:resolved times_seen:>100` | Unresolved with 100+ events |
| `first_seen:>2025-01-01` | First seen after date |
| `last_seen:<24h` | Last seen within 24 hours |

Combine queries: `is:unresolved level:error filename:Worker`

## Troubleshooting

### Authentication Error

```
HTTP 401 Unauthorized
```

**Debugging steps:**
1. Verify token is set: `echo "Token: $SENTRY_TOKEN"`
2. Test with simple endpoint:
   ```bash
   curl -sk "https://sentry.miko.ru:8443/api/0/organizations/" \
     -H "Authorization: Bearer $SENTRY_TOKEN"
   ```
3. Check token scopes in Sentry UI (needs `project:read`, `event:read`, `issue:read`)
4. Verify token is not expired

### SSL Certificate Error

```
curl: (60) SSL certificate problem: self-signed certificate
```

**Cause:** Self-hosted Sentry with self-signed certificate.
**Fix:** The script uses `-sk` flag by default. If you see this error running curl manually, add `-k` flag.

### Empty Response

```
[]
```

**Cause:** No issues match the query (wrong org/project, no errors in period).
**Fix:**
1. Verify org and project: `./.claude/skills/sentry-analyzer/scripts/sentry-api.sh projects`
2. Use a different period: `--period 24h` or `--period 14d`
3. Remove query filters and check for any issues

### Organization/Project Not Found

```
{"detail": "The requested resource does not exist"}
```

**Fix:**
1. List available organizations: `./.claude/skills/sentry-analyzer/scripts/sentry-api.sh orgs`
2. List projects for the org: `./.claude/skills/sentry-analyzer/scripts/sentry-api.sh projects`
3. Set correct values: `export SENTRY_ORG=your-org SENTRY_PROJECT=your-project`

### Rate Limiting

```
HTTP 429 Too Many Requests
```

**Fix:** Wait 60 seconds and retry. Sentry rate limits API at ~100 requests/minute.

## Files

- `SKILL.md` - This documentation
- `scripts/sentry-api.sh` - Main API request script
- `reference/api-endpoints.md` - API endpoints reference

## See Also

- [teamcity-monitor skill](../teamcity-monitor/SKILL.md) - CI/CD pipeline monitoring
- [log-analyzer skill](../log-analyzer/SKILL.md) - Container log analysis
