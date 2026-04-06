---
name: m-refactor-api-tests-hardcoded-params
branch: feature/refactor-api-tests-hardcoded-params
status: completed
created: 2026-03-01
---

# Eliminate Hardcoded Parameters in Python API Tests

## Problem/Goal
Several API test files contain hardcoded paths, URLs, passwords, and duplicated infrastructure instead of using the centralized `config.py`, the `api_client` fixture, and the `CDRSeederRemote` helper. This makes tests fragile, environment-dependent, and inconsistent with the project's established patterns.

## Success Criteria
- [ ] `test_43_cdr_delete.py` uses `config.cdr_database_path` instead of hardcoded `/storage/usbdisk1/.../cdr.db`
- [ ] `test_44_passkeys.py` derives URL from `config.api_url` instead of hardcoded `mikopbx-php83.localhost:8081`
- [ ] `test_44_pbx_status.py` uses `api_client` fixture instead of duplicating its own `MikoPBXClient`
- [ ] `test_63_public_endpoints.py` uses `config.api_url` instead of `from conftest import API_URL`
- [ ] `test_02_acl.py` uses `config.api_url` for URL (but keeps manual `MikoPBXClient` creation for auth variation)
- [ ] `test_00_setup_clean_system.py` uses `api_client` fixture or `config.*` instead of manual `MikoPBXClient(API_URL, ...)`
- [ ] `test_01_auth.py` uses `config.api_username` instead of hardcoded `'admin'`
- [ ] `test_02_passwords.py` uses `config.api_username` instead of hardcoded `'admin'`
- [ ] `test_04_api_keys_permissions.py` imports `MikoPBXClient` properly and uses `config.api_url`
- [ ] All direct `subprocess.run(['docker', 'exec', ...])` replaced with `CDRSeederRemote._execute_command()` where applicable
- [ ] All ~60 previously clean test files remain unbroken
- [ ] Full test suite passes after changes

## Files to Modify

### High Priority
| File | Lines | Issue |
|------|-------|-------|
| `test_43_cdr_delete.py` | 113 | Hardcoded CDR DB path |
| `test_44_passkeys.py` | 169 | Hardcoded URL `mikopbx-php83.localhost:8081` |
| `test_44_pbx_status.py` | 14, 20 | Duplicates `api_client` fixture |
| `test_63_public_endpoints.py` | 18+ places | Manual `MikoPBXClient(API_URL)` via `from conftest import API_URL` |

### Medium Priority
| File | Lines | Issue |
|------|-------|-------|
| `test_02_acl.py` | 27, 36, 51, 90, 115, 130, 137 | Manual `MikoPBXClient` with conftest imports |
| `test_00_setup_clean_system.py` | 210-211 | Manual `MikoPBXClient(API_URL, ...)` |
| `test_01_auth.py` | 229, 330 | Hardcoded `'admin'` instead of `API_USERNAME` |

### Low Priority
| File | Lines | Issue |
|------|-------|-------|
| `test_02_passwords.py` | 184, 309 | `'admin'` in password reset payload |
| `test_04_api_keys_permissions.py` | multiple | `from conftest import MikoPBXClient` |

## Rules
1. DB paths -> `config.cdr_database_path` / `config.database_path`
2. Container name -> `config.container_name`
3. URL/passwords -> `config.api_url`, `config.api_username`, `config.api_password`
4. Client fixture -> `api_client` from conftest instead of manual `MikoPBXClient(...)`
5. Exception: `test_02_acl.py`, `test_63_public_endpoints.py`, `test_04_api_keys_permissions.py` may create `MikoPBXClient` manually (different auth), but URL must come from `config.api_url`
6. Commands -> `CDRSeederRemote._execute_command()` instead of direct `subprocess.run(['docker', 'exec', ...])`

## Context Manifest

### How The Infrastructure Currently Works

#### The Configuration Stack

The test suite uses a three-layer configuration system. At the bottom is `/tests/api/config.py`, which defines a `TestConfig` class and a module-level singleton accessed via `get_config()`. This class reads from environment variables (loaded from a `.env` file via `python-dotenv`) and exposes typed properties. Key properties:

- `api_url` → `MIKOPBX_API_URL` env var (required, no default)
- `api_username` → `MIKOPBX_API_USERNAME` env var (required, no default, though it has `'admin'` as a fallback in the property, it is validated as required in `_validate_required_vars`)
- `api_password` → `MIKOPBX_API_PASSWORD` env var (required, no default)
- `container_name` → `MIKOPBX_CONTAINER` env var (default: `'mikopbx-php83'`)
- `cdr_database_path` → `MIKOPBX_CDR_DB_PATH` env var (default: `'/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db'`)
- `database_path` → `MIKOPBX_DB_PATH` env var (default: `'/cf/conf/mikopbx.db'`)
- `execution_mode` → auto-detected or `MIKOPBX_EXECUTION_MODE` env var (`docker|api|ssh|local`)

On top of `config.py` sits `/tests/api/conftest.py`. At module load time, `conftest.py` calls `get_config()` and assigns module-level constants:

```python
config = get_config()
API_URL = config.api_url
API_USERNAME = config.api_username
API_PASSWORD = config.api_password
```

These three module-level names (`API_URL`, `API_USERNAME`, `API_PASSWORD`) exist in `conftest` for backward compatibility. `conftest.py` also defines the `MikoPBXClient` class and the `api_client` pytest fixture.

#### The `api_client` Fixture

```python
@pytest.fixture(scope='session')
def api_client() -> MikoPBXClient:
    client = MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)
    client.authenticate()
    yield client
    client.logout()
```

Scope is `session` — one authenticated client shared across all tests. `MikoPBXClient.__init__` signature:

```python
def __init__(self, base_url: str, login: str = None, password: str = None, auth_token: str = None):
```

Key points:
- `base_url` — the full API URL including `/v3` (e.g., `http://host/pbxcore/api/v3`)
- `auth_token` — alternative to login/password; used to inject API keys directly (used extensively in `test_04_api_keys_permissions.py` for restricted-key clients)
- When `auth_token` is set, `authenticate()` is not needed; the token is used immediately as Bearer token
- `authenticate()` performs `POST /auth:login` and stores the JWT in `self.access_token`

The `MikoPBXClient` in `conftest.py` is the canonical, production-quality client. It includes: retry logic for transient failures, automatic token refresh on 401, database-lock retry, SSL verification disabled.

#### The `CDRSeederRemote._execute_command()` Method

`/tests/api/helpers/cdr_seeder_remote.py` contains `CDRSeederRemote` with a `_execute_command(command, timeout=120)` method. This method dispatches the command across four modes:

- `docker`: runs `docker exec {container_name} bash -c {command}` using `subprocess.run`
- `api`: calls the `system:executeBashCommand` REST endpoint
- `ssh`: runs `ssh {user}@{host} {command}` using `subprocess.run`
- `local`: runs `bash -c {command}` using `subprocess.run`

The mode is auto-detected from environment variables (same logic as `TestConfig.execution_mode`). The method always returns a `subprocess.CompletedProcess`-like object with `.returncode`, `.stdout`, `.stderr`.

---

### Exact Hardcoded Values Found Per File

#### 1. `test_43_cdr_delete.py` — Hardcoded CDR DB Path

**Location: line 113**

```python
response = api_client.post('system:executeBashCommand', data={
    'command': f"sqlite3 /storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db '{escaped_sql}'"
})
```

The path `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db` is hardcoded in `create_linked_cdr_records()`. This must become `config.cdr_database_path`.

**How to fix:** Import config at top of file and use the property:

```python
from config import get_config
config = get_config()
# ...
f"sqlite3 {config.cdr_database_path} '{escaped_sql}'"
```

No other hardcoded issues in this file — it correctly uses `api_client` fixture (not a duplicated client).

---

#### 2. `test_44_passkeys.py` — Hardcoded URL in `origin` parameter

**Location: line 169**

```python
origin = urllib.parse.quote('https://mikopbx-php83.localhost:8081', safe='')
```

The URL `https://mikopbx-php83.localhost:8081` is completely hardcoded. This should derive from `config.api_url`. The `api_url` contains the full API path (e.g., `http://mikopbx-php83.localhost:8081/pbxcore/api/v3`). To extract just the scheme+host+port, the fix should parse the URL:

```python
from urllib.parse import urlparse
from config import get_config
config = get_config()
parsed = urlparse(config.api_url)
base_origin = f"{parsed.scheme}://{parsed.netloc}"
origin = urllib.parse.quote(base_origin, safe='')
```

No other issues in this file — it correctly uses `api_client` fixture.

---

#### 3. `test_44_pbx_status.py` — Duplicated `api_client` Fixture

**Locations: lines 14 and 20**

```python
from conftest import MikoPBXClient, API_URL, API_USERNAME, API_PASSWORD

@pytest.fixture(scope='module')
def client():
    """Create authenticated API client for this test module"""
    client = MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)
    client.authenticate()
    return client
```

This file creates its own `client` fixture at `scope='module'` that duplicates the session-scoped `api_client` from conftest. All test methods use `client` instead of `api_client`. This is the most architecturally problematic case.

**How to fix:** Delete the local `client` fixture entirely, rename the fixture parameter in all test methods from `client` to `api_client`, and remove the `from conftest import MikoPBXClient, API_URL, API_USERNAME, API_PASSWORD` import. The session-scoped `api_client` is already available to all tests.

Test methods affected: `test_get_active_calls_success`, `test_get_active_calls_structure`, `test_get_active_calls_no_auth_localhost`, `test_get_active_channels_success`, `test_get_active_channels_structure`, `test_get_active_channels_empty`, `test_get_active_calls_response_time`, `test_get_active_channels_response_time` (all 8 test methods in the file).

---

#### 4. `test_63_public_endpoints.py` — `from conftest import API_URL` and Manual Client Creation

**Location: line 29**

```python
from conftest import MikoPBXClient, API_URL, assert_api_success
```

This import pattern is not wrong per se (conftest exports `API_URL` as a module-level name derived from config), but the task requires moving to `config.api_url` directly.

**Actual usage pattern throughout the file:** Numerous places create unauthenticated `MikoPBXClient(API_URL)` for testing public endpoints. This is the correct behavior for these tests (they intentionally test without auth). The task rule 5 explicitly allows manual `MikoPBXClient` creation in `test_63_public_endpoints.py`, but the URL must come from `config.api_url`.

**Classes and methods with manual client creation:**
- `TestPublicEndpointsRegistry.test_01_priority1_ping_without_auth` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsRegistry.test_03_verify_endpoint_in_registry` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsMethodLevel.test_01_auth_login_without_token` — `MikoPBXClient(API_URL)` plus uses `f"{API_URL}/auth:login"`
- `TestPublicEndpointsMethodLevel.test_02_auth_refresh_without_token` — `MikoPBXClient(API_URL)` plus uses `f"{API_URL}/auth:refresh"`
- `TestPublicEndpointsMethodLevel.test_03_get_languages_without_auth` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsMethodLevel.test_04_change_language_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/system:changeLanguage"`
- `TestPublicEndpointsMethodLevel.test_05_passkeys_check_availability_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/passkeys:checkAvailability"`
- `TestPublicEndpointsMethodLevel.test_06_passkeys_authentication_start_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/passkeys:authenticationStart"`
- `TestPublicEndpointsMethodLevel.test_07_passkeys_authentication_finish_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/passkeys:authenticationFinish"`
- `TestPublicEndpointsMethodLevel.test_08_user_page_tracker_page_view_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/user-page-tracker:pageView"`
- `TestPublicEndpointsMethodLevel.test_09_user_page_tracker_page_leave_without_auth` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/user-page-tracker:pageLeave"`
- `TestPublicEndpointsNegative.test_01_protected_endpoint_requires_auth` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsNegative.test_03_optional_auth_provides_context` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsPriority.test_01_priority1_takes_precedence` — `MikoPBXClient(API_URL)`
- `TestPublicEndpointsPriority.test_02_method_level_attributes_work` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/{endpoint}"`
- `TestPublicEndpointsEdgeCases.test_01_method_specific_public_access` — `MikoPBXClient(API_URL)` plus `f"{API_URL}/system:ping"`
- `TestPublicEndpointsEdgeCases.test_02_public_endpoint_with_invalid_token` — uses `f"{API_URL}/system:ping"`
- `TestPublicEndpointsEdgeCases.test_03_cdr_playback_token_based_security` — `MikoPBXClient(API_URL)`

**How to fix:** Replace `from conftest import MikoPBXClient, API_URL, assert_api_success` with:

```python
from conftest import MikoPBXClient, assert_api_success
from config import get_config
config = get_config()
API_URL = config.api_url  # Keep as a local module-level variable for convenience
```

Since the file uses `API_URL` as a module-level name in many places, it is acceptable to reassign it locally from config after removing the conftest import. Alternatively, every occurrence of `API_URL` and `MikoPBXClient(API_URL)` could use `config.api_url` directly.

---

#### 5. `test_02_acl.py` — `from conftest import API_URL, API_USERNAME, API_PASSWORD` and Manual Clients

**Location: line 27**

```python
from conftest import assert_api_success, MikoPBXClient, API_URL, API_USERNAME, API_PASSWORD
```

**Actual usage throughout the file:**

- `TestAclBasics.test_01_request_without_token_returns_401` (line 36): `MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)` — intentionally no `.authenticate()` call, testing unauthenticated access. Correct pattern, just URL must come from config.
- `TestAclBasics.test_02_request_with_invalid_token_returns_401` (line 51): `MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)` then sets fake token
- `TestAclBasics.test_03_request_with_expired_token_returns_401` (line 90): `MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)` then sets expired token
- `TestAclBasics.test_05_public_endpoint_without_token` (line 115): `MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)` without auth
- `TestAclBasics.test_06_auth_endpoints_are_public` (line 130): `MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)` — also uses `f"{API_URL}/auth:login"` via `requests.post` directly
- `TestAclHttpMethods.test_02_post_requires_permission` (line 137, uses `api_client.base_url`): Actually this one already uses `api_client.session.post` with `api_client.base_url`, so no fix needed there.

Rule 5 permits manual `MikoPBXClient` creation in `test_02_acl.py` (different auth scenarios), but URL and credentials must come from `config.*`.

**How to fix the import:**

```python
from conftest import assert_api_success, MikoPBXClient
from config import get_config
config = get_config()
```

Then replace all occurrences of `API_URL`, `API_USERNAME`, `API_PASSWORD` with `config.api_url`, `config.api_username`, `config.api_password`. Also fix the direct `requests.post(f"{API_URL}/auth:login", ...)` call in `test_06_auth_endpoints_are_public`.

---

#### 6. `test_00_setup_clean_system.py` — Manual `MikoPBXClient(API_URL, ...)` in a Loop

**Location: lines 210-211**

```python
from conftest import API_URL, API_USERNAME, API_PASSWORD
test_client = MikoPBXClient(API_URL, API_USERNAME, API_PASSWORD)
test_client.authenticate()
```

This is inside `test_04_wait_for_system_restart`. The file already imports `MikoPBXClient` from `conftest` at the top (`from conftest import MikoPBXClient`). The inline import of `API_URL, API_USERNAME, API_PASSWORD` is inside the test method body (line 210: `from conftest import API_URL, API_USERNAME, API_PASSWORD`).

The reason a new client is created here instead of using `api_client` is valid: after a system reset, the system restarts, and the session-scoped `api_client` fixture still holds the old (invalidated) token. A fresh client needs to be created to test if the system came back online. This manual creation is therefore intentionally necessary for correctness.

**How to fix:** Replace the inline import with config usage:

```python
# Remove inline: from conftest import API_URL, API_USERNAME, API_PASSWORD
# Add at top of file:
from config import get_config
config = get_config()

# In the method:
test_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
test_client.authenticate()
```

The top-level `from conftest import MikoPBXClient` stays (it's needed to create the client).

---

#### 7. `test_01_auth.py` — Hardcoded `'admin'` String

**Locations: line 229 and line 330**

Line 229 (in `TestAuthEdgeCases.test_02_login_missing_password`):
```python
incomplete_data = {
    'login': 'admin'
    # Missing password
}
```

Line 330 (in `TestAuthEdgeCases.test_07_login_with_very_long_password`):
```python
long_password_data = {
    'login': 'admin',
    'password': 'A' * 300
}
```

Both use hardcoded `'admin'` instead of `API_USERNAME`. The file already imports `API_USERNAME` at line 25: `from conftest import assert_api_success, API_USERNAME, API_PASSWORD`.

**How to fix:** Replace `'admin'` with `API_USERNAME` (already imported). No import changes needed. Optionally, these could use `config.api_username` directly, but since `API_USERNAME` is already imported from conftest (which itself gets it from config), either approach is acceptable. The cleanest refactor consistent with the task rules:

```python
from conftest import assert_api_success
from config import get_config
config = get_config()
# Then use config.api_username and config.api_password
```

But the simpler fix (since `API_USERNAME` is already imported) is just to replace `'admin'` with `API_USERNAME`. The task says "uses `config.api_username` instead of hardcoded `'admin'`", meaning the value must not be a literal string — whether it comes via `API_USERNAME` (already from config) or directly via `config.api_username` is functionally identical.

---

#### 8. `test_02_passwords.py` — Hardcoded `'admin'` String

**Locations: line 184 and line 309**

Line 184 (in `TestPasswords.test_05_reset_password`):
```python
reset_data = {
    'email': 'admin@example.com',
    'username': 'admin'
}
```

Line 309 (in `TestPasswordsEdgeCases.test_05_reset_password_invalid_email`):
```python
reset_data = {
    'email': 'not-an-email',
    'username': 'admin'
}
```

These are in password reset payloads where `'admin'` is the username field. The file does NOT currently import `API_USERNAME` — it only imports `from conftest import assert_api_success`.

**How to fix:**

```python
from conftest import assert_api_success
from config import get_config
config = get_config()
# Then use config.api_username for 'username': config.api_username
```

---

#### 9. `test_04_api_keys_permissions.py` — `from conftest import MikoPBXClient`

**Location: multiple places in the file**

The file uses `from conftest import MikoPBXClient` inline inside multiple test methods:

- `test_10_read_only_get_allowed` (line 249): `from conftest import MikoPBXClient`
- `test_11_read_only_post_denied` (line 272): `from conftest import MikoPBXClient`
- `test_12_read_only_cdr_get_allowed` (line 315): `from conftest import MikoPBXClient`
- `test_20_write_key_get_allowed` (line 342): `from conftest import MikoPBXClient`
- `test_21_write_key_post_allowed` (line 363): `from conftest import MikoPBXClient`
- `test_22_write_key_read_endpoint_get_allowed` (line 397): `from conftest import MikoPBXClient`
- `test_30_forbidden_key_access_denied` (line 429): `from conftest import MikoPBXClient`
- `test_31_forbidden_key_allowed_endpoint_works` (line 459): `from conftest import MikoPBXClient`
- `test_40_full_permissions_unrestricted_access` (line 480): `from conftest import MikoPBXClient`
- `test_50_compare_restricted_vs_full_permissions` (line 520, 526): `from conftest import MikoPBXClient`
- `TestJwtVsApiKeyPermissions.test_02_api_key_restricted_vs_jwt_unrestricted` (line 643): `from conftest import MikoPBXClient`

All these inline imports should be moved to the top-level import. The task requires this import to be at module level. Additionally, throughout the file, client construction is: `MikoPBXClient(base_url=api_client.base_url, auth_token=self.readonly_key)`. This is correct — it uses `api_client.base_url` (from the fixture) rather than `API_URL`, so there is no hardcoded URL. The problem is only the inline import pattern.

**How to fix:** Move `from conftest import MikoPBXClient` to the top of the file alongside the existing `from conftest import assert_api_success`. Remove all inline import statements. The resulting import block at file top should be:

```python
from conftest import assert_api_success, MikoPBXClient
```

No URL/credential changes needed in this file since it uses `api_client.base_url`.

---

### The `CDRSeederRemote._execute_command()` Replacement Pattern

The task requires replacing direct `subprocess.run(['docker', 'exec', ...])` calls with `CDRSeederRemote._execute_command()`. Scanning all the target files:

- **`test_43_cdr_delete.py`**: Does NOT use `subprocess.run` directly. The `create_linked_cdr_records` method uses `api_client.post('system:executeBashCommand', ...)`, which is correct REST API execution, not subprocess.
- **`test_00_setup_clean_system.py`**: Does NOT use `subprocess.run` directly.
- No other files in the target list use direct subprocess docker exec calls.

The subprocess concern is primarily relevant if any of these test files had raw `subprocess.run(['docker', 'exec', ...])` patterns. Based on reading, none of the target files do. The `CDRSeederRemote._execute_command()` replacement pattern is relevant to keep in mind but may not require any changes in these specific files.

---

### Import Patterns — Clean vs Dirty

**Clean pattern (what clean files like `test_05_general_settings.py` use):**
```python
from conftest import assert_api_success
# (api_client comes via pytest fixture injection, no import needed)
```

**Clean pattern for files that need unauthenticated clients (rule 5 exceptions):**
```python
from conftest import MikoPBXClient, assert_api_success
from config import get_config
config = get_config()
# Use config.api_url, config.api_username, config.api_password for client construction
```

**Anti-patterns to eliminate:**
- `from conftest import API_URL` — import the module-level constant instead of getting from config
- `from conftest import API_USERNAME, API_PASSWORD` — same issue
- Inline `from conftest import MikoPBXClient` inside test methods
- Hardcoded `'admin'` string literal in test data when config value should be used
- Hardcoded URL strings like `'mikopbx-php83.localhost:8081'`
- Hardcoded DB paths like `'/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db'`
- Local fixture that duplicates `api_client` (creating a module-scoped fixture when session-scoped exists)

---

### Technical Reference Details

#### Configuration Properties Available in `TestConfig`

```python
config.api_url           # Full API URL (e.g., http://host:8081/pbxcore/api/v3)
config.api_username      # Login username (e.g., 'admin')
config.api_password      # Login password
config.container_name    # Docker container name (e.g., 'mikopbx-php83')
config.cdr_database_path # CDR DB path inside container (e.g., /storage/usbdisk1/.../cdr.db)
config.database_path     # Main DB path inside container (e.g., /cf/conf/mikopbx.db)
config.execution_mode    # 'docker' | 'api' | 'ssh' | 'local'
config.ssh_host          # SSH host (or None)
config.ssh_user          # SSH username
```

#### Module-Level Names Exported From `conftest.py` (for use in imports)

```python
from conftest import MikoPBXClient    # The client class
from conftest import assert_api_success  # Assertion helper
from conftest import assert_record_exists  # Another helper
from conftest import API_URL           # = config.api_url (maintained for backward compat)
from conftest import API_USERNAME      # = config.api_username
from conftest import API_PASSWORD      # = config.api_password
```

The task says files should use `config.*` directly rather than the conftest module-level re-exports. However, files that only need to import `API_USERNAME` (already from config) can equivalently use the conftest export — both point to the same value.

#### `MikoPBXClient` Constructor Signatures

```python
# Standard authenticated client (session fixture pattern):
client = MikoPBXClient(base_url, login, password)
client.authenticate()

# API-key authenticated client (for permission tests):
client = MikoPBXClient(base_url=api_client.base_url, auth_token=some_api_key)

# Unauthenticated client (for testing public endpoints / 401 behavior):
client = MikoPBXClient(base_url)  # No login/password, no authenticate() call
```

#### `CDRSeederRemote._execute_command()` Signature

```python
def _execute_command(self, command: str, timeout: int = 120) -> subprocess.CompletedProcess:
    # Returns object with .returncode, .stdout, .stderr
    # Dispatches to docker/api/ssh/local based on self.execution_mode
```

Instantiation: `seeder = CDRSeederRemote()` — no arguments, reads all config from environment.

#### URL Parsing Pattern for `test_44_passkeys.py`

To derive a WebAuthn `origin` from `config.api_url`:

```python
from urllib.parse import urlparse
from config import get_config
config = get_config()

parsed = urlparse(config.api_url)
base_origin = f"{parsed.scheme}://{parsed.netloc}"
# e.g., "http://mikopbx-php83.localhost:8081"
origin = urllib.parse.quote(base_origin, safe='')
```

#### File Locations

- Config singleton: `/tests/api/config.py`
- Conftest (fixtures + MikoPBXClient): `/tests/api/conftest.py`
- CDRSeederRemote: `/tests/api/helpers/cdr_seeder_remote.py`
- Files to modify:
  - `/tests/api/test_43_cdr_delete.py` — fix cdr_database_path
  - `/tests/api/test_44_passkeys.py` — fix hardcoded origin URL
  - `/tests/api/test_44_pbx_status.py` — replace local `client` fixture with `api_client`
  - `/tests/api/test_63_public_endpoints.py` — move API_URL import to config
  - `/tests/api/test_02_acl.py` — move API_URL/USERNAME/PASSWORD to config
  - `/tests/api/test_00_setup_clean_system.py` — fix inline import in test_04
  - `/tests/api/test_01_auth.py` — replace `'admin'` literals
  - `/tests/api/test_02_passwords.py` — replace `'admin'` literals, add config import
  - `/tests/api/test_04_api_keys_permissions.py` — move MikoPBXClient to top-level import

#### Important Behavioral Notes

1. **`test_44_pbx_status.py`**: After removing the local `client` fixture, the fixture parameter name in every test method signature must change from `client` to `api_client`. This is a rename-in-place operation. Note that pytest discovers fixtures by parameter name — `api_client` is the name registered by the session-scoped fixture in conftest.

2. **`test_02_acl.py` test_06**: The method `test_06_auth_endpoints_are_public` directly calls `requests.post(f"{API_URL}/auth:login", ...)` using the raw `requests` module (not `api_client`). This hardcoded URL construction must also be updated to use `config.api_url`.

3. **Scope mismatch in `test_44_pbx_status.py`**: The local fixture is `scope='module'` while `api_client` is `scope='session'`. This is not a problem when switching — `session` scope means the client is shared but still valid for module-scoped tests.

4. **`test_02_passwords.py` context**: The `'admin'` value in `reset_data` payloads (lines 184 and 309) represents a username sent to the password reset API. Replacing with `config.api_username` means the test will use whatever username is configured, which is always correct behavior for a test that's checking validation/error handling.

5. **The `API_URL` variable in conftest is safe to import** as it reflects config, but the task wants direct config usage. Files importing it as `from conftest import API_URL` should be changed to `from config import get_config; config = get_config()` and then use `config.api_url`.

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
- [2026-03-01] Task created
- [2026-03-01] All 9 test files refactored, 110/112 tests passed (2 pre-existing failures), committed and pushed to feature branch
