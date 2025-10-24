# Quick Reference Card

## Container Info at a Glance

```
mikopbx_php83 (develop - API v3)
  IP:    192.168.117.2
  HTTP:  http://192.168.117.2:8081
  HTTPS: https://mikopbx_php83.localhost:8445
  API:   https://mikopbx_php83.localhost:8445/pbxcore/api/v3

mikopbx_php74 (old - API v1)
  IP:    192.168.117.3
  HTTP:  http://192.168.117.3:8082
  HTTPS: https://mikopbx_php74.localhost:8444
  API:   https://mikopbx_php74.localhost:8444/pbxcore/api
```

## Most Used Commands

```bash
# Get all container info
.claude/skills/mikopbx-container-inspector/get-container-info.sh

# Restart container (wait for services)
.claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --wait-services

# Quick restart API worker
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 WorkerApiCommands

# List running workers
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 list
```

## Default Credentials

```
Username: admin
Password: 123456789MikoPBX#1
```

## Common Curl Tests

```bash
# Test API v3 (develop)
curl -k https://192.168.117.2:8445/pbxcore/api/v3/extensions

# Test API v1 (old)
curl -k https://192.168.117.3:8444/pbxcore/api/extensions
```

## Shell Access

```bash
# Enter container shell
docker exec -it mikopbx_php83 /bin/sh

# View live PHP errors
docker exec mikopbx_php83 tail -f /storage/usbdisk1/mikopbx/log/php/error.log

# View live system log
docker exec mikopbx_php83 tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Asterisk CLI
docker exec -it mikopbx_php83 asterisk -rvvv
```

## When to Restart What

| Changed | Action | Command |
|---------|--------|---------|
| REST API code | Restart API worker | `./restart-worker.sh mikopbx_php83 WorkerApiCommands` |
| Model/Controller | Restart container | `./restart-container.sh mikopbx_php83 --wait-services` |
| Config files | Restart container | `./restart-container.sh mikopbx_php83 --wait-services` |
| JavaScript (after transpile) | No restart needed | Just refresh browser |
| Worker code | Restart specific worker | `./restart-worker.sh mikopbx_php83 Worker<Name>` |

## Available Workers

- `WorkerApiCommands` - REST API processor
- `WorkerAMI` - Asterisk Manager Interface
- `WorkerCdr` - Call Detail Records
- `WorkerModelsEvents` - Database events
- `WorkerNotifyError` - Error notifications
- `WorkerSafeScripts` - Safe script executor
