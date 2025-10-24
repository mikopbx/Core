---
name: log-analyzer
description: Анализ логов Docker контейнера для диагностики проблем и мониторинга здоровья системы. Использовать при отладке ошибок, отслеживании процессов воркеров, исследовании проблем API или мониторинге поведения системы после тестов.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX Log Analyzing

Efficiently analyze logs inside MikoPBX Docker container to diagnose issues, monitor processes, and track system behavior.

## What This Skill Does

- Intelligently searches logs based on problem context
- Identifies relevant log files for each issue type
- Filters noise to show only relevant entries
- Correlates logs across multiple files
- Tracks worker processes and their status
- Provides actionable insights from log analysis
- **Works with both host-mounted logs and docker exec for flexibility**

## Host Log Access (Faster)

For local development, logs are mounted on the host at:
```
/Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/
```

**Advantages of host access:**
- ✅ Faster (no docker exec overhead)
- ✅ Can use Read tool directly
- ✅ Can use Grep tool with full power
- ✅ Better for large log files

**When to use host path:**
- Analyzing large log files
- Complex grep patterns
- Multiple log file analysis
- Performance-critical operations

## When to Use This Skill

Use this skill when:
- User reports an error or issue
- Need to diagnose API problems
- Tracking specific worker processes
- Investigating system behavior
- User asks "check logs" or "what's in the logs?"
- After tests fail (to find root cause)
- Monitoring real-time system activity

## Quick Start

### Step 1: Choose Access Method

**Option A: Host Path (Recommended for analysis)**
```bash
# Direct access to logs (faster)
HOST_LOG_PATH="/Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log"

# Use Grep tool
# Pattern: errors in system log
# Path: $HOST_LOG_PATH/system/messages

# Or use Read tool for specific log files
```

**Option B: Docker Exec (Needed for process checks)**
```bash
# Find MikoPBX container (needed for worker checks)
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}' | head -1)
```

**Quick Decision Guide:**
- **Log file analysis** → Use host path with Grep/Read tools
- **Process/worker checks** → Use docker exec with Bash
- **Real-time monitoring** → Use docker exec with tail -f

### Step 2: Determine Log Context

Based on issue type, select appropriate logs:

**API Issues:**
- System messages (WorkerApiCommands)
- PHP error log
- Nginx logs

**Call Issues:**
- Asterisk messages/error/verbose
- Security log

**Database Issues:**
- System messages
- Debug query logs (if enabled)

**Worker Issues:**
- System messages (filter by worker name)
- Process status

### Step 3: Execute Analysis

Use targeted search patterns (see [search-patterns.md](reference/search-patterns.md)):

```bash
# Recent errors
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Specific worker
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Real-time monitoring
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages
```

## Top 5 Common Verification Patterns

### Pattern 1: Recent System Errors

**When to use:** First step in diagnosing any issue

**Method A: Host Path (Recommended)**
```bash
# Use Grep tool
# Pattern: error
# Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/system/messages
# Options: -i (case insensitive), -C 2 (2 lines context)
```

**Method B: Docker Exec**
```bash
# Get last 500 lines, filter errors
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error
```

**What to look for:**
- Error timestamps (correlation)
- Error frequency (isolated vs recurring)
- Component name (which part failed)
- PID (which process)

**Common findings:**
- PHP fatal errors
- Database constraint violations
- Worker crashes
- Memory exhaustion

---

### Pattern 2: API Request Debugging

**When to use:** API request fails or returns unexpected result

**Method A: Host Path (Recommended)**
```bash
# Use Grep tool for WorkerApiCommands activity
# Pattern: WorkerApiCommands
# Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/system/messages

# Use Read tool for PHP errors (recent)
# Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/php/error.log
# Offset: calculate from file size
# Limit: 50

# Use Grep for nginx access
# Pattern: POST /pbxcore/api
# Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/nginx/access.log
```

**Method B: Docker Exec**
```bash
# Check WorkerApiCommands activity
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Check PHP errors
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/php/error.log

# Check nginx access log
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/nginx/access.log | grep "POST /pbxcore/api"
```

**What to look for:**
1. Request received by nginx
2. Request queued to Redis
3. WorkerApiCommands processing
4. PHP errors during execution
5. Response status code

**Expected flow:**
```
[06:52:10] nginx: POST /pbxcore/api/v3/extensions
[06:52:11] WorkerApiCommands: Processing request
[06:52:12] WorkerApiCommands: Executing SaveRecordAction
[06:52:13] WorkerApiCommands: Response sent (200 OK)
```

See [analysis-scenarios.md](examples/analysis-scenarios.md#scenario-1-api-request-failed) for detailed example.

---

### Pattern 3: Worker Process Monitoring

**When to use:** Worker not responding, system seems stuck

```bash
# Check if worker is running
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands

# Check for crashes
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "WorkerApiCommands|terminated|crash"

# Count instances
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands | grep -v grep | wc -l
```

**Expected:** WorkerApiCommands should have 3 instances

**What to look for:**
- Process terminated messages
- Orphaned process warnings
- Fatal PHP errors
- Last activity before crash

**Common issues:**
- Worker crashed (0 instances)
- Too many workers (restart loop)
- Zombie processes

See [worker-processes.md](reference/worker-processes.md) for complete worker reference.

---

### Pattern 4: Database Error Investigation

**When to use:** Constraint violations, lock errors, data inconsistency

```bash
# Check for database errors
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "database|sqlite|constraint"

# Check PHP PDO errors
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log | grep -iE "database|pdo|sql"
```

**Common errors:**
- `UNIQUE constraint failed: Extensions.number` - Duplicate data
- `FOREIGN KEY constraint failed` - Invalid reference
- `Database is locked` - Concurrent access
- `Database disk image is malformed` - Corruption

**Investigation steps:**
1. Identify which query failed
2. Check input data for duplicates/invalids
3. Verify foreign key references exist
4. Check for long-running transactions

See [analysis-scenarios.md](examples/analysis-scenarios.md#scenario-4-database-errors) for detailed troubleshooting.

---

### Pattern 5: Real-Time Activity Monitoring

**When to use:** Need to see what's happening right now

```bash
# Follow system log
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Follow with error filter
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Follow specific worker
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands
```

**Use cases:**
- Monitor API request processing
- Watch worker activity
- See errors as they occur
- Debug timing issues

**Pro tip:** Press Ctrl+C to stop monitoring when done.

---

## Critical Log Files

### Host Paths (Fast Access)

```bash
# Log base directory on host
HOST_LOG_BASE="/Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log"

# PRIMARY: Main system log
${HOST_LOG_BASE}/system/messages

# PHP errors
${HOST_LOG_BASE}/php/error.log

# Asterisk errors
${HOST_LOG_BASE}/asterisk/error

# Web server errors
${HOST_LOG_BASE}/nginx/error.log

# Fail2ban logs
${HOST_LOG_BASE}/fail2ban/fail2ban.log
```

### Container Paths (For docker exec)

```bash
# PRIMARY: Main system log
/storage/usbdisk1/mikopbx/log/system/messages

# PHP errors
/storage/usbdisk1/mikopbx/log/php/error.log

# Asterisk errors
/storage/usbdisk1/mikopbx/log/asterisk/error

# Web server errors
/storage/usbdisk1/mikopbx/log/nginx/error.log
```

### Quick Access Commands

**Using Host Path (Faster)**
```bash
# Check recent errors in system log
# Use Grep tool:
#   Pattern: error
#   Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/system/messages
#   Options: -i -C 2

# Read PHP error log
# Use Read tool:
#   Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/php/error.log

# Search for specific pattern
# Use Grep tool:
#   Pattern: WorkerApiCommands
#   Path: /Users/nb/PhpstormProjects/mikopbx/dev_docker/tmp/projects/main/storage/usbdisk1/mikopbx/log/system/messages
```

**Using Docker Exec (For processes)**
```bash
# Find container
docker ps | grep mikopbx

# Tail system log
docker exec <id> tail -100 /storage/usbdisk1/mikopbx/log/system/messages

# Tail errors only
docker exec <id> tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Check PHP errors
docker exec <id> tail -50 /storage/usbdisk1/mikopbx/log/php/error.log

# Check workers (MUST use docker exec)
docker exec <id> ps aux | grep Worker
```

## Output Format

Always structure log analysis output clearly:

```
📋 Log Analysis: <Component/Issue>
==================================

🔍 Search Criteria:
   • Log file: /path/to/log
   • Time range: HH:MM - HH:MM
   • Pattern: <search pattern>
   • Lines analyzed: N

📊 Summary:
   • Total lines: N
   • Errors: N
   • Warnings: N

❌ Errors Found (N):

1. [HH:MM:SS] Error Type
   Location: File.php:line
   Message: Error description
   Process: WorkerName[PID]

2. [HH:MM:SS] Error Type
   ...

⚠️  Warnings Found (top 5):

1. [HH:MM:SS] Warning description
2. ...

🔄 Process Status:

WorkerApiCommands:
   ✅ Running (3 instances)
   PIDs: 1637, 1639, 1641

💡 Analysis:

<interpretation of findings>

🎯 Recommendations:

1. Fix X in File.php:line
2. Check Y in database
3. Monitor Z
```

## Additional Resources

### Complete References

- **[Log Structure Reference](reference/log-structure.md)** - All log files, formats, and locations
- **[Worker Processes Reference](reference/worker-processes.md)** - Complete worker and service list
- **[Search Patterns Reference](reference/search-patterns.md)** - All grep patterns and search techniques

### Practical Examples

- **[Analysis Scenarios](examples/analysis-scenarios.md)** - 6 common troubleshooting scenarios with step-by-step analysis

### Quick References

**Log Locations:**
```
/storage/usbdisk1/mikopbx/log/
├── system/messages      # Main system log
├── php/error.log        # PHP errors
├── asterisk/error       # Asterisk errors
├── nginx/error.log      # Web errors
└── fail2ban/fail2ban.log # Security
```

**Common Workers:**
- WorkerApiCommands (3 instances) - API processing
- WorkerModelsEvents (1) - DB change events
- WorkerCdr (1) - CDR processing
- WorkerNotifyByEmail (1) - Email sender

## Best Practices

### Efficient Analysis

1. **Start broad, then narrow**
   - Check system log first (overview)
   - Filter for errors (specific issues)
   - Check component logs (details)

2. **Use tail with limits**
   - ✅ `tail -500 | grep` (fast)
   - ❌ `cat | grep` (slow for large files)

3. **Filter aggressively**
   - Use specific patterns
   - Combine with grep -E for OR logic
   - Use grep -v to exclude noise

4. **Check timestamps**
   - Correlate events by time
   - Reconstruct event sequence
   - Find related errors

5. **Monitor processes**
   - Verify services are running
   - Check worker counts
   - Look for zombies/orphans

6. **Look for patterns**
   - Single error = isolated
   - Repeated errors = systemic
   - Use `uniq -c` to count occurrences

7. **Save findings**
   - Document errors
   - Note timestamps
   - Record context

### Performance Considerations

- Use `tail -N` instead of `cat` for large files
- Pipe through `head` to limit output
- Check file sizes before reading entire files (`ls -lh`)
- Use `-f` for real-time monitoring only when needed
- Kill monitoring processes when done (Ctrl+C)

### Troubleshooting Tips

**If logs are empty:**
- Check if logging is enabled
- Verify log file permissions
- Check if rsyslog is running

**If container command fails:**
- Verify container is running: `docker ps`
- Check container name/ID
- Try with `docker exec -it` for interactive mode

**If can't find pattern:**
- Try case-insensitive: `-i`
- Try broader pattern: `-E "pattern1|pattern2"`
- Increase tail count
- Check related log files

## Integration with Other Skills

### With mikopbx-docker-restart-tester:
1. Restart container
2. **Use this skill** to monitor startup
3. Check for errors during initialization

### With mikopbx-api-test-generator:
1. Generate and run tests
2. **Use this skill** to analyze test failures
3. Find root cause in logs

### With mikopbx-endpoint-validator:
1. Validator finds issue
2. **Use this skill** to see actual runtime errors
3. Correlate validation findings with logs

## Common Error Patterns

### PHP Errors
- `Fatal error:` - PHP crashed, script stopped
- `Undefined variable:` - Variable not initialized
- `Call to undefined function:` - Missing function
- `UNIQUE constraint failed:` - Database duplicate

### Worker Errors
- `Process terminated` - Worker crashed
- `Orphaned process` - Worker parent died
- `Failed to connect` - Service unavailable
- `Timeout exceeded` - Operation too slow

### Asterisk Errors
- `Could not create an object` - Config error
- `Error parsing allow=` - Codec config issue
- `Authentication failed` - Wrong credentials
- `No route to destination` - Routing problem

### System Errors
- `Out of memory` - Memory exhausted
- `Cannot allocate memory` - Resources low
- `Too many open files` - File descriptor limit
- `Connection refused` - Service not running

## Success Criteria

Log analysis is successful when:
- ✅ Root cause identified
- ✅ Actionable information extracted
- ✅ Relevant context provided
- ✅ Next steps clear
- ✅ No unnecessary noise in output
- ✅ Findings well-structured and readable
