# Usage Examples

## Example 1: Get Container Info Before API Testing

```bash
$ .claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83

===================================
MikoPBX Container Info
===================================

Container: mikopbx_php83
Version: develop (API v3)

Network:
  IP Address: 192.168.117.2

Access URLs:
  API Endpoint: https://mikopbx_php83.localhost:8445/pbxcore/api/v3

Credentials:
  Username: admin
  Password: 123456789MikoPBX#1
```

Now you can use this info in your tests:
```python
# In pytest conftest.py or test file
MIKOPBX_API_URL = "https://192.168.117.2:8445/pbxcore/api/v3"
MIKOPBX_LOGIN = "admin"
MIKOPBX_PASSWORD = "123456789MikoPBX#1"
```

## Example 2: Restart Container After PHP Changes

```bash
# You modified src/PBXCoreREST/Controllers/Extensions/RestController.php

# Restart container and wait for all services
$ .claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --wait-services

🔄 Restarting container 'mikopbx_php83'...
✅ Container restart command sent
⏳ Waiting for container to start...
✅ Container is running

⏳ Waiting for services to be ready...

  PHP-FPM: ✅ Ready
  Redis: ✅ Ready
  Asterisk: ✅ Ready
  Web Interface: ✅ Ready

✅ All services are ready!

Container 'mikopbx_php83' restarted successfully

Access the web interface at:
  https://mikopbx_php83.localhost:8445
```

## Example 3: Restart API Worker After Minor Change

```bash
# You modified only WorkerApiCommands logic

# Quick worker restart (much faster than full container restart)
$ .claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 WorkerApiCommands

🔄 Restarting worker 'WorkerApiCommands' in 'mikopbx_php83'...
✅ Found worker process (PID: 1234)
📤 Sending SIGHUP signal...
✅ Worker restarted (new PID: 5678)

Worker 'WorkerApiCommands' restarted successfully
```

## Example 4: List All Running Workers

```bash
$ .claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 list

Scanning for running workers in 'mikopbx_php83'...

  ✅ WorkerApiCommands (PID: 5678)
  ✅ WorkerAMI (PID: 1245)
  ✅ WorkerCdr (PID: 1289)
  ✅ WorkerModelsEvents (PID: 1301)
  ✅ WorkerNotifyError (PID: 1315)
  ✅ WorkerSafeScripts (PID: 1329)
```

## Example 5: Compare API Versions

```bash
# Get info for both containers
$ .claude/skills/mikopbx-container-inspector/get-container-info.sh

# This shows both containers with their correct API paths

# Test same endpoint in both versions
$ curl -k https://192.168.117.2:8445/pbxcore/api/v3/extensions  # php83 (API v3)
$ curl -k https://192.168.117.3:8444/pbxcore/api/extensions     # php74 (API v1)
```

## Example 6: Playwright Browser Testing Setup

```bash
# Get web interface URL
$ .claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83

# Use the displayed URLs in your Playwright tests:
# - For faster tests without SSL: http://192.168.117.2:8081
# - For full HTTPS test: https://mikopbx_php83.localhost:8445
```

Then in your Playwright code:
```javascript
// Navigate to web interface
await page.goto('http://192.168.117.2:8081');

// Login
await page.fill('[name="login"]', 'admin');
await page.fill('[name="password"]', '123456789MikoPBX#1');
await page.click('button[type="submit"]');
```

## Example 7: Quick Health Check

```bash
# Check if all services are running
$ .claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --no-wait

# This just restarts without waiting, very quick

# Then verify services manually:
$ docker exec mikopbx_php83 pgrep php-fpm
$ docker exec mikopbx_php83 redis-cli ping
$ docker exec mikopbx_php83 asterisk -rx "core show version"
```

## Example 8: Debugging Container Issues

```bash
# Container not responding? Get current status
$ .claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83

# Check which workers are running
$ .claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 list

# Full restart with service wait
$ .claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --wait-services

# Check logs
$ docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/system/messages
```

## Example 9: Switching Between Containers for Testing

```bash
# Test feature in develop version
$ curl -k -X POST https://192.168.117.2:8445/pbxcore/api/v3/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"number": "201", "username": "John"}'

# Compare with old version behavior
$ curl -k -X POST https://192.168.117.3:8444/pbxcore/api/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"number": "201", "username": "John"}'
```

## Example 10: Integration with Testing Workflow

```bash
#!/bin/bash
# test-my-changes.sh

# 1. Get container info
echo "Getting container info..."
.claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83 > /tmp/container-info.txt

# 2. Restart container after changes
echo "Restarting container..."
.claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --wait-services

# 3. Run tests
echo "Running API tests..."
pytest tests/api/test_extensions_api.py -v

# 4. Check results
echo "Test complete!"
```
