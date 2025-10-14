# New REST API v3 Tests (test_15 through test_22)

Quick reference guide for newly created individual endpoint tests.

## Overview
Created 8 comprehensive test files (135 tests total) for specific MikoPBX REST API v3 endpoints.
These complement the existing fixture-based setup tests.

## Quick Start

```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/api

# Run all working tests (no database writes)
pytest test_16_fail2ban.py test_20_advice.py test_21_auth.py test_22_cdr.py -v -s

# Run specific test
pytest test_21_auth.py::TestAuth::test_01_login_with_password -v -s
```

## Test Files

| File | Endpoint | Tests | Status | Notes |
|------|----------|-------|--------|-------|
| test_15_firewall.py | /firewall | 18 | ⚠️ | DB lock on CREATE |
| test_16_fail2ban.py | /fail2ban | 15 | ✅ | Read-only, works |
| test_17_asterisk_managers.py | /asterisk-managers | 15 | ⚠️ | DB lock on CREATE |
| test_18_api_keys.py | /api-keys | 17 | ⚠️ | 3 methods work |
| test_19_asterisk_rest_users.py | /asterisk-rest-users | 14 | ⚠️ | Not tested yet |
| test_20_advice.py | /advice | 16 | ✅ | Read-only, works |
| test_21_auth.py | /auth | 17 | ✅ | JWT auth, works |
| test_22_cdr.py | /cdr | 23 | ✅ | Read-only, works |

## Key Differences from Setup Tests

### Setup Tests (existing)
- Populate MikoPBX with fixtures
- Sequential execution with dependencies
- Use JSON fixtures from Data Factories
- Focus on system setup

### New Tests (test_15-22)
- Test individual endpoints in isolation
- Independent execution (no dependencies)
- Generate test data inline
- Focus on API validation and edge cases

## Recommended Execution

### Working Tests Only
```bash
pytest test_16_fail2ban.py test_20_advice.py test_21_auth.py test_22_cdr.py -v -s
```

### With Database Lock Workaround
```bash
# Restart container before each write test
docker restart mikopbx_php83 && sleep 10 && pytest test_17_asterisk_managers.py -v -s
```

## Documentation

| File | Description |
|------|-------------|
| [README_NEW_TESTS.md](README_NEW_TESTS.md) | This file - quick reference |
| [README_TEST_SUITE_SUMMARY.md](README_TEST_SUITE_SUMMARY.md) | Complete overview |
| [README_TEST_17.md](README_TEST_17.md) | AMI tests details |
| [README_TEST_20_21_22.md](README_TEST_20_21_22.md) | Advice/Auth/CDR details |
| [README_DATABASE_LOCKING.md](README_DATABASE_LOCKING.md) | DB lock issue analysis |

## Integration with Existing Tests

These tests can run:
- **Independently** - Don't require setup tests
- **In parallel** - With existing fixture-based tests
- **Sequentially** - After setup tests complete

Example CI/CD:
```yaml
- name: Run setup tests
  run: pytest setup/ -v

- name: Run new endpoint tests (read-only)
  run: pytest test_16_fail2ban.py test_20_advice.py test_21_auth.py test_22_cdr.py -v
```

---

**See also**: [README.md](README.md) for main test suite documentation
