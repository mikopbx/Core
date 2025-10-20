# mikopbx-docker-restart-tester

Automatically restart MikoPBX Docker container after code changes and run comprehensive tests with schema validation enabled.

## When to Use This Skill

Use this skill automatically whenever:
- PHP code in `src/` directory is modified
- JavaScript code is transpiled
- Configuration files are changed
- User explicitly requests testing after changes
- Before running any API tests to ensure latest code is active

## What This Skill Does

1. **Detects code changes** that require container restart
2. **Safely restarts the container** with proper wait times
3. **Enables schema validation mode** (SCHEMA_VALIDATION_STRICT=1)
4. **Waits for services to be ready** (Asterisk, Redis, PHP-FPM)
5. **Runs appropriate tests** based on what was changed
6. **Reports results** with detailed logs

## Critical Understanding

⚠️ **IMPORTANT**: MikoPBX runs PHP code inside a Docker container. Any changes to PHP files in your local `/Users/nb/PhpstormProjects/mikopbx/Core/src/` directory are NOT immediately active. The container must be restarted for changes to take effect.

### Files That Require Container Restart

- Any PHP file in `src/` directory
- Configuration files in `resources/`
- System scripts
- Phalcon templates in `src/AdminCabinet/Views/`

### Files That DON'T Require Container Restart

- JavaScript source files (after transpilation, the transpiled files are loaded dynamically)
- CSS files
- Documentation files
- Test files themselves

## Usage Instructions

### Automatic Activation

This skill should activate automatically when you:
1. Edit PHP code in src/
2. User says "test this" or "run tests"
3. User asks "did it work?" after making changes
4. Before running pytest tests

### Manual Activation

User can explicitly invoke: "Restart container and run tests"

### Workflow

When activated, follow these steps:

#### Step 1: Detect What Changed
```bash
# Check git status for modified files
git status --short
```

Determine:
- Were PHP files modified? → Need restart
- Were JS files modified? → Check if transpiled
- What component was changed? → Run specific tests

#### Step 2: Find Docker Container
```bash
# Find MikoPBX container
docker ps --filter "ancestor=mikopbx/mikopbx" --format "{{.ID}}"

# Or by name pattern
docker ps | grep mikopbx | awk '{print $1}'
```

Store container ID for subsequent commands.

#### Step 3: Enable Schema Validation
```bash
# Check current setting
docker exec <container_id> env | grep SCHEMA_VALIDATION_STRICT

# Enable if not set (this persists across restarts if set in docker-compose)
# Note: This should be set in docker-compose.yml or .env file
# If not set, warn the user to add it to docker-compose.yml:
# environment:
#   - SCHEMA_VALIDATION_STRICT=1
```

#### Step 4: Restart Container
```bash
# Graceful restart
docker restart <container_id>

# Wait for container to be back up
sleep 5

# Verify container is running
docker ps | grep <container_id>
```

#### Step 5: Wait for Services
Critical services must be ready before testing:

```bash
# Wait for PHP-FPM
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec <container_id> pgrep php-fpm > /dev/null; then
        echo "PHP-FPM is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

# Wait for Asterisk
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec <container_id> asterisk -rx "core show version" > /dev/null 2>&1; then
        echo "Asterisk is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

# Wait for Redis
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec <container_id> redis-cli ping > /dev/null 2>&1; then
        echo "Redis is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

# Wait for web interface
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -k -s https://mikopbx_php83.localhost:8445 > /dev/null 2>&1; then
        echo "Web interface is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done
```

#### Step 6: Verify Schema Validation is Active
```bash
# Check that SCHEMA_VALIDATION_STRICT is enabled
docker exec <container_id> env | grep SCHEMA_VALIDATION_STRICT=1

# If not enabled, warn the user
if [ $? -ne 0 ]; then
    echo "⚠️  WARNING: SCHEMA_VALIDATION_STRICT is not enabled!"
    echo "Schema validation tests will not run properly."
    echo "Add to docker-compose.yml:"
    echo "  environment:"
    echo "    - SCHEMA_VALIDATION_STRICT=1"
fi
```

#### Step 7: Run Appropriate Tests
Based on what was changed, run specific test suites:

```bash
# If Extensions code changed
pytest tests/api/test_extensions_api.py -v

# If Providers code changed
pytest tests/api/test_providers_api.py -v

# If IncomingRoutes code changed
pytest tests/api/test_incoming_routes_api.py -v

# If multiple components changed or unsure
pytest tests/api/ -v

# For Playwright tests (web UI)
# These are run via MCP Playwright tools, not directly
```

#### Step 8: Monitor Logs During Tests
Keep tailing logs in background to catch errors:

```bash
# PHP errors
docker exec <container_id> tail -f /storage/usbdisk1/mikopbx/log/php/error.log &

# System messages
docker exec <container_id> tail -f /storage/usbdisk1/mikopbx/log/system/messages &

# Asterisk logs (if testing call-related features)
docker exec <container_id> tail -f /storage/usbdisk1/mikopbx/log/asterisk/messages &
```

#### Step 9: Report Results
After tests complete, report:

1. **Test Summary**:
   - Total tests run
   - Passed / Failed / Skipped
   - Execution time

2. **Any Failures**:
   - Test name
   - Failure reason
   - Relevant log excerpts

3. **Schema Validation**:
   - Confirm schema validation was active
   - Any schema mismatches detected

4. **Next Steps**:
   - If tests passed: "✅ All tests passed. Changes are working correctly."
   - If tests failed: "❌ Tests failed. Review failures above and check logs."

## Complete Example Script

Here's a complete script you can generate and run:

```bash
#!/bin/bash

# mikopbx-docker-restart-tester.sh
# Restart MikoPBX container and run tests with schema validation

set -e

echo "🔍 Finding MikoPBX container..."
CONTAINER_ID=$(docker ps --filter "ancestor=mikopbx/mikopbx" --format "{{.ID}}" | head -1)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ ERROR: MikoPBX container not found"
    exit 1
fi

echo "📦 Found container: $CONTAINER_ID"

# Check schema validation setting
echo "🔧 Checking schema validation mode..."
if docker exec $CONTAINER_ID env | grep -q "SCHEMA_VALIDATION_STRICT=1"; then
    echo "✅ Schema validation is enabled"
else
    echo "⚠️  WARNING: Schema validation is NOT enabled"
    echo "   Add to docker-compose.yml:"
    echo "   environment:"
    echo "     - SCHEMA_VALIDATION_STRICT=1"
fi

# Restart container
echo "🔄 Restarting container..."
docker restart $CONTAINER_ID

echo "⏳ Waiting for container to start..."
sleep 5

# Wait for services
echo "⏳ Waiting for PHP-FPM..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec $CONTAINER_ID pgrep php-fpm > /dev/null 2>&1; then
        echo "✅ PHP-FPM is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "❌ ERROR: PHP-FPM failed to start"
    exit 1
fi

echo "⏳ Waiting for Asterisk..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec $CONTAINER_ID asterisk -rx "core show version" > /dev/null 2>&1; then
        echo "✅ Asterisk is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "⚠️  WARNING: Asterisk not responding"
fi

echo "⏳ Waiting for Redis..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec $CONTAINER_ID redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "❌ ERROR: Redis failed to start"
    exit 1
fi

echo "⏳ Waiting for web interface..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -k -s https://mikopbx_php83.localhost:8445 > /dev/null 2>&1; then
        echo "✅ Web interface is ready"
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo "❌ ERROR: Web interface not responding"
    exit 1
fi

echo ""
echo "✅ All services are ready!"
echo ""

# Determine what to test based on git changes
echo "🔍 Detecting changes..."
CHANGED_FILES=$(git status --short | awk '{print $2}')

RUN_EXTENSIONS=0
RUN_PROVIDERS=0
RUN_INCOMING_ROUTES=0
RUN_ALL=0

for file in $CHANGED_FILES; do
    if [[ $file == *"Extensions"* ]]; then
        RUN_EXTENSIONS=1
    elif [[ $file == *"Providers"* ]]; then
        RUN_PROVIDERS=1
    elif [[ $file == *"IncomingRoutes"* ]]; then
        RUN_INCOMING_ROUTES=1
    fi
done

# If no specific component detected, run all tests
if [ $RUN_EXTENSIONS -eq 0 ] && [ $RUN_PROVIDERS -eq 0 ] && [ $RUN_INCOMING_ROUTES -eq 0 ]; then
    RUN_ALL=1
fi

echo "📋 Test plan:"
[ $RUN_EXTENSIONS -eq 1 ] && echo "  - Extensions API tests"
[ $RUN_PROVIDERS -eq 1 ] && echo "  - Providers API tests"
[ $RUN_INCOMING_ROUTES -eq 1 ] && echo "  - IncomingRoutes API tests"
[ $RUN_ALL -eq 1 ] && echo "  - All API tests"
echo ""

# Run tests
echo "🧪 Running tests..."

if [ $RUN_EXTENSIONS -eq 1 ]; then
    pytest tests/api/test_extensions_api.py -v
fi

if [ $RUN_PROVIDERS -eq 1 ]; then
    pytest tests/api/test_providers_api.py -v
fi

if [ $RUN_INCOMING_ROUTES -eq 1 ]; then
    pytest tests/api/test_incoming_routes_api.py -v
fi

if [ $RUN_ALL -eq 1 ]; then
    pytest tests/api/ -v
fi

echo ""
echo "✅ Testing complete!"
echo ""

# Check for recent errors in logs
echo "📋 Checking recent logs for errors..."
echo ""
echo "=== PHP Errors (last 20 lines) ==="
docker exec $CONTAINER_ID tail -20 /storage/usbdisk1/mikopbx/log/php/error.log

echo ""
echo "=== System Messages (last 20 lines, filtered for errors) ==="
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error | tail -20

echo ""
echo "✅ Done!"
```

## Important Behaviors

### Always Restart When:
- User modifies PHP files in src/
- User runs tests after code changes
- User says "test my changes"
- Before running pytest tests

### Never Restart When:
- Only documentation was changed
- Only test files were modified
- User is just reading code
- User explicitly says "don't restart"

### Always Enable Schema Validation:
- Check before every test run
- Warn if not enabled
- Guide user to enable it in docker-compose.yml

### Always Wait for Services:
- Don't run tests until all services are ready
- Use proper timeouts
- Fail gracefully if services don't start

## Error Handling

### Container Not Found
```
❌ ERROR: MikoPBX container not found

Please start the container first:
  docker-compose up -d
```

### Container Failed to Restart
```
❌ ERROR: Container failed to restart

Check docker logs:
  docker logs <container_id>
```

### Services Not Ready
```
❌ ERROR: PHP-FPM failed to start after 60 seconds

Check container logs:
  docker exec <container_id> tail -100 /storage/usbdisk1/mikopbx/log/system/messages
```

### Tests Failed
```
❌ Tests failed: 3 passed, 2 failed

Failed tests:
  - test_create_extension_with_invalid_number
  - test_update_extension_nonexistent

Check logs for details:
  docker exec <container_id> tail -100 /storage/usbdisk1/mikopbx/log/php/error.log
```

## Integration with Other Skills

### Works With mikopbx-api-test-generator:
1. User asks to generate tests
2. mikopbx-api-test-generator creates test file
3. **This skill automatically runs** to restart container and run the new tests

### Works With mikopbx-endpoint-validator:
1. User makes API code changes
2. **This skill restarts container**
3. mikopbx-endpoint-validator checks schema compliance

## Reporting Template

After running tests, always report in this format:

```
🔄 Container Restart & Test Results
===================================

📦 Container: <container_id>
✅ Status: Restarted successfully
⏱️  Ready time: 15 seconds

🔧 Schema Validation: ✅ Enabled (SCHEMA_VALIDATION_STRICT=1)

🧪 Tests Run:
   • Extensions API: 15 tests
   • Providers API: 12 tests
   • Total: 27 tests

📊 Results:
   ✅ Passed: 25
   ❌ Failed: 2
   ⏭️  Skipped: 0
   ⏱️  Duration: 45.3s

❌ Failures:
   1. test_create_extension_with_invalid_number (test_extensions_api.py:145)
      AssertionError: Expected 400, got 500

   2. test_update_nonexistent_provider (test_providers_api.py:203)
      AssertionError: Expected 404, got 500

📋 Recent Errors:
   [PHP] Line 123 in SaveRecordAction.php: Undefined variable $defaultValue
   [System] WorkerApiCommands: Failed to validate payload

💡 Next Steps:
   - Fix undefined variable in SaveRecordAction.php:123
   - Add default value initialization
   - Re-run tests after fix
```

## Pro Tips

1. **Always restart before tests** - Don't trust that changes are active
2. **Wait for ALL services** - PHP alone isn't enough, Asterisk and Redis must be ready
3. **Monitor logs during tests** - Errors often appear in logs before test failures
4. **Schema validation is critical** - Always verify it's enabled
5. **Be patient** - Container restart + service startup can take 20-30 seconds

## Special Notes for MikoPBX

- **Container restart is fast** - Usually 5-10 seconds for container, 10-20 seconds for all services
- **SQLite database persists** - No data loss on restart
- **Sessions are lost** - Web UI users will need to re-login
- **Asterisk calls drop** - Don't restart during active testing of call features
- **Redis queue clears** - Pending jobs in queue are lost on restart

## Default Container Configuration

- **Container name pattern**: Usually contains "mikopbx"
- **Image**: `mikopbx/mikopbx` or custom build
- **Default URL**: `https://mikopbx_php83.localhost:8445`
- **Default credentials**:
  - Username: `admin`
  - Password: `123456789MikoPBX#1`

## Environment Variables to Check

Always verify these are set:
```bash
SCHEMA_VALIDATION_STRICT=1  # Critical for schema validation tests
DB_PATH=/cf/conf/mikopbx.db  # Database location
```

## Success Criteria

Consider the test run successful only when:
1. ✅ Container restarted without errors
2. ✅ All services (PHP-FPM, Asterisk, Redis) are ready
3. ✅ Schema validation is enabled
4. ✅ All tests passed
5. ✅ No errors in PHP error log
6. ✅ No critical errors in system log

If any criteria fails, report it clearly and provide actionable next steps.
