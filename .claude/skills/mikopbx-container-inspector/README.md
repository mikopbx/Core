# mikopbx-container-inspector

Quick inspection and management tool for MikoPBX Docker containers.

## Quick Start

```bash
# Get info for all containers
.claude/skills/mikopbx-container-inspector/get-container-info.sh

# Get info for specific container
.claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83

# Restart container
.claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83

# List workers
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 list

# Restart specific worker
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 WorkerApiCommands
```

## What's Included

- **get-container-info.sh** - Retrieve all connection parameters (IP, ports, URLs, credentials)
- **restart-container.sh** - Gracefully restart container with service health checks
- **restart-worker.sh** - Restart specific worker process without full container restart

## Container Comparison

| Feature | mikopbx_php83 (develop) | mikopbx_php74 (old) |
|---------|------------------------|---------------------|
| API Version | v3 (`/pbxcore/api/v3`) | v1 (`/pbxcore/api`) |
| IP | 192.168.117.2 | 192.168.117.3 |
| HTTP Port | 8081 | 8082 |
| HTTPS Port | 8445 | 8444 |
| SSH Port | 8023 | 8024 |

## Common Use Cases

### Before Running API Tests
```bash
# Get API endpoint for pytest
./get-container-info.sh mikopbx_php83

# Use the displayed API URL:
# https://mikopbx_php83.localhost:8445/pbxcore/api/v3
```

### After Modifying PHP Code
```bash
# Quick worker restart (1-2 seconds)
./restart-worker.sh mikopbx_php83 WorkerApiCommands

# Or full container restart (15-30 seconds)
./restart-container.sh mikopbx_php83 --wait-services
```

### Testing in Both Versions
```bash
# Test in develop (API v3)
curl -k https://192.168.117.2:8445/pbxcore/api/v3/extensions

# Test in old release (API v1)
curl -k https://192.168.117.3:8444/pbxcore/api/extensions
```

## Documentation

See **SKILL.md** for complete documentation.
