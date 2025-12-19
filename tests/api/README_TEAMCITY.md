# TeamCity Configuration for MikoPBX REST API Tests

This document describes how to configure TeamCity to run MikoPBX REST API tests with 0 skipped tests.

## Quick Start

For immediate test execution with minimal configuration:

```bash
# Set required environment variables
export MIKOPBX_API_URL=http://your-mikopbx-host/pbxcore/api/v3
export MIKOPBX_LOGIN=admin
export MIKOPBX_PASSWORD=your_password
export ENABLE_CDR_SEED=1

# Run tests
python3 -m pytest tests/api/ -v
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MIKOPBX_API_URL` | Full URL to MikoPBX REST API v3 | `http://192.168.1.100/pbxcore/api/v3` |
| `MIKOPBX_LOGIN` | API login (usually admin) | `admin` |
| `MIKOPBX_PASSWORD` | API password | `your_secure_password` |

### CDR Seeding Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_CDR_SEED` | `1` | Enable CDR database seeding (set to `1` for TeamCity) |
| `ENABLE_CDR_CLEANUP` | `1` | Clean up CDR test data after tests |
| `FIXTURES_DIR` | auto-detected | Path to fixtures on remote host |

### Execution Mode Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MIKOPBX_EXECUTION_MODE` | auto-detected | Force execution mode: `docker`, `api`, `ssh`, `local` |
| `MIKOPBX_CONTAINER` | `mikopbx-php83` | Docker container name (for docker mode) |
| `MIKOPBX_SSH_HOST` | - | SSH hostname (forces ssh mode) |
| `MIKOPBX_SSH_USER` | `root` | SSH username |

### Destructive Test Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SYSTEM_RESET` | `0` | Enable factory reset before tests (DANGEROUS) |
| `ENABLE_DESTRUCTIVE_TESTS` | `0` | Enable tests that delete all data |

## Execution Modes

The test suite supports four execution modes for running commands on MikoPBX:

### 1. API Mode (Recommended for TeamCity)

Uses REST API `system:executeBashCommand` endpoint. Best for remote CI/CD.

```bash
export MIKOPBX_API_URL=http://mikopbx-host/pbxcore/api/v3
export MIKOPBX_EXECUTION_MODE=api
```

### 2. Docker Mode

Uses `docker exec` to run commands inside container. Best for local development.

```bash
export MIKOPBX_CONTAINER=mikopbx-php83
export MIKOPBX_EXECUTION_MODE=docker
```

### 3. SSH Mode

Uses SSH to run commands on remote host. Fallback for API mode.

```bash
export MIKOPBX_SSH_HOST=192.168.1.100
export MIKOPBX_SSH_USER=root
export MIKOPBX_EXECUTION_MODE=ssh
```

### 4. Local Mode

Runs commands directly on local filesystem. For running tests inside container.

```bash
export MIKOPBX_EXECUTION_MODE=local
```

## TeamCity Build Configuration

### Build Step: Run Tests

```bash
#!/bin/bash
set -e

# Configure environment
export MIKOPBX_API_URL="${env.MIKOPBX_API_URL}"
export MIKOPBX_LOGIN="${env.MIKOPBX_LOGIN}"
export MIKOPBX_PASSWORD="${env.MIKOPBX_PASSWORD}"
export ENABLE_CDR_SEED=1
export ENABLE_CDR_CLEANUP=1

# Install dependencies
pip install -r tests/api/requirements.txt

# Run tests with JUnit XML output
python3 -m pytest tests/api/ \
    --junitxml=test-results.xml \
    -v \
    --tb=short \
    2>&1 | tee test-output.log
```

### Build Parameters

Add these parameters in TeamCity:

| Parameter | Type | Description |
|-----------|------|-------------|
| `env.MIKOPBX_API_URL` | Configuration parameter | MikoPBX API URL |
| `env.MIKOPBX_LOGIN` | Configuration parameter | API login |
| `env.MIKOPBX_PASSWORD` | Password parameter | API password (masked) |

## Remote Host Setup

For TeamCity to execute CDR seeding on a remote MikoPBX host, deploy test files:

```bash
# On MikoPBX host
mkdir -p /storage/usbdisk1/mikopbx/python-tests/scripts
mkdir -p /storage/usbdisk1/mikopbx/python-tests/fixtures

# Copy test files (from CI/CD or git)
scp tests/api/scripts/*.sh root@mikopbx:/storage/usbdisk1/mikopbx/python-tests/scripts/
scp tests/api/scripts/*.py root@mikopbx:/storage/usbdisk1/mikopbx/python-tests/scripts/
scp tests/api/fixtures/*.json root@mikopbx:/storage/usbdisk1/mikopbx/python-tests/fixtures/

# Make scripts executable
ssh root@mikopbx 'chmod +x /storage/usbdisk1/mikopbx/python-tests/scripts/*.sh'
```

## Dynamic CDR Date Generation

The test suite automatically generates CDR seed data with dates relative to the current date. This ensures tests always have recent data regardless of when they run.

### How it works:

1. `seed_cdr_database.sh` calls `generate_cdr_fixtures.py` before loading SQL
2. Generator reads `cdr_test_data.json` template
3. Generator outputs `cdr_seed_data.sql` with current month dates
4. SQL is loaded into CDR database

### Fallback behavior:

If Python3 is unavailable on the remote host, the static `cdr_seed_data.sql` is used. In this case, ensure the static file has recent dates or tests may skip.

## Troubleshooting

### Tests Skip with "No CDR data available"

**Cause:** CDR seeding failed or dates are in the past.

**Solution:**
1. Check that `ENABLE_CDR_SEED=1` is set
2. Verify Python3 is available on MikoPBX host
3. Check that fixtures are deployed to remote host
4. Review CDR seeding output in test logs

### Authentication Errors (401)

**Cause:** Invalid API credentials.

**Solution:**
1. Verify `MIKOPBX_LOGIN` and `MIKOPBX_PASSWORD`
2. Check MikoPBX web interface works with same credentials
3. Ensure API is enabled in MikoPBX settings

### Connection Errors

**Cause:** Network issues or wrong URL.

**Solution:**
1. Verify `MIKOPBX_API_URL` is reachable from TeamCity agent
2. Check firewall allows connections to MikoPBX port (80/443)
3. Test with curl: `curl -v http://mikopbx-host/pbxcore/api/v3/system:ping`

### Passkeys Tests Skip

**Expected:** Passkeys (WebAuthn) tests skip because the feature is not implemented. This is intentional and does not indicate a problem.

## Test Execution Order

Tests run alphabetically by filename:

1. `test_00_setup_clean_system.py` - Factory reset (only if `ENABLE_SYSTEM_RESET=1`)
2. `test_00a_cdr_seed.py` - CDR database seeding
3. `test_01_auth.py` - `test_99_*.py` - Main test suite

## Example .env File

Create `tests/api/.env` for local development:

```bash
# MikoPBX Connection
MIKOPBX_API_URL=http://localhost:8080/pbxcore/api/v3
MIKOPBX_LOGIN=admin
MIKOPBX_PASSWORD=admin

# CDR Seeding
ENABLE_CDR_SEED=1
ENABLE_CDR_CLEANUP=1

# Docker mode (for local development)
MIKOPBX_CONTAINER=mikopbx-php83
MIKOPBX_EXECUTION_MODE=docker

# Safety (keep disabled unless you know what you're doing)
ENABLE_SYSTEM_RESET=0
ENABLE_DESTRUCTIVE_TESTS=0
```
