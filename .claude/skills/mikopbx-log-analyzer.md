# mikopbx-log-analyzer

Efficiently analyze logs inside MikoPBX Docker container to diagnose issues, monitor processes, and track system behavior.

## When to Use This Skill

Use this skill when:
- User reports an error or issue
- Need to diagnose API problems
- Tracking specific worker processes
- Investigating system behavior
- User asks "check logs" or "what's in the logs?"
- After tests fail (to find root cause)
- Monitoring real-time system activity

## What This Skill Does

1. **Intelligently searches logs** based on problem context
2. **Identifies relevant log files** for the issue type
3. **Filters noise** to show only relevant entries
4. **Correlates logs** across multiple log files
5. **Tracks processes** and their status
6. **Provides actionable insights** from log analysis
7. **Monitors real-time** when needed

## MikoPBX Log Structure

### Primary Log Locations

```
/storage/usbdisk1/mikopbx/log/
├── system/
│   ├── messages          # Main system log (syslog format)
│   ├── crond            # Cron job logs
│   ├── monit            # Service monitoring
│   └── redis            # Redis logs
├── asterisk/
│   ├── messages         # Asterisk general messages
│   ├── error            # Asterisk errors
│   ├── verbose          # Verbose call logs
│   ├── security_log     # Security events
│   └── asterisk-cli.log # CLI command history
├── php/
│   └── error.log        # PHP errors and warnings
├── nginx/
│   ├── access.log       # HTTP access logs
│   └── error.log        # Nginx errors
├── fail2ban/
│   └── fail2ban.log     # Security/ban events
├── nats/
│   └── gnatsd.log       # NATS message bus logs
├── debug-mikopbx-queries.log  # SQL queries (main DB)
├── debug-cdr-queries.log      # SQL queries (CDR DB)
└── xdebug.log           # PHP debugging
```

## Log Format Understanding

### System Messages Format
```
2025-10-20 06:53:59 daemon.debug php.backend[1707]:  Message on Class::method
```

**Structure:**
- `2025-10-20 06:53:59` - Timestamp
- `daemon.debug` - Facility.Level
- `php.backend[1707]` - Process name [PID]
- Message content

**Log Levels:**
- `daemon.debug` - Debug information
- `daemon.info` - Informational
- `daemon.warn` - Warnings
- `daemon.err` - Errors
- `daemon.crit` - Critical errors

### PHP Error Log Format
```
[20-Oct-2025 06:11:21 Europe/Moscow] Error message
```

### Asterisk Error Format
```
[2025-10-20 06:54:02] ERROR[29800] module.c: Error description
```

## Common Processes to Monitor

### Worker Processes
```
WorkerApiCommands           # REST API request processor (3 instances)
WorkerModelsEvents          # Database change event handler
WorkerCallEvents            # Call event processor
WorkerCdr                   # CDR processor
WorkerNotifyByEmail         # Email notification sender
WorkerPrepareAdvice         # Advice/tips generator
WorkerSafeScriptsCore       # Cron job executor
WorkerProviderStatusMonitor # Provider status checker
WorkerExtensionStatusMonitor # Extension status checker
WorkerAuthFailureMonitor    # Failed auth monitor
```

### System Services
```
asterisk     # PBX engine
php-fpm      # PHP FastCGI manager
nginx        # Web server
redis-server # Cache and IPC
beanstalkd   # Job queue
fail2ban     # Security
gnatsd       # NATS message bus
rsyslogd     # System logging
```

## Usage Instructions

### Step 1: Identify Container

```bash
# Find MikoPBX container
CONTAINER_ID=$(docker ps | grep mikopbx | awk '{print $1}' | head -1)

# Or by image name
CONTAINER_ID=$(docker ps --filter "ancestor=mikopbx/mikopbx" --format "{{.ID}}" | head -1)
```

### Step 2: Determine Log Context

Based on the issue type, select appropriate logs:

**API Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/system/messages` (WorkerApiCommands)
- `/storage/usbdisk1/mikopbx/log/php/error.log`
- `/storage/usbdisk1/mikopbx/log/nginx/error.log`

**Call Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/asterisk/messages`
- `/storage/usbdisk1/mikopbx/log/asterisk/error`
- `/storage/usbdisk1/mikopbx/log/asterisk/verbose`

**Database Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log`
- `/storage/usbdisk1/mikopbx/log/debug-cdr-queries.log`
- `/storage/usbdisk1/mikopbx/log/system/messages`

**Worker Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/system/messages` (filter by worker name)
- Process status with `ps aux | grep Worker`

**Authentication Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/asterisk/security_log`
- `/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log`
- `/storage/usbdisk1/mikopbx/log/nginx/access.log`

**Email Issues** → Check:
- `/storage/usbdisk1/mikopbx/log/system/messages` (WorkerNotifyByEmail)

**Performance Issues** → Check:
- Process list: `ps aux`
- System messages for errors/warnings
- Worker process counts

### Step 3: Execute Targeted Log Analysis

Use these efficient patterns:

#### Pattern 1: Recent Errors (Last N lines)
```bash
# Last 100 lines from system log
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages

# Last 50 errors only
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Last 50 warnings and errors
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "warn|error|crit"
```

#### Pattern 2: Search for Specific Keywords
```bash
# Find WorkerApiCommands activity
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Find specific error messages
docker exec $CONTAINER_ID grep -i "authentication failed" /storage/usbdisk1/mikopbx/log/asterisk/security_log | tail -20

# Find PHP fatal errors
docker exec $CONTAINER_ID grep -i "fatal error" /storage/usbdisk1/mikopbx/log/php/error.log
```

#### Pattern 3: Time-Range Analysis
```bash
# Logs from specific time range
docker exec $CONTAINER_ID grep "2025-10-20 06:5" /storage/usbdisk1/mikopbx/log/system/messages

# Last hour (assuming current time)
docker exec $CONTAINER_ID tail -10000 /storage/usbdisk1/mikopbx/log/system/messages | grep "$(date +%Y-%m-%d\ %H:)"
```

#### Pattern 4: Multi-Pattern Search
```bash
# Multiple keywords (OR)
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "soft|orphan|WorkerApiCommands"

# Case-insensitive multiple patterns
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "error|exception|failed"
```

#### Pattern 5: Process Monitoring
```bash
# Check if specific worker is running
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands

# Count worker instances
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands | grep -v grep | wc -l

# Find process by PID from log
docker exec $CONTAINER_ID ps aux | grep 1707

# Check all worker processes
docker exec $CONTAINER_ID ps aux | grep -E "Worker[A-Z]" | grep -v grep
```

#### Pattern 6: Real-Time Monitoring
```bash
# Follow system log in real-time
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Follow and filter for errors
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Follow specific worker
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Follow PHP errors
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/php/error.log
```

#### Pattern 7: Context-Aware Search
```bash
# Show 5 lines before and after match
docker exec $CONTAINER_ID grep -B5 -A5 "error" /storage/usbdisk1/mikopbx/log/system/messages | tail -50

# Show context with line numbers
docker exec $CONTAINER_ID grep -n -B3 -A3 "WorkerApiCommands" /storage/usbdisk1/mikopbx/log/system/messages | tail -50
```

### Step 4: Correlate Logs

When investigating complex issues, check multiple logs:

```bash
# Check system log
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Then check PHP log for details
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/php/error.log

# Then check nginx if API-related
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/nginx/error.log
```

### Step 5: Analyze and Report

Present findings in structured format:

```
📋 Log Analysis Results
=======================

🔍 Analyzed: /storage/usbdisk1/mikopbx/log/system/messages (last 500 lines)
⏰ Time range: 2025-10-20 06:50:00 - 06:53:59
🐳 Container: 16480ebc6983 (mikopbx_php83)

📊 Summary:
   • Total lines analyzed: 500
   • Errors found: 3
   • Warnings found: 12
   • Info messages: 485

❌ Errors Found:

1. [06:52:15] PHP Fatal Error
   Location: SaveRecordAction.php:87
   Message: Undefined variable $defaultValue
   Process: WorkerApiCommands[1637]

2. [06:52:20] Database Error
   Message: UNIQUE constraint failed: Extensions.number
   Process: WorkerModelsEvents[1707]

3. [06:53:10] Worker Crash
   Message: WorkerApiCommands process terminated unexpectedly
   Process: php.backend[1639]

⚠️  Warnings Found (showing top 5):

1. [06:51:30] Slow query detected (2.3s)
2. [06:52:00] Redis connection timeout
3. [06:52:45] Asterisk reload taking longer than expected
4. [06:53:00] High memory usage (85%)
5. [06:53:30] Failed login attempt from 192.168.1.100

🔍 Process Status:

WorkerApiCommands:
   ✅ Running (3 instances)
   PIDs: 1637, 1639, 1641
   Memory: 48-66 MB each

WorkerModelsEvents:
   ✅ Running (1 instance)
   PID: 1707
   Memory: 44 MB

💡 Recommendations:

1. Fix undefined variable in SaveRecordAction.php:87
2. Check duplicate extension number in database
3. Investigate WorkerApiCommands crash (PID 1639)
4. Consider Redis connection pool optimization
5. Monitor memory usage trends
```

## Common Analysis Scenarios

### Scenario 1: API Request Failed

```bash
# Check WorkerApiCommands logs
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Check PHP errors
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/php/error.log

# Check nginx access log for request
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/nginx/access.log | grep "POST /pbxcore/api"

# Correlate by timestamp
```

**Look for:**
- Request received by nginx
- Request queued to Redis
- WorkerApiCommands processing
- PHP errors during execution
- Response sent back

### Scenario 2: Worker Process Crashed

```bash
# Check if worker is running
docker exec $CONTAINER_ID ps aux | grep WorkerName

# Check system logs for crash
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "WorkerName|terminated|crash|orphan"

# Check for PHP fatal errors
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log | grep -i fatal
```

**Look for:**
- "Process terminated"
- "Orphaned process"
- Fatal PHP errors
- Memory exhaustion
- Segmentation faults

### Scenario 3: Slow Performance

```bash
# Check for slow queries
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log | grep -i "slow"

# Check process CPU/Memory
docker exec $CONTAINER_ID ps aux --sort=-%cpu | head -10

# Check for warnings
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i "slow\|timeout\|delay"
```

**Look for:**
- Slow database queries
- High CPU/memory processes
- Timeout warnings
- Queue backlogs

### Scenario 4: Database Errors

```bash
# Check system logs for DB errors
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "database|sqlite|constraint"

# Check query logs if enabled
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log

# Check PHP errors
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log | grep -i "database\|pdo\|sql"
```

**Look for:**
- UNIQUE constraint violations
- Foreign key errors
- Locked database
- Corrupted database

### Scenario 5: Asterisk Call Issues

```bash
# Check Asterisk errors
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/asterisk/error

# Check verbose call logs
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/asterisk/verbose | grep "extension-number"

# Check security log
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/asterisk/security_log
```

**Look for:**
- Registration failures
- Codec negotiation errors
- Call routing errors
- Authentication failures

### Scenario 6: Configuration Reload Issues

```bash
# Check reload actions
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "Reload|reload|ReloadAction"

# Check WorkerModelsEvents
docker exec $CONTAINER_ID tail -200 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerModelsEvents

# Check Asterisk reload
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/asterisk/messages | grep reload
```

**Look for:**
- Reload action sequences
- Configuration validation errors
- Services that failed to reload

## Efficient Search Patterns

### By Severity
```bash
# Only errors and critical
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "daemon.err|daemon.crit"

# Warnings and above
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "daemon.warn|daemon.err|daemon.crit"
```

### By Component
```bash
# PHP backend messages
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "php.backend"

# Specific worker
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "WorkerApiCommands"

# Asterisk related
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "asterisk"
```

### By PID
```bash
# Track specific process
PID=1707
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep "\[$PID\]"
```

### By Time Range
```bash
# Last 5 minutes (approximate)
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep "$(date +%Y-%m-%d\ %H:%M -d '5 minutes ago')"

# Specific hour
docker exec $CONTAINER_ID grep "2025-10-20 06:" /storage/usbdisk1/mikopbx/log/system/messages | tail -100
```

## Pro Tips

### Tip 1: Use Head to Limit Output
```bash
# Get first 20 errors (oldest first)
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/system/messages | head -20

# Get last 20 errors (newest first)
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/system/messages | tail -20
```

### Tip 2: Count Occurrences
```bash
# Count specific errors
docker exec $CONTAINER_ID grep -c "Undefined variable" /storage/usbdisk1/mikopbx/log/php/error.log

# Count by type
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep -c "daemon.err"
```

### Tip 3: Unique Errors Only
```bash
# Show unique error messages
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/php/error.log | sort | uniq

# Count unique errors
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/php/error.log | sort | uniq -c | sort -rn
```

### Tip 4: Extract Specific Fields
```bash
# Extract only error messages (remove timestamp)
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep error | awk '{print $5,$6,$7,$8,$9,$10}'

# Extract PIDs
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -oP '\[\d+\]' | sort | uniq
```

### Tip 5: Monitor Log Growth
```bash
# Check log file sizes
docker exec $CONTAINER_ID ls -lh /storage/usbdisk1/mikopbx/log/

# Watch log file grow
docker exec $CONTAINER_ID watch -n 1 'ls -lh /storage/usbdisk1/mikopbx/log/system/messages'
```

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

## Quick Reference Commands

### Essential Commands
```bash
# Find container
docker ps | grep mikopbx

# Tail system log
docker exec <id> tail -100 /storage/usbdisk1/mikopbx/log/system/messages

# Tail system log (errors only)
docker exec <id> tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Check PHP errors
docker exec <id> tail -50 /storage/usbdisk1/mikopbx/log/php/error.log

# Check worker processes
docker exec <id> ps aux | grep Worker

# Follow log in real-time
docker exec <id> tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Search for pattern
docker exec <id> tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "pattern1|pattern2"
```

### Critical Paths
```bash
# Must-check logs for issues
/storage/usbdisk1/mikopbx/log/system/messages     # PRIMARY
/storage/usbdisk1/mikopbx/log/php/error.log       # PHP errors
/storage/usbdisk1/mikopbx/log/asterisk/error      # Asterisk errors
/storage/usbdisk1/mikopbx/log/nginx/error.log     # Web errors
```

## Output Format

Always structure log analysis output:

```
📋 Log Analysis: <Component/Issue>
==================================

🔍 Search Criteria:
   • Log file: /path/to/log
   • Time range: HH:MM - HH:MM
   • Pattern: <search pattern>
   • Lines analyzed: N

📊 Findings:

❌ Errors (N found):
   <list of errors with timestamps>

⚠️  Warnings (N found):
   <list of warnings>

📝 Relevant Log Entries:
   <key log lines>

🔄 Process Status:
   <relevant process info>

💡 Analysis:
   <interpretation of findings>

🎯 Next Steps:
   <actionable recommendations>
```

## Common Error Patterns

### PHP Errors
- `Fatal error:` - PHP crashed
- `Undefined variable:` - Variable not initialized
- `Call to undefined function:` - Missing function
- `UNIQUE constraint failed:` - Database constraint violation

### Worker Errors
- `Process terminated` - Worker crashed
- `Orphaned process` - Worker parent died
- `Failed to connect` - Service unavailable
- `Timeout exceeded` - Operation too slow

### Asterisk Errors
- `Could not create an object` - Configuration error
- `Error parsing allow=` - Codec configuration issue
- `Authentication failed` - Wrong credentials
- `No route to destination` - Routing problem

### System Errors
- `Out of memory` - Memory exhausted
- `Cannot allocate memory` - System resources low
- `Too many open files` - File descriptor limit
- `Connection refused` - Service not running

## Best Practices

1. **Start broad, then narrow** - Check system log first, then specific logs
2. **Use tail with limits** - Don't dump entire log files
3. **Filter aggressively** - Use grep to reduce noise
4. **Check timestamps** - Correlate events by time
5. **Monitor processes** - Verify services are running
6. **Look for patterns** - Recurring errors indicate systemic issues
7. **Check context** - Use grep -A/-B for surrounding lines
8. **Save findings** - Document errors for future reference

## Performance Considerations

- Use `tail -N` instead of `cat` for large files
- Pipe through `head` to limit output
- Use specific patterns instead of broad searches
- Check file sizes before reading entire files
- Use `-f` for real-time monitoring only when needed
- Kill monitoring processes when done (Ctrl+C)

## Troubleshooting the Troubleshooting

### If logs are empty:
- Check if logging is enabled
- Verify log file permissions
- Check if rsyslog is running

### If container command fails:
- Verify container is running: `docker ps`
- Check container name/ID
- Try with `docker exec -it` for interactive mode

### If can't find pattern:
- Try case-insensitive: `-i`
- Try broader pattern: `-E "pattern1|pattern2"`
- Check earlier in log file (increase tail count)
- Check related log files

## Success Criteria

Log analysis is successful when:
- ✅ Root cause identified
- ✅ Actionable information extracted
- ✅ Relevant context provided
- ✅ Next steps clear
- ✅ No unnecessary noise in output
- ✅ Findings well-structured and readable
