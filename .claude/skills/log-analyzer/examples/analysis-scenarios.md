# Log Analysis Scenarios

Real-world examples of analyzing MikoPBX logs for common issues.

## Scenario 1: API Request Failed

**Situation:** User reports API request is failing with 500 error.

### Investigation Steps

#### Step 1: Check WorkerApiCommands logs

```bash
CONTAINER_ID=$(./.claude/scripts/get-container-name.sh)
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands
```

**Look for:**
- Request received from Redis queue
- Processing started
- Any errors during execution

#### Step 2: Check PHP errors

```bash
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/php/error.log
```

**Look for:**
- Fatal errors
- Undefined variables
- Function call errors
- Database errors

#### Step 3: Check nginx access log

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/nginx/access.log | grep "POST /pbxcore/api"
```

**Look for:**
- Request received by nginx
- HTTP status code (should be 500)
- Request path and method

#### Step 4: Correlate by timestamp

Find all events around the same time:

```bash
# Get timestamp from nginx log
TIMESTAMP="2025-10-20 06:52"

# Check all logs for that time
docker exec $CONTAINER_ID grep "$TIMESTAMP" /storage/usbdisk1/mikopbx/log/system/messages
docker exec $CONTAINER_ID grep "$TIMESTAMP" /storage/usbdisk1/mikopbx/log/php/error.log
```

### Common Findings

**Request Flow:**
1. ✅ Request received by nginx → `/nginx/access.log`
2. ✅ Request queued to Redis → `/system/messages`
3. ✅ WorkerApiCommands picks up request → `/system/messages`
4. ❌ PHP Fatal Error during execution → `/php/error.log`
5. ❌ Response sent with 500 status → `/nginx/access.log`

**Typical Errors:**
- Undefined variable in action handler
- Database constraint violation
- Missing required parameter
- Method not implemented

---

## Scenario 2: Worker Process Crashed

**Situation:** Worker process is not running, system logs show crash.

### Investigation Steps

#### Step 1: Check if worker is running

```bash
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands
```

**Expected:** 3 instances running
**If less:** Worker crashed

#### Step 2: Check system logs for crash

```bash
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "WorkerApiCommands|terminated|crash|orphan"
```

**Look for:**
- "Process terminated unexpectedly"
- "Orphaned process detected"
- Last message before crash

#### Step 3: Check for PHP fatal errors

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log | grep -i fatal
```

**Look for:**
- Fatal error around crash time
- Memory exhaustion
- Segmentation fault

#### Step 4: Check process status before crash

```bash
# Find PID from crash message
PID=1639

# Find last messages from that PID
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep "\[$PID\]"
```

### Common Findings

**Crash Patterns:**

1. **Fatal PHP Error:**
   ```
   [20-Oct-2025 06:52:15] Fatal error: Allowed memory size of 134217728 bytes exhausted
   Process WorkerApiCommands[1639] terminated unexpectedly
   ```

2. **Segmentation Fault:**
   ```
   Process WorkerApiCommands[1639] terminated with signal 11 (SIGSEGV)
   ```

3. **Orphaned Process:**
   ```
   Orphaned process detected: WorkerApiCommands[1639]
   Parent process php.backend[1600] not found
   ```

**Recovery:**
- Worker usually auto-restarts
- Check if new instance is running
- Monitor for recurring crashes

---

## Scenario 3: Slow Performance

**Situation:** System is slow, API requests timing out.

### Investigation Steps

#### Step 1: Check for slow queries

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log | grep -i "slow"
```

**Look for:**
- Queries taking > 1 second
- Full table scans
- Missing indexes

#### Step 2: Check process CPU/Memory

```bash
# Top CPU consumers
docker exec $CONTAINER_ID ps aux --sort=-%cpu | head -10

# Top memory consumers
docker exec $CONTAINER_ID ps aux --sort=-%mem | head -10
```

**Look for:**
- Processes using > 50% CPU
- Processes using > 100 MB memory
- Zombie processes

#### Step 3: Check for warnings

```bash
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "slow|timeout|delay"
```

**Look for:**
- Slow query warnings
- Timeout messages
- Delay notifications

#### Step 4: Check worker queue depth

```bash
# Check Redis queue length (if enabled)
docker exec $CONTAINER_ID redis-cli LLEN WorkerApiCommands
```

**Look for:**
- Queue backlog > 100 = slow processing
- Growing queue = workers can't keep up

### Common Findings

**Performance Issues:**

1. **Slow Database Query:**
   ```
   Slow query detected: SELECT * FROM Extensions (2.3s)
   ```
   **Solution:** Add index, optimize query

2. **High CPU Process:**
   ```
   WorkerCdr consuming 85% CPU
   ```
   **Solution:** Check for infinite loop, optimize code

3. **Memory Leak:**
   ```
   php-fpm memory usage: 250 MB (growing)
   ```
   **Solution:** Restart service, find leak

4. **Queue Backlog:**
   ```
   WorkerApiCommands queue depth: 450 requests
   ```
   **Solution:** Scale workers, optimize processing

---

## Scenario 4: Database Errors

**Situation:** Database constraint violations or lock errors.

### Investigation Steps

#### Step 1: Check system logs for DB errors

```bash
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "database|sqlite|constraint"
```

**Look for:**
- UNIQUE constraint violations
- Foreign key errors
- Database locked messages

#### Step 2: Check query logs if enabled

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log
```

**Look for:**
- Failed queries
- Query that caused constraint violation
- Long-running transactions

#### Step 3: Check PHP errors

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log | grep -iE "database|pdo|sql"
```

**Look for:**
- PDO exceptions
- SQL syntax errors
- Connection failures

### Common Findings

**Database Error Types:**

1. **UNIQUE Constraint Violation:**
   ```
   UNIQUE constraint failed: Extensions.number
   Attempted to create extension with duplicate number: 201
   ```
   **Cause:** Duplicate data insertion
   **Solution:** Validate input, check existing records

2. **Foreign Key Error:**
   ```
   FOREIGN KEY constraint failed
   Cannot delete provider: referenced by outbound routes
   ```
   **Cause:** Attempting to delete referenced record
   **Solution:** Delete dependent records first

3. **Database Locked:**
   ```
   Database is locked
   Another process has exclusive lock
   ```
   **Cause:** Concurrent write operations
   **Solution:** Retry with backoff, check for long transactions

4. **Corrupted Database:**
   ```
   Database disk image is malformed
   ```
   **Cause:** Improper shutdown, disk errors
   **Solution:** Restore from backup, run integrity check

---

## Scenario 5: Asterisk Call Issues

**Situation:** Calls are failing, not connecting properly.

### Investigation Steps

#### Step 1: Check Asterisk errors

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/asterisk/error
```

**Look for:**
- Registration failures
- Codec errors
- Configuration errors

#### Step 2: Check verbose call logs

```bash
# Replace 201 with extension number
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/asterisk/verbose | grep "201"
```

**Look for:**
- Call flow (dial, answer, hangup)
- Error messages during call
- Codec negotiation

#### Step 3: Check security log

```bash
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/asterisk/security_log
```

**Look for:**
- Failed authentication attempts
- Rejected calls
- Banned IPs

### Common Findings

**Call Issues:**

1. **Registration Failure:**
   ```
   Registration from '201' failed for '192.168.1.100' - Wrong password
   ```
   **Solution:** Check credentials, update secret

2. **Codec Negotiation Error:**
   ```
   No compatible codecs between endpoints
   Extension supports: ulaw, alaw
   Provider supports: g729
   ```
   **Solution:** Enable compatible codec

3. **Call Routing Error:**
   ```
   No route found for number: +1234567890
   ```
   **Solution:** Check outbound routes, dial plan

4. **Authentication Failure:**
   ```
   Failed to authenticate device '201'
   IP: 192.168.1.100 has been banned
   ```
   **Solution:** Unban IP, fix credentials

---

## Scenario 6: Configuration Reload Issues

**Situation:** Configuration changes not applying, Asterisk not reloading.

### Investigation Steps

#### Step 1: Check reload actions

```bash
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "Reload|reload|ReloadAction"
```

**Look for:**
- Reload action triggered
- Reload completion
- Errors during reload

#### Step 2: Check WorkerModelsEvents

```bash
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerModelsEvents
```

**Look for:**
- Model change detected
- Reload sequence started
- Worker processing reload

#### Step 3: Check Asterisk reload

```bash
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/asterisk/messages | grep reload
```

**Look for:**
- Reload command received
- Configuration reloaded successfully
- Errors in configuration

### Common Findings

**Reload Issues:**

1. **Reload Not Triggered:**
   ```
   Model updated: Extensions
   WorkerModelsEvents: No reload needed for this change
   ```
   **Cause:** Minor change doesn't require reload
   **Solution:** Manually reload if needed

2. **Reload Sequence:**
   ```
   [06:52:10] Model changed: Extensions
   [06:52:11] WorkerModelsEvents: Triggering reload
   [06:52:12] Generating Asterisk configuration
   [06:52:15] Asterisk reload initiated
   [06:52:17] Asterisk reload completed
   ```
   **Normal flow:** 5-10 seconds total

3. **Reload Failed:**
   ```
   Asterisk reload failed: configuration error
   Error parsing extensions.conf line 42
   ```
   **Solution:** Fix configuration syntax error

4. **Slow Reload:**
   ```
   [06:52:10] Reload started
   [06:53:30] Reload still in progress...
   ```
   **Cause:** Large configuration, many extensions
   **Solution:** Optimize config generation, check for locks

---

## Analysis Best Practices

### 1. Start Broad, Then Narrow

✅ **Good approach:**
1. Check system log first (overview)
2. Filter for errors (narrow down)
3. Check specific component logs (details)
4. Correlate by timestamp (connections)

### 2. Use Timeline Analysis

Reconstruct event sequence:

```
[06:52:10] User sends API request
[06:52:11] WorkerApiCommands receives request
[06:52:12] Database query executed
[06:52:13] UNIQUE constraint violated
[06:52:14] PHP exception thrown
[06:52:15] Response sent with 500 status
```

### 3. Check All Related Components

For API issue, check:
- System messages (worker activity)
- PHP error log (execution errors)
- Nginx logs (request/response)
- Database queries (if enabled)

### 4. Look for Patterns

Single error = isolated issue
Repeated errors = systemic problem

```bash
# Count error occurrences
docker exec $CONTAINER_ID grep -c "UNIQUE constraint" /storage/usbdisk1/mikopbx/log/system/messages
```

### 5. Document Findings

Structure your analysis:
- What happened
- When it happened
- What caused it
- How to fix it
- How to prevent it
