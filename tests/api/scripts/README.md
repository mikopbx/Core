# Test Scripts

This directory contains bash scripts that run ON the MikoPBX station (inside container, remote machine, or cloud).

## Files

### `seed_cdr_database.sh`

Bash script for seeding CDR test data. Designed to be invoked remotely from Python tests.

**Usage:**

```bash
# Seed database
./seed_cdr_database.sh seed

# Cleanup test data
./seed_cdr_database.sh cleanup

# Verify seeding (returns count)
./seed_cdr_database.sh verify

# Get test CDR IDs
./seed_cdr_database.sh ids
```

**Remote Execution Examples:**

```bash
# Via docker exec
docker exec mikopbx_php83 /usr/www/tests/api/scripts/seed_cdr_database.sh seed

# Via SSH
ssh root@192.168.1.100 '/usr/www/tests/api/scripts/seed_cdr_database.sh seed'
```

**Environment Variables:**

- `CDR_DB_PATH` - Path to CDR database (default: `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`)
- `FIXTURES_DIR` - Path to fixtures (default: `/usr/www/tests/api/fixtures`)
- `MONITOR_BASE` - Path to recordings (default: `/tmp/test_monitor`)
- `ENABLE_CDR_SEED` - Enable/disable seeding (default: `1`)
- `ENABLE_CDR_CLEANUP` - Enable/disable cleanup (default: `1`)

## Design Principles

1. **Self-Contained**: Uses only standard Unix tools (bash, sqlite3, dd, grep, printf)
2. **No Python Dependencies**: Runs independently of Python environment
3. **Remote Execution**: Can be invoked via docker exec, SSH, or locally
4. **Idempotent**: Safe to run multiple times
5. **Resilient**: Works after container restarts

## See Also

- `tests/api/helpers/cdr_seeder_remote.py` - Python wrapper for remote execution
- `tests/api/fixtures/CDR_FIXTURES_README.md` - Complete CDR testing documentation
- `tests/api/conftest.py` - Pytest fixtures using these scripts
