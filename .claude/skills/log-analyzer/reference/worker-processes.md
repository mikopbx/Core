# MikoPBX Worker Processes Reference

Complete reference for all MikoPBX background worker processes and system services.

## Worker Processes

MikoPBX uses background worker processes to handle asynchronous tasks. All workers are PHP processes that extend `WorkerBase`.

### API & Queue Workers

**WorkerApiCommands** (3 instances)
- **Purpose:** Processes REST API requests from Redis queue
- **Instances:** 3 parallel processes for load balancing
- **Logs:** System messages, PHP errors
- **Monitor:** `ps aux | grep WorkerApiCommands`
- **Common Issues:** Crashes on invalid input, timeout on slow operations

### Event Workers

**WorkerModelsEvents** (1 instance)
- **Purpose:** Handles database model change events
- **Triggers:** After INSERT/UPDATE/DELETE on models
- **Actions:** Triggers config regeneration, service reloads
- **Logs:** System messages
- **Common Issues:** Slow reload operations, cascading events

**WorkerCallEvents** (1 instance)
- **Purpose:** Processes Asterisk call events
- **Source:** AMI (Asterisk Manager Interface) events
- **Actions:** Updates call status, triggers notifications
- **Logs:** System messages, Asterisk messages

### CDR & Recording Workers

**WorkerCdr** (1 instance)
- **Purpose:** Processes Call Detail Records
- **Source:** Asterisk CDR queue
- **Actions:** Writes CDR to database, triggers post-call actions
- **Database:** Separate CDR database
- **Logs:** System messages, debug-cdr-queries.log

### Notification Workers

**WorkerNotifyByEmail** (1 instance)
- **Purpose:** Sends email notifications
- **Triggers:** CDR events, system alerts, user actions
- **Actions:** Composes and sends emails via configured SMTP
- **Logs:** System messages (shows SMTP connection status)
- **Common Issues:** SMTP connection failures, authentication errors

**WorkerPrepareAdvice** (1 instance)
- **Purpose:** Generates system advice and tips
- **Triggers:** Periodic checks, user actions
- **Actions:** Analyzes system state, generates recommendations
- **Logs:** System messages

### Monitoring Workers

**WorkerProviderStatusMonitor** (1 instance)
- **Purpose:** Monitors SIP/IAX provider registration status
- **Interval:** Every 60 seconds
- **Actions:** Updates provider status, triggers alerts
- **Logs:** System messages (shows registration state)

**WorkerExtensionStatusMonitor** (1 instance)
- **Purpose:** Monitors extension registration status
- **Interval:** Every 30 seconds
- **Actions:** Updates extension status in database
- **Logs:** System messages

**WorkerAuthFailureMonitor** (1 instance)
- **Purpose:** Monitors failed authentication attempts
- **Source:** Asterisk security log
- **Actions:** Feeds data to fail2ban, updates statistics
- **Logs:** System messages, asterisk/security_log

### Maintenance Workers

**WorkerSafeScriptsCore** (1 instance)
- **Purpose:** Executes scheduled cron jobs safely
- **Triggers:** Cron schedule
- **Actions:** Runs maintenance scripts, cleanup tasks
- **Logs:** System messages, crond log
- **Common Issues:** Long-running scripts, timeouts

## System Services

MikoPBX runs several system services managed by **monit**:

### Core PBX Service

**asterisk**
- **Purpose:** Main PBX engine (VoIP, call routing)
- **Process:** `/usr/sbin/asterisk`
- **Logs:** `/storage/usbdisk1/mikopbx/log/asterisk/`
- **Monitor:** `asterisk -rx "core show version"`
- **Restart:** `asterisk -rx "core restart now"`

### Application Services

**php-fpm**
- **Purpose:** FastCGI PHP process manager for web interface
- **Process:** `/usr/sbin/php-fpm`
- **Logs:** `/storage/usbdisk1/mikopbx/log/php/error.log`
- **Monitor:** `ps aux | grep php-fpm`
- **Workers:** Spawns PHP workers on demand

**nginx**
- **Purpose:** Web server for admin interface and API
- **Process:** `/usr/sbin/nginx`
- **Logs:** `/storage/usbdisk1/mikopbx/log/nginx/`
- **Monitor:** `nginx -t` (test config)
- **Common Issues:** Port conflicts, SSL certificate errors

### Data Services

**redis-server**
- **Purpose:** In-memory cache and IPC (Inter-Process Communication)
- **Process:** `/usr/bin/redis-server`
- **Logs:** `/storage/usbdisk1/mikopbx/log/system/redis`
- **Uses:** Session storage, API queue, worker IPC, caching
- **Monitor:** `redis-cli ping`

**beanstalkd**
- **Purpose:** Job queue for workers and modules
- **Process:** `/usr/bin/beanstalkd`
- **Logs:** System messages
- **Uses:** CDR processing, module queues, async tasks
- **Monitor:** Check process running

### Security Services

**fail2ban**
- **Purpose:** Intrusion prevention (ban IPs after failed auth)
- **Process:** `/usr/bin/fail2ban-server`
- **Logs:** `/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log`
- **Monitors:** SSH, SIP, HTTP auth failures
- **Monitor:** `fail2ban-client status`

### Messaging Services

**gnatsd** (NATS)
- **Purpose:** Lightweight message bus for pub/sub
- **Process:** `/usr/bin/gnatsd`
- **Logs:** `/storage/usbdisk1/mikopbx/log/nats/gnatsd.log`
- **Uses:** Real-time notifications, event broadcasting
- **Monitor:** Check process running

### System Services

**rsyslogd**
- **Purpose:** System logging daemon
- **Process:** `/usr/sbin/rsyslogd`
- **Logs:** Routes to `/storage/usbdisk1/mikopbx/log/system/messages`
- **Monitor:** Check if logs are being written

## Monitoring Commands

### Check Worker Status

```bash
# List all workers
docker exec $CONTAINER_ID ps aux | grep -E "Worker[A-Z]" | grep -v grep

# Check specific worker
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands

# Count worker instances
docker exec $CONTAINER_ID ps aux | grep WorkerApiCommands | grep -v grep | wc -l
```

### Check Service Status

```bash
# List all services
docker exec $CONTAINER_ID ps aux | grep -E "asterisk|nginx|redis|php-fpm|beanstalkd|fail2ban|gnatsd"

# Check specific service
docker exec $CONTAINER_ID ps aux | grep asterisk
```

### Monitor Worker Activity in Logs

```bash
# Monitor specific worker
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerApiCommands

# Monitor all workers
docker exec $CONTAINER_ID tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep -E "Worker[A-Z]"
```

## Common Process Issues

### Worker Not Running
- Check for crash in system messages
- Look for PHP fatal errors
- Check for memory exhaustion
- Verify parent process is running

### Too Many Worker Instances
- Indicates restart loops
- Check for startup errors
- Kill orphaned processes if needed

### High CPU/Memory Usage
- Use `ps aux --sort=-%cpu` or `--sort=-%mem`
- Check for infinite loops in logs
- Look for slow operations

### Process Stuck
- Look for timeout messages
- Check for database locks
- Check for external service unavailability

## Process Lifecycle

### Worker Startup
1. Parent spawns worker process
2. Worker initializes (connects to Redis, DB)
3. Worker starts processing loop
4. Logs "Worker started" message

### Worker Shutdown
1. Receives shutdown signal
2. Completes current task
3. Closes connections
4. Logs "Worker stopped" message
5. Process exits

### Worker Crash
- Logs "Process terminated unexpectedly"
- Parent detects crash
- Parent may restart worker automatically
- Check logs for fatal errors before crash
