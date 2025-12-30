---
name: teamcity-monitor
description: Мониторинг CI/CD пайплайна MikoPBX в TeamCity. Получение статусов сборок, анализ упавших тестов, доступ к логам и артефактам. Использовать после push в git или при анализе проблем сборки.
allowed-tools: Bash, Read, Grep
---

# TeamCity Build Pipeline Monitor

Monitor MikoPBX CI/CD pipeline status, analyze failed tests, and access build artifacts.

## What This Skill Does

- Checks build status across the entire pipeline (5 stages)
- Retrieves detailed information about failed tests with stack traces
- Downloads build logs for analysis
- Accesses test artifacts via SSH to build agent
- Provides actionable insights for fixing failures

## Pipeline Overview

```
T2NativeInDocker → IncrementBuild → 172163272img → RestAPITests
                                                 → TESTCASES (UI)
```

**Build Chain:**
1. `Mikopbx_T2NativeInDocker` - Base system build (T2 Linux)
2. `Mikopbx_IncrementBuild` - MikoPBX distribution build
3. `Mikopbx_172163272img` - Deploy to test server 172.16.32.72
4. `Mikopbx_RestAPITestsOn172163272` - REST API tests (pytest)
5. `MIKOPBX_TESTCASES` - UI tests (BrowserStack)

## Environment Requirements

```bash
# Required environment variable
TEAMCITY_TOKEN  # Bearer token for TeamCity API

# SSH access to build agent (for artifacts)
ssh mikoadmin@172.16.33.61
```

## Quick Commands

### Check All Build Statuses

```bash
TEAMCITY_URL="https://teamcity.miko.ru"

for bt in Mikopbx_T2NativeInDocker Mikopbx_IncrementBuild Mikopbx_172163272img Mikopbx_RestAPITestsOn172163272 MIKOPBX_TESTCASES; do
  echo "=== $bt ==="
  curl -s -H "Authorization: Bearer $TEAMCITY_TOKEN" -H "Accept: application/json" \
    "$TEAMCITY_URL/app/rest/builds?locator=buildType:(id:$bt),branch:develop,count:1&fields=build(id,number,status,state,statusText,finishDate)"
  echo
done
```

### Get Failed Tests Details

```bash
BUILD_ID=35133  # Replace with actual build ID

curl -s -H "Authorization: Bearer $TEAMCITY_TOKEN" -H "Accept: application/json" \
  "$TEAMCITY_URL/app/rest/testOccurrences?locator=build:(id:$BUILD_ID),status:FAILURE&fields=testOccurrence(name,status,details,duration)"
```

### Download Build Log

```bash
BUILD_ID=35133

curl -s -H "Authorization: Bearer $TEAMCITY_TOKEN" \
  "$TEAMCITY_URL/downloadBuildLog.html?buildId=$BUILD_ID" > build.log
```

## Analyzing Failed Tests

### Step 1: Get Build ID

```bash
# Get latest failed build for RestAPI tests
curl -s -H "Authorization: Bearer $TEAMCITY_TOKEN" -H "Accept: application/json" \
  "$TEAMCITY_URL/app/rest/builds?locator=buildType:(id:Mikopbx_RestAPITestsOn172163272),branch:develop,status:FAILURE,count:1&fields=build(id,number,statusText)"
```

### Step 2: Get Failed Test List

```bash
BUILD_ID=35133

curl -s -H "Authorization: Bearer $TEAMCITY_TOKEN" -H "Accept: application/json" \
  "$TEAMCITY_URL/app/rest/testOccurrences?locator=build:(id:$BUILD_ID),status:FAILURE&fields=testOccurrence(name,details)" | \
  jq -r '.testOccurrence[] | "❌ \(.name)\n\(.details)\n---"'
```

### Common Failure Patterns

| Error Pattern | Likely Cause | Action |
|---------------|--------------|--------|
| `database is locked` | Concurrent DB access | Check for parallel tests |
| `409 Conflict` | Duplicate entity | Clean test data or use unique IDs |
| `404 Not Found` | Resource deleted mid-test | Check test isolation |
| `AssertionError` | Logic/API response issue | Review test expectations |

## Accessing Build Agent Artifacts

SSH access provides direct access to test workspace.

### Find Work Directory

```bash
ssh mikoadmin@172.16.33.61 "cat /opt/buildagent/work/directory.map | grep RestAPI"
# Output: bt166=MIKOPBX::RestAPI tests -> a126da2f62f4ba7b
```

### Access Test Sources

```bash
WORK_DIR="a126da2f62f4ba7b"

# View specific test file
ssh mikoadmin@172.16.33.61 "cat /opt/buildagent/work/$WORK_DIR/Core/tests/api/test_09_custom_files.py"

# List test directory
ssh mikoadmin@172.16.33.61 "ls -la /opt/buildagent/work/$WORK_DIR/Core/tests/api/"
```

### Directory Structure on Agent

```
/opt/buildagent/work/
├── directory.map           # BuildType → directory mapping
├── a126da2f62f4ba7b/       # RestAPI tests workspace
│   └── Core/
│       └── tests/
│           ├── api/        # Python pytest tests
│           ├── AdminCabinet/  # PHP Selenium tests
│           └── pycalltests/   # SIP call tests
└── [other workspaces]/
```

## Common Workflows

### After Push: Check Pipeline Status

1. Wait 2-3 minutes for build chain to start
2. Run status check for all 5 buildTypes
3. If FAILURE, get failed tests details
4. Analyze error patterns and fix

### Debugging Specific Test Failure

1. Get build ID from status check
2. Retrieve failed test details with stack trace
3. SSH to agent to view full test source
4. Check test data setup and assertions

### Investigating Build Failure (not tests)

1. Download full build log
2. Search for "ERROR", "fatal error", "Aborted"
3. Check build step that failed
4. Review docker/compilation issues

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/app/rest/server` | GET | Server info and version |
| `/app/rest/builds?locator=...` | GET | Query builds |
| `/app/rest/testOccurrences?locator=...` | GET | Query test results |
| `/downloadBuildLog.html?buildId=X` | GET | Full build log |

### Useful Locators

```
buildType:(id:XXX)           # Filter by build configuration
branch:develop               # Filter by branch
status:FAILURE               # Only failed builds
count:1                      # Limit results
state:finished               # Only completed builds
```

## Troubleshooting

### Authentication Error

```
Invalid authentication request
```
**Fix:** Check `TEAMCITY_TOKEN` environment variable is set correctly.

### Empty Response

```
{"build":[]}
```
**Cause:** No builds match locator (wrong branch, no recent builds).
**Fix:** Try without branch filter or check buildType ID.

### SSH Connection Failed

```
Permission denied (publickey)
```
**Fix:** Ensure SSH key is added to `mikoadmin@172.16.33.61`.
