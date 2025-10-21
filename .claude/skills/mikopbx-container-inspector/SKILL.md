---
name: mikopbx-container-inspector
description: Inspecting MikoPBX Docker containers (mikopbx_php83/mikopbx_php74) to retrieve connection parameters (IP, ports), restart containers, and manage workers. Use when debugging containers, running tests, or troubleshooting connectivity issues.
---

# mikopbx-container-inspector

Quick inspection and management of MikoPBX Docker containers to retrieve connection parameters, restart services, and troubleshoot issues.

## When to Use This Skill

Use this skill when you need to:
- Get container IP addresses and ports for API testing
- Restart containers after code changes
- Restart specific workers inside containers
- Troubleshoot connectivity issues
- Verify container status and health
- Find connection URLs for browser/Playwright testing
- Check which container version is running (develop vs old release)

## What This Skill Does

1. **Detects running containers** - Finds mikopbx_php83 (develop) and mikopbx_php74 (old release)
2. **Retrieves connection info** - IP addresses, HTTP/HTTPS/SIP/SSH ports
3. **Generates access URLs** - Ready-to-use URLs with correct API paths for each version
4. **Manages containers** - Restart containers and workers
5. **Health checks** - Verifies services are running properly

## Container Overview

### mikopbx_php83 (Develop Branch - New Release)
- **Purpose**: Development and testing of latest features
- **API Version**: v3 (`/pbxcore/api/v3`)
- **Default Ports**: HTTP: 8081, HTTPS: 8445, SIP: 5060, SSH: 8023
- **Default IP**: Usually 192.168.117.2
- **API URL**: `https://mikopbx_php83.localhost:8445/pbxcore/api/v3`

### mikopbx_php74 (Old Release)
- **Purpose**: Stable release for comparison testing
- **API Version**: v1 (`/pbxcore/api`)
- **Default Ports**: HTTP: 8082, HTTPS: 8444, SSH: 8024
- **Default IP**: Usually 192.168.117.3
- **API URL**: `https://mikopbx_php74.localhost:8444/pbxcore/api`

## Quick Start

```bash
# Get all container info
.claude/skills/mikopbx-container-inspector/get-container-info.sh

# Get specific container info
.claude/skills/mikopbx-container-inspector/get-container-info.sh mikopbx_php83

# Restart container with service wait
.claude/skills/mikopbx-container-inspector/restart-container.sh mikopbx_php83 --wait-services

# List workers
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 list

# Restart specific worker
.claude/skills/mikopbx-container-inspector/restart-worker.sh mikopbx_php83 WorkerApiCommands
```

See **QUICKSTART.md** for command reference card.

## Available Scripts

### get-container-info.sh

Retrieves all connection parameters for containers.

**Usage**: `./get-container-info.sh [container_name]`

**Returns**:
- Container status and ID
- IP address
- Port mappings (internal and external)
- Web interface URLs (with correct API version)
- Direct IP access URLs
- Database path
- Common commands

**Example**:
```bash
# Get info for mikopbx_php83
./get-container-info.sh mikopbx_php83

# Output includes:
# - IP: 192.168.117.2
# - API: https://mikopbx_php83.localhost:8445/pbxcore/api/v3
# - Credentials: admin / 123456789MikoPBX#1
```

**When to use**: Before running API tests, Playwright tests, or when debugging connectivity.

### restart-container.sh

Gracefully restarts container with optional service health checks.

**Usage**: `./restart-container.sh <container_name> [--wait-services|--no-wait]`

**Options**:
- `--wait-services` (default): Wait for PHP-FPM, Redis, Asterisk, and Web to be ready
- `--no-wait`: Restart and return immediately

**Duration**: 5-10 seconds (quick) / 15-30 seconds (with service wait)

**Example**:
```bash
# Restart and wait for all services
./restart-container.sh mikopbx_php83 --wait-services

# Quick restart without waiting
./restart-container.sh mikopbx_php83 --no-wait
```

**When to use**: After modifying PHP code, configuration files, or when services become unresponsive.

### restart-worker.sh

Restarts specific worker process without full container restart.

**Usage**: `./restart-worker.sh <container_name> <worker_name|list>`

**Available Workers**:
- `WorkerApiCommands` - REST API processor
- `WorkerAMI` - Asterisk Manager Interface
- `WorkerCdr` - Call Detail Records processor
- `WorkerModelsEvents` - Database event processor
- `WorkerNotifyError` - Error notification handler
- `WorkerSafeScripts` - Safe script executor

**Duration**: 1-2 seconds

**Example**:
```bash
# List running workers
./restart-worker.sh mikopbx_php83 list

# Restart API worker after changing REST controller
./restart-worker.sh mikopbx_php83 WorkerApiCommands
```

**When to use**: After modifying worker code, when worker appears stuck, or for quick reload during development.

## API Version Differences

**Critical**: Always use the correct API path for each version!

| Container | API Path | Example |
|-----------|----------|---------|
| mikopbx_php83 | `/pbxcore/api/v3` | `https://192.168.117.2:8445/pbxcore/api/v3/extensions` |
| mikopbx_php74 | `/pbxcore/api` | `https://192.168.117.3:8444/pbxcore/api/extensions` |

Using wrong API path will result in 404 errors.

## Common Scenarios

### Before Running API Tests
```bash
# Get API endpoint URL
./get-container-info.sh mikopbx_php83

# Use displayed URL in pytest:
# export MIKOPBX_API_URL="https://192.168.117.2:8445/pbxcore/api/v3"
```

### After Modifying PHP Code
```bash
# Full container restart (required for core changes)
./restart-container.sh mikopbx_php83 --wait-services
```

### After Modifying REST API Code
```bash
# Quick worker restart (faster than full container restart)
./restart-worker.sh mikopbx_php83 WorkerApiCommands
```

### Comparing API Behavior Between Versions
```bash
# Test in develop (API v3)
curl -k https://192.168.117.2:8445/pbxcore/api/v3/extensions

# Test in old release (API v1)
curl -k https://192.168.117.3:8444/pbxcore/api/extensions
```

See **examples.md** for more detailed scenarios and usage patterns.

## Health Checks

The skill performs automatic health checks when using `--wait-services`:

- **PHP-FPM**: Process is running
- **Redis**: Responds to ping
- **Asterisk**: CLI is accessible
- **Web Interface**: HTTP responds

Each check has 60-second timeout with 2-second polling interval.

## When to Restart What

| Changed | Action | Script |
|---------|--------|--------|
| REST API code | Restart API worker | `restart-worker.sh ... WorkerApiCommands` |
| Model/Controller | Restart container | `restart-container.sh ... --wait-services` |
| Config files | Restart container | `restart-container.sh ... --wait-services` |
| Worker code | Restart worker | `restart-worker.sh ... Worker<Name>` |
| JavaScript (transpiled) | No restart needed | Just refresh browser |

## Default Credentials

Both containers use the same credentials:

```
Username: admin
Password: 123456789MikoPBX#1
```

## Performance Tips

1. **Use IP instead of hostname** for faster access (avoids DNS lookup)
2. **Use HTTP instead of HTTPS** in development (avoids SSL handshake)
3. **Restart workers instead of containers** when possible (1-2s vs 15-30s)

## Integration with Other Skills

### Works With mikopbx-docker-restart-tester
- This skill provides container info
- restart-tester performs full restart with test execution

### Works With rest-api-docker-tester
- This skill provides correct API endpoint URL (with version)
- rest-api-docker-tester uses it for CURL requests

### Works With mikopbx-web-tester
- This skill provides web interface URL and credentials
- web-tester uses it for Playwright navigation

## Additional Documentation

- **QUICKSTART.md** - Quick reference card with most common commands
- **examples.md** - Detailed usage examples and scenarios
- **port-reference.md** - Complete port mapping guide
- **troubleshooting.md** - Solutions for common issues
- **README.md** - Overview and quick start

## Quick Reference

```
┌──────────────────────────────────────────────────────────────────┐
│ mikopbx_php83 (develop - API v3)                                 │
│   IP:  192.168.117.2                                             │
│   API: https://mikopbx_php83.localhost:8445/pbxcore/api/v3       │
│                                                                  │
│ mikopbx_php74 (old - API v1)                                     │
│   IP:  192.168.117.3                                             │
│   API: https://mikopbx_php74.localhost:8444/pbxcore/api          │
│                                                                  │
│ Credentials: admin / 123456789MikoPBX#1                          │
└──────────────────────────────────────────────────────────────────┘
```

## Error Handling

All scripts provide clear error messages and exit codes:

- **Exit 0**: Success
- **Exit 1**: Container not found or not running
- **Exit 2**: Operation failed (restart failed, worker not found)
- **Exit 3**: Service startup timeout

See **troubleshooting.md** for detailed error solutions.

## Script Safety

All scripts use:
- `set -e` for immediate error exit
- Graceful SIGHUP signals for worker restart
- 60-second timeouts with polling for service checks
- Clear validation of container existence before operations
- Informative error messages with suggested solutions
