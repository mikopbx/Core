# Troubleshooting Guide

## Container Not Found

```
❌ ERROR: Container 'mikopbx_php83' not found

Available containers:
  mikopbx_php74  (Up 18 hours)

Check container name or start it:
  docker ps -a | grep mikopbx
  docker start mikopbx_php83
```

**Solution**: Verify container name and start if needed.

## Container Not Running

```
❌ ERROR: Container 'mikopbx_php83' exists but is not running

Start the container:
  docker start mikopbx_php83

Or check what went wrong:
  docker logs mikopbx_php83
```

**Solution**: Start the container or check logs for crash reasons.

## Wrong API Path (404 Error)

```
❌ ERROR: API returned 404

Check API version:
  mikopbx_php83 → Use /pbxcore/api/v3
  mikopbx_php74 → Use /pbxcore/api
```

**Example**:
```bash
# Wrong for php74
curl https://192.168.117.3:8444/pbxcore/api/v3/extensions

# Correct for php74
curl https://192.168.117.3:8444/pbxcore/api/extensions
```

**Solution**: Always check which container you're testing and use the correct API path.

## Service Startup Timeout

```
⚠️  WARNING: Asterisk not responding after 60 seconds

This may indicate:
  - Asterisk crashed on startup
  - Configuration error
  - Resource constraints

Check logs:
  docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/asterisk/messages
```

**Solution**: Check Asterisk logs for specific errors.

## Worker Not Restarting

```
❌ ERROR: Worker 'WorkerApiCommands' not found after restart

Worker may have crashed. Check logs:
  docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep Worker

Fallback: Restart entire container
  ./restart-container.sh mikopbx_php83 --wait-services
```

**Solution**: Check worker logs for crash reasons. If worker is critical, restart entire container.

## Port Conflicts

If you see errors about ports already in use:

```bash
# Find what's using the port
lsof -i :8445

# Or kill the process
kill -9 <PID>

# Then restart container
docker restart mikopbx_php83
```

## Database Locked

```
❌ ERROR: database is locked
```

**Solution**: This usually means another process is writing to the database.

```bash
# Find processes accessing database
docker exec mikopbx_php83 lsof /cf/conf/mikopbx.db

# Wait a moment and retry
# Or restart container if persistent
./restart-container.sh mikopbx_php83 --wait-services
```

## Redis Connection Failed

```
❌ ERROR: Redis failed to start after 60 seconds
```

**Solution**: Check Redis logs and restart.

```bash
# Check Redis is running
docker exec mikopbx_php83 pgrep redis

# Check Redis logs
docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -i redis

# Restart container
./restart-container.sh mikopbx_php83 --wait-services
```

## PHP-FPM Not Starting

```
❌ ERROR: PHP-FPM failed to start after 60 seconds
```

**Solution**: Check PHP-FPM logs.

```bash
# Check PHP-FPM logs
docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/php/error.log

# Check system messages
docker exec mikopbx_php83 tail -100 /storage/usbdisk1/mikopbx/log/system/messages | grep -i php-fpm
```

## Network Issues

If containers can't communicate:

```bash
# Check network
docker network ls

# Inspect container network
docker inspect mikopbx_php83 | grep -A 20 Networks

# Check IP is reachable
ping 192.168.117.2
```

## Performance Issues

Container running slow:

```bash
# Check resource usage
docker stats mikopbx_php83

# Check disk space
docker exec mikopbx_php83 df -h

# Check memory
docker exec mikopbx_php83 free -m
```

## Common Error Messages

### "Permission denied"

```bash
# Fix script permissions
chmod +x .claude/skills/mikopbx-container-inspector/*.sh
```

### "No such file or directory"

```bash
# Verify you're in the correct directory
pwd
# Should be: /Users/nb/PhpstormProjects/mikopbx/Core

# Or use absolute path
/Users/nb/PhpstormProjects/mikopbx/Core/.claude/skills/mikopbx-container-inspector/get-container-info.sh
```

### "Container ID is empty"

```bash
# Container may have stopped
docker ps -a | grep mikopbx

# Start it
docker start mikopbx_php83
```
