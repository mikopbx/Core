# MikoPBX Log Structure Reference

Complete reference for all MikoPBX log files, formats, and locations.

## Primary Log Locations

All logs are stored in the `/storage/usbdisk1/mikopbx/log/` directory:

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

System logs follow standard syslog format:

```
2025-10-20 06:53:59 daemon.debug php.backend[1707]:  Message on Class::method
```

**Structure:**
- `2025-10-20 06:53:59` - Timestamp (YYYY-MM-DD HH:MM:SS)
- `daemon.debug` - Facility.Level
- `php.backend[1707]` - Process name [PID]
- Message content - Actual log message

**Log Levels (Severity):**
- `daemon.debug` - Debug information (development)
- `daemon.info` - Informational messages
- `daemon.notice` - Normal but significant
- `daemon.warn` - Warning messages
- `daemon.err` - Error conditions
- `daemon.crit` - Critical errors
- `daemon.alert` - Action must be taken
- `daemon.emerg` - System is unusable

### PHP Error Log Format

PHP errors use PHP's standard error log format:

```
[20-Oct-2025 06:11:21 Europe/Moscow] Error message
```

**Structure:**
- `[20-Oct-2025 06:11:21 Europe/Moscow]` - Timestamp with timezone
- Error message - Full PHP error description

**Common PHP Error Types:**
- `Fatal error:` - Script execution stopped
- `Parse error:` - Syntax error
- `Warning:` - Non-fatal error
- `Notice:` - Minor issue
- `Deprecated:` - Outdated function usage

### Asterisk Log Format

Asterisk uses its own log format:

```
[2025-10-20 06:54:02] ERROR[29800] module.c: Error description
```

**Structure:**
- `[2025-10-20 06:54:02]` - Timestamp
- `ERROR[29800]` - Level[Thread ID]
- `module.c:` - Source file
- Error description - Message

**Asterisk Log Levels:**
- `VERBOSE` - Detailed operation info
- `DEBUG` - Debug information
- `NOTICE` - Normal events
- `WARNING` - Warning conditions
- `ERROR` - Error conditions
- `SECURITY` - Security-related events

### Nginx Access Log Format

```
192.168.1.100 - - [20/Oct/2025:06:53:59 +0300] "POST /pbxcore/api/v3/extensions HTTP/1.1" 200 1234 "-" "curl/7.68.0"
```

**Structure:**
- IP address
- Remote user (usually -)
- Auth user (usually -)
- Timestamp
- Request line (method, path, protocol)
- Status code
- Response size
- Referer
- User agent

### Nginx Error Log Format

```
2025/10/20 06:53:59 [error] 1234#0: *5678 error message, client: 192.168.1.100, server: _, request: "POST /api HTTP/1.1"
```

## Log File Usage by Issue Type

### API Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/system/messages` - WorkerApiCommands activity
- `/storage/usbdisk1/mikopbx/log/php/error.log` - PHP execution errors

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/nginx/error.log` - Web server errors
- `/storage/usbdisk1/mikopbx/log/nginx/access.log` - Request tracking
- `/storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log` - Database queries

### Call Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/asterisk/messages` - General Asterisk activity
- `/storage/usbdisk1/mikopbx/log/asterisk/error` - Asterisk errors

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/asterisk/verbose` - Detailed call flows
- `/storage/usbdisk1/mikopbx/log/asterisk/security_log` - Auth failures
- `/storage/usbdisk1/mikopbx/log/system/messages` - System-level issues

### Database Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/system/messages` - Database error messages
- `/storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log` - Main DB queries

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/debug-cdr-queries.log` - CDR DB queries
- `/storage/usbdisk1/mikopbx/log/php/error.log` - PDO/SQL errors

### Worker Process Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/system/messages` - Worker activity and crashes

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/php/error.log` - Fatal errors in workers

### Authentication Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/asterisk/security_log` - Auth attempts
- `/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log` - Ban events

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/nginx/access.log` - HTTP auth attempts
- `/storage/usbdisk1/mikopbx/log/system/messages` - System-level auth

### Email Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/system/messages` - WorkerNotifyByEmail activity

**Secondary:**
- `/storage/usbdisk1/mikopbx/log/php/error.log` - Mail sending errors

### Performance Issues

**Primary:**
- `/storage/usbdisk1/mikopbx/log/system/messages` - Resource warnings
- `/storage/usbdisk1/mikopbx/log/debug-mikopbx-queries.log` - Slow queries

**Secondary:**
- All logs - Check for timeout/slow messages

## Log Rotation

MikoPBX automatically rotates logs to prevent disk space issues:

- System logs rotate daily
- Asterisk logs rotate based on size
- Old logs are compressed (.gz)
- Logs older than 30 days are deleted

## Accessing Logs

### From Docker Container

```bash
# Auto-detect container based on current worktree
CONTAINER_ID=$(./.claude/scripts/get-container-name.sh)

# Access logs
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/system/messages
```

### Common Access Commands

```bash
# View log (last 100 lines)
docker exec $CONTAINER_ID tail -100 /path/to/log

# Follow log in real-time
docker exec $CONTAINER_ID tail -f /path/to/log

# Search in log
docker exec $CONTAINER_ID grep "pattern" /path/to/log

# Count lines in log
docker exec $CONTAINER_ID wc -l /path/to/log
```

## Log File Sizes

Typical log file sizes (approximate):

- `system/messages` - 10-50 MB (active)
- `php/error.log` - 1-10 MB
- `asterisk/messages` - 5-20 MB
- `nginx/access.log` - 10-100 MB (varies by traffic)
- `debug-*-queries.log` - Only when debug enabled

**Note:** Check log sizes before reading entire files to avoid performance issues.
