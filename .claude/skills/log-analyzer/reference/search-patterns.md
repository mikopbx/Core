# Log Search Patterns Reference

Comprehensive collection of efficient search patterns for MikoPBX log analysis.

## Basic Search Patterns

### Pattern 1: Recent Errors (Last N lines)

Get the most recent log entries:

```bash
# Last 100 lines from system log
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages

# Last 50 errors only
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Last 50 warnings and errors
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "warn|error|crit"
```

### Pattern 2: Search for Specific Keywords

Find specific terms in logs:

```bash
# Find WorkerApiCommands activity
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Find specific error messages
docker exec $CONTAINER_ID grep -i "authentication failed" /storage/usbdisk1/mikopbx/log/asterisk/security_log | tail -20

# Find PHP fatal errors
docker exec $CONTAINER_ID grep -i "fatal error" /storage/usbdisk1/mikopbx/log/php/error.log
```

### Pattern 3: Time-Range Analysis

Search within specific time periods:

```bash
# Logs from specific time range
docker exec $CONTAINER_ID grep "2025-10-20 06:5" /storage/usbdisk1/mikopbx/log/system/messages

# Last hour (assuming current time)
docker exec $CONTAINER_ID tail -10000 /storage/usbdisk1/mikopbx/log/system/messages | grep "$(date +%Y-%m-%d\ %H:)"

# Specific hour
docker exec $CONTAINER_ID grep "2025-10-20 06:" /storage/usbdisk1/mikopbx/log/system/messages | tail -100
```

### Pattern 4: Multi-Pattern Search

Search for multiple keywords:

```bash
# Multiple keywords (OR)
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "soft|orphan|WorkerApiCommands"

# Case-insensitive multiple patterns
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -iE "error|exception|failed"

# Complex pattern with alternation
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "(Worker.*error|crash|terminated)"
```

### Pattern 5: Process Monitoring

Monitor specific processes:

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

### Pattern 6: Real-Time Monitoring

Follow logs in real-time:

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

### Pattern 7: Context-Aware Search

Get surrounding context:

```bash
# Show 5 lines before and after match
docker exec $CONTAINER_ID grep -B5 -A5 "error" /storage/usbdisk1/mikopbx/log/system/messages | tail -50

# Show context with line numbers
docker exec $CONTAINER_ID grep -n -B3 -A3 "WorkerApiCommands" /storage/usbdisk1/mikopbx/log/system/messages | tail -50
```

## Advanced Search Patterns

### By Severity

Filter by log level:

```bash
# Only errors and critical
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "daemon.err|daemon.crit"

# Warnings and above
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "daemon.warn|daemon.err|daemon.crit"

# All non-debug messages
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -vE "daemon.debug"
```

### By Component

Filter by system component:

```bash
# PHP backend messages
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "php.backend"

# Specific worker
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "WorkerApiCommands"

# Asterisk related
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep "asterisk"

# All workers
docker exec $CONTAINER_ID tail -300 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "Worker[A-Z]"
```

### By PID

Track specific process:

```bash
# Track specific process
PID=1707
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep "\[$PID\]"

# Extract all PIDs
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -oP '\[\d+\]' | sort | uniq
```

### By Time Range

Advanced time filtering:

```bash
# Last 5 minutes (approximate)
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep "$(date +%Y-%m-%d\ %H:%M -d '5 minutes ago')"

# Specific hour
docker exec $CONTAINER_ID grep "2025-10-20 06:" /storage/usbdisk1/mikopbx/log/system/messages | tail -100

# Between two times
docker exec $CONTAINER_ID awk '/2025-10-20 06:50/,/2025-10-20 07:00/' /storage/usbdisk1/mikopbx/log/system/messages
```

## Efficiency Tips

### Tip 1: Use Head to Limit Output

Control output size:

```bash
# Get first 20 errors (oldest first)
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/system/messages | head -20

# Get last 20 errors (newest first)
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/system/messages | tail -20
```

### Tip 2: Count Occurrences

Count matches:

```bash
# Count specific errors
docker exec $CONTAINER_ID grep -c "Undefined variable" /storage/usbdisk1/mikopbx/log/php/error.log

# Count by type
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep -c "daemon.err"

# Count per worker
docker exec $CONTAINER_ID tail -1000 /storage/usbdisk1/mikopbx/log/system/messages | grep -c "WorkerApiCommands"
```

### Tip 3: Unique Errors Only

Remove duplicates:

```bash
# Show unique error messages
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/php/error.log | sort | uniq

# Count unique errors (sorted by frequency)
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/php/error.log | sort | uniq -c | sort -rn

# Top 10 most frequent errors
docker exec $CONTAINER_ID grep -i error /storage/usbdisk1/mikopbx/log/php/error.log | sort | uniq -c | sort -rn | head -10
```

### Tip 4: Extract Specific Fields

Parse log fields:

```bash
# Extract only error messages (remove timestamp)
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep error | awk '{print $5,$6,$7,$8,$9,$10}'

# Extract PIDs
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -oP '\[\d+\]' | sort | uniq

# Extract timestamps only
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages | awk '{print $1, $2}'
```

### Tip 5: Monitor Log Growth

Check log file sizes:

```bash
# Check log file sizes
docker exec $CONTAINER_ID ls -lh /storage/usbdisk1/mikopbx/log/

# Watch log file grow
docker exec $CONTAINER_ID watch -n 1 'ls -lh /storage/usbdisk1/mikopbx/log/system/messages'

# Monitor log write rate
docker exec $CONTAINER_ID 'wc -l /storage/usbdisk1/mikopbx/log/system/messages; sleep 10; wc -l /storage/usbdisk1/mikopbx/log/system/messages'
```

## Common Error Patterns to Search

### PHP Errors

```bash
# Fatal errors
grep -i "fatal error" /storage/usbdisk1/mikopbx/log/php/error.log

# Undefined variables
grep -i "undefined variable" /storage/usbdisk1/mikopbx/log/php/error.log

# Call to undefined function
grep -i "call to undefined function" /storage/usbdisk1/mikopbx/log/php/error.log
```

### Database Errors

```bash
# UNIQUE constraint violations
grep -i "unique constraint" /storage/usbdisk1/mikopbx/log/system/messages

# Foreign key errors
grep -i "foreign key" /storage/usbdisk1/mikopbx/log/system/messages

# Database locked
grep -i "database.*locked" /storage/usbdisk1/mikopbx/log/system/messages
```

### Worker Errors

```bash
# Process terminated
grep -i "terminated" /storage/usbdisk1/mikopbx/log/system/messages

# Orphaned processes
grep -i "orphan" /storage/usbdisk1/mikopbx/log/system/messages

# Worker crashes
grep -E "Worker.*crash|Worker.*terminated" /storage/usbdisk1/mikopbx/log/system/messages
```

### Asterisk Errors

```bash
# Configuration errors
grep -i "could not create" /storage/usbdisk1/mikopbx/log/asterisk/error

# Authentication failures
grep -i "authentication failed" /storage/usbdisk1/mikopbx/log/asterisk/security_log

# Registration errors
grep -i "registration.*fail" /storage/usbdisk1/mikopbx/log/asterisk/messages
```

### System Errors

```bash
# Memory errors
grep -iE "out of memory|cannot allocate" /storage/usbdisk1/mikopbx/log/system/messages

# File descriptor limits
grep -i "too many open files" /storage/usbdisk1/mikopbx/log/system/messages

# Connection errors
grep -i "connection refused" /storage/usbdisk1/mikopbx/log/system/messages
```

## Performance Considerations

### Best Practices

1. **Use tail -N** instead of cat for large files
2. **Pipe through head** to limit output
3. **Use specific patterns** instead of broad searches
4. **Check file sizes** before reading entire files
5. **Use -f for real-time** monitoring only when needed
6. **Kill monitoring processes** when done (Ctrl+C)

### Anti-Patterns to Avoid

❌ **Don't do this:**
```bash
# Reading entire large log file
docker exec $CONTAINER_ID cat /storage/usbdisk1/mikopbx/log/system/messages

# Grepping entire file without tail
docker exec $CONTAINER_ID grep "error" /storage/usbdisk1/mikopbx/log/system/messages
```

✅ **Do this instead:**
```bash
# Read recent entries
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages

# Search recent entries
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep "error"
```

## Quick Reference

### Most Useful Commands

```bash
# Recent errors
docker exec $CONTAINER_ID tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -i error

# Worker status
docker exec $CONTAINER_ID ps aux | grep -E "Worker[A-Z]" | grep -v grep

# Follow system log
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Check PHP errors
docker exec $CONTAINER_ID tail -50 /storage/usbdisk1/mikopbx/log/php/error.log
```
