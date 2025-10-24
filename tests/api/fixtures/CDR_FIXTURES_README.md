# CDR Test Fixtures

This directory contains anonymized CDR (Call Detail Records) data for testing the REST API.

## Files

### `cdr_seed_data.sql`
SQL INSERT statements to populate the CDR database with 30 test records.

**Distribution:**
- 18 ANSWERED calls (15 with recordings, 3 without)
- 8 NOANSWER calls
- 4 Failed calls (BUSY, CANCEL, CHANUNAVAIL)

**Characteristics:**
- Test record IDs: 1-30
- Anonymized phone numbers:
  - Mobile: 79XXXXXXXXX (random but consistent)
  - Internal extensions: 201-299
- Dates: October 1-24, 2025 (recent for testing)
- Recording files: `/tmp/test_monitor/YYYY/MM/DD/HH/mikopbx-{uniqueid}.mp3`

### `cdr_test_data.json`
JSON representation of the same 30 records for Python fixture loading.

## Data Source

This data was extracted and anonymized from production CDR database using `extract_cdr_data.py` (now removed).

**Anonymization:**
- Phone numbers: hashed and mapped to realistic formats
- Dates: shifted to October 2025
- No customer-identifiable information retained

## Usage in Tests

### Automatic Seeding (Default)

The `seed_cdr_database` fixture in `conftest.py` automatically loads this data before tests run:

```python
# No code needed - runs automatically
def test_get_cdr_list(api_client):
    response = api_client.get('cdr', params={'limit': 50})
    # Will find 30 test records
```

### Access Test CDR IDs

```python
def test_get_cdr_by_id(api_client, cdr_test_ids):
    cdr_id = cdr_test_ids[0]  # Get first test CDR ID (ID=1)
    response = api_client.get(f'cdr/{cdr_id}')
```

### Disable Seeding

```bash
# Disable automatic CDR seeding
ENABLE_CDR_SEED=0 pytest test_43_cdr.py

# Disable cleanup (keep data after tests)
ENABLE_CDR_CLEANUP=0 pytest test_43_cdr.py
```

## Recording Files

The seeder creates minimal valid MP3 files (417 bytes each) for the 15 records that have `recordingfile` set:

```
/tmp/test_monitor/
├── 2023/
│   ├── 02/27/10/mikopbx-1677482516.37899_ViH8gh.mp3
│   ├── 04/14/17/mikopbx-1681481021.849_KuJW64.mp3
│   └── ...
├── 2024/
│   └── ...
└── 2025/
    └── ...
```

These MP3 files are:
- Valid MP3 format (ID3v2 + MPEG frame)
- 417 bytes (minimal playable file)
- Created automatically by CDRSeeder
- Cleaned up after tests

## Regenerating Fixtures

If you need to regenerate these fixtures from a new production database:

1. Restore `extract_cdr_data.py` from git history
2. Run: `python tests/api/fixtures/extract_cdr_data.py /path/to/cdr.db`
3. Review generated `cdr_seed_data.sql` and `cdr_test_data.json`
4. Commit updated fixtures
5. Delete `extract_cdr_data.py` again

## Implementation

### Architecture

The CDR seeding system uses a **remote execution** architecture that works regardless of where MikoPBX is running:

```
Python Tests (Host)
    ↓
CDRSeederRemote (Python wrapper)
    ↓
docker exec / SSH / local
    ↓
seed_cdr_database.sh (Bash script on MikoPBX station)
    ↓
sqlite3 CLI + filesystem operations
```

### Components

1. **`tests/api/scripts/seed_cdr_database.sh`** - Bash script that runs ON the MikoPBX station
   - Self-contained, no Python dependencies
   - Uses only standard Unix tools (bash, sqlite3, dd, grep)
   - Can be executed via docker exec, SSH, or locally

2. **`tests/api/helpers/cdr_seeder_remote.py`** - Python wrapper for remote execution
   - Auto-detects execution mode (Docker, SSH, or local)
   - Handles communication with MikoPBX station
   - Used by pytest fixtures

3. **`tests/api/helpers/cdr_seeder.py`** - Legacy local seeder (deprecated)
   - Kept for backward compatibility
   - New code should use `cdr_seeder_remote.py`

4. **`tests/api/conftest.py`** - Pytest fixtures (lines 1253-1345)
   - `seed_cdr_database` - Auto-use session fixture
   - `cdr_test_ids` - Provides list of test CDR IDs

### Execution Modes

The seeder automatically detects and supports three execution modes:

1. **Docker mode** (default for local development)
   ```bash
   docker exec mikopbx_php83 /usr/www/tests/api/scripts/seed_cdr_database.sh seed
   ```

2. **SSH mode** (for remote/cloud installations)
   ```bash
   MIKOPBX_SSH_HOST=192.168.1.100 pytest test_43_cdr.py
   ```

3. **Local mode** (for direct execution on MikoPBX station)
   ```bash
   /usr/www/tests/api/scripts/seed_cdr_database.sh seed
   ```

### Technical Details

- Bash script runs ON MikoPBX station (container, remote machine, or cloud)
- Uses `sqlite3` CLI for database operations (no Python sqlite3 module required)
- Creates minimal valid MP3 files (417 bytes) using `dd` and `printf`
- Resilient to container restarts (tests invoke script remotely each time)
- No dependencies on Python packages inside container

## Notes

- CDR records are READ-ONLY via API (created only by actual phone calls)
- These fixtures allow CDR API testing without making real calls
- Data is fully anonymized and safe to commit to repository
- Seeding takes ~2 seconds (SQL insert + 15 MP3 files)
