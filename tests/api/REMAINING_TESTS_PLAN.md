# Remaining Tests Plan for MikoPBX REST API v3

## Summary
- **Completed**: 9 test files (test_15 through test_23) covering 8 core + 1 advanced endpoint
- **Remaining**: 32 endpoints need tests
- **Issue**: Database locking affects write operations (CREATE/UPDATE/DELETE)
- **Recommendation**: Focus on read-only tests for reliable execution

## Completed Tests (9 files, 152+ tests)

| File | Endpoint | Tests | Status |
|------|----------|-------|--------|
| test_15 | /firewall | 18 | ⚠️ DB lock |
| test_16 | /fail2ban | 15 | ✅ Works |
| test_17 | /asterisk-managers | 15 | ⚠️ DB lock |
| test_18 | /api-keys | 17 | ⚠️ Partial |
| test_19 | /asterisk-rest-users | 14 | ⚠️ DB lock |
| test_20 | /advice | 16 | ✅ Works |
| test_21 | /auth | 17 | ✅ Works |
| test_22 | /cdr | 23 | ✅ Works |
| test_23 | /extensions | 19 | ✅ Works |

## HIGH PRIORITY - Remaining (10 endpoints)

### test_24_employees.py
**Endpoint**: `/pbxcore/api/v3/employees`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Employee/user management with extension linking

**Key Tests**:
- GET list with pagination
- GET by ID
- GET :getDefault
- GET :getForSelect
- Filter by mobile_number, email
- Custom methods: :getExtension, :getRecord

**Status**: ⚠️ Will have DB lock on writes

---

### test_25_sip_providers.py
**Endpoint**: `/pbxcore/api/v3/sip-providers`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: SIP trunk configuration

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: SIP-PROVIDER-*)
- GET :getDefault
- POST :getRegistry
- Filter by disabled, noregister
- Validation: host, username, secret

**Status**: ⚠️ Will have DB lock on writes

---

### test_26_iax_providers.py
**Endpoint**: `/pbxcore/api/v3/iax-providers`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: IAX2 trunk configuration

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: IAX-PROVIDER-*)
- GET :getDefault
- POST :getRegistry
- Similar to SIP providers but for IAX2

**Status**: ⚠️ Will have DB lock on writes

---

### test_27_sound_files.py
**Endpoint**: `/pbxcore/api/v3/sound-files`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Custom audio file management

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: SOUNDFILE-*)
- GET :getDefault
- POST :upload (multipart)
- GET :download
- Filter by category (custom, moh)

**Status**: ⚠️ Will have DB lock on writes, upload requires file handling

---

### test_28_call_queues.py
**Endpoint**: `/pbxcore/api/v3/call-queues`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Call queue configuration

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: QUEUE-*)
- GET :getDefault
- GET :copy
- Members management
- Strategies: ringall, leastrecent, random

**Status**: ⚠️ Will have DB lock on writes

---

### test_29_incoming_routes.py
**Endpoint**: `/pbxcore/api/v3/incoming-routes`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Inbound call routing rules

**Key Tests**:
- GET list with pagination (with priority ordering)
- GET by ID (pattern: INCOMMING-ROUTE-*)
- GET :getDefault
- DID/number matching
- Action types: extension, ivr, queue

**Status**: ⚠️ Will have DB lock on writes

---

### test_30_outbound_routes.py
**Endpoint**: `/pbxcore/api/v3/outbound-routes`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Outbound call routing rules

**Key Tests**:
- GET list with pagination (with priority ordering)
- GET by ID (pattern: OUTGOING-ROUTE-*)
- GET :getDefault
- Pattern matching
- Provider selection

**Status**: ⚠️ Will have DB lock on writes

---

### test_31_ivr_menu.py
**Endpoint**: `/pbxcore/api/v3/ivr-menu`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: IVR/Auto-attendant configuration

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: IVR-MENU-*)
- GET :getDefault
- GET :copy
- DTMF actions configuration
- Audio file associations

**Status**: ⚠️ Will have DB lock on writes

---

### test_32_conference_rooms.py
**Endpoint**: `/pbxcore/api/v3/conference-rooms`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Conference room configuration

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: CONFERENCE-*)
- GET :getDefault
- PIN code management
- Extension assignment

**Status**: ⚠️ Will have DB lock on writes

---

### test_33_dialplan_applications.py
**Endpoint**: `/pbxcore/api/v3/dialplan-applications`
**Methods**: GET, POST, PUT, PATCH, DELETE
**Focus**: Custom dialplan applications

**Key Tests**:
- GET list with pagination
- GET by ID (pattern: DIALPLAN-APP-*)
- GET :getDefault
- Application code validation
- Extension assignment

**Status**: ⚠️ Will have DB lock on writes

---

## MEDIUM PRIORITY - Remaining (10 endpoints)

### test_34_users.py
**Endpoint**: `/pbxcore/api/v3/users`
**Status**: ⚠️ DB lock expected

### test_35_modules.py
**Endpoint**: `/pbxcore/api/v3/modules`
**Status**: ⚠️ Complex, module installation

### test_36_general_settings.py
**Endpoint**: `/pbxcore/api/v3/general-settings`
**Status**: ✅ Mostly read, PUT/PATCH only

### test_37_time_settings.py
**Endpoint**: `/pbxcore/api/v3/time-settings`
**Status**: ✅ Mostly read, PUT/PATCH only

### test_38_mail_settings.py
**Endpoint**: `/pbxcore/api/v3/mail-settings`
**Status**: ✅ Mostly read, PUT/PATCH only

### test_39_network.py
**Endpoint**: `/pbxcore/api/v3/network`
**Status**: ✅ Read + limited writes

### test_40_storage.py
**Endpoint**: `/pbxcore/api/v3/storage`
**Status**: ✅ Mostly read

### test_41_custom_files.py
**Endpoint**: `/pbxcore/api/v3/custom-files`
**Status**: ⚠️ DB lock expected

### test_42_files.py
**Endpoint**: `/pbxcore/api/v3/files`
**Status**: ✅ File operations

### test_43_off_work_times.py
**Endpoint**: `/pbxcore/api/v3/off-work-times`
**Status**: ⚠️ DB lock expected

---

## LOW PRIORITY - Remaining (12 endpoints)

### Read-Only/Info Endpoints
- **license** - License information
- **sysinfo** - System information
- **syslog** - System logs
- **system** - System status
- **providers** - Provider list aggregator
- **sip** - SIP status info
- **iax** - IAX status info
- **network-filters** - Network filter info
- **passkeys** - WebAuthn passkeys
- **passwords** - Password utilities
- **user-page-tracker** - UI analytics
- **wiki-links** - Documentation links

**Status**: ✅ All should work (read-only)

---

## Test Template for Remaining Tests

```python
#!/usr/bin/env python3
"""
Test suite for [Resource] operations

Tests the /pbxcore/api/v3/[resource] endpoint for:
- Getting list with pagination and filtering
- Getting specific record by ID
- Custom methods: getDefault, getForSelect, copy, etc.

NOTE: Write operations (CREATE/UPDATE/DELETE) may be affected by database locking.
This test suite focuses on read operations which work reliably.
"""

import pytest
from conftest import assert_api_success


class Test[Resource]:
    """[Resource] read operations tests"""

    sample_id = None

    def test_01_get_default_template(self, api_client):
        """Test GET /[resource]:getDefault"""
        response = api_client.get('[resource]:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default template")

    def test_02_get_list(self, api_client):
        """Test GET /[resource] - List with pagination"""
        response = api_client.get('[resource]', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get list")

        data = response['data']
        print(f"✓ Retrieved {len(data)} records")

        if len(data) > 0 and 'id' in data[0]:
            Test[Resource].sample_id = data[0]['id']

    def test_03_get_by_id(self, api_client):
        """Test GET /[resource]/{id}"""
        if not Test[Resource].sample_id:
            pytest.skip("No sample ID available")

        response = api_client.get(f'[resource]/{Test[Resource].sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved record: {Test[Resource].sample_id}")

    # Add more read-only tests...


class Test[Resource]EdgeCases:
    """Edge cases for [resource]"""

    def test_01_get_nonexistent(self, api_client):
        """Test GET /[resource]/{id} - Non-existent ID"""
        # Test with fake ID
        pass

    def test_02_invalid_id_format(self, api_client):
        """Test GET /[resource]/{id} - Invalid ID format"""
        # Test with invalid format
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
```

---

## Recommendations

### For Immediate Use
1. **Run completed tests** (test_16, test_20, test_21, test_22, test_23) - All work reliably
2. **Document database issue** - Include in test reports
3. **Use read-only tests** for CI/CD validation

### For Future Work
1. **Fix database locking** - Backend transaction management (see README_DATABASE_LOCKING.md)
2. **Complete HIGH PRIORITY** - After DB fix, test_24 through test_33
3. **Add MEDIUM PRIORITY** - Settings and configuration tests
4. **Add LOW PRIORITY** - Info endpoints (quick to test)

### Quick Stats
- **Total endpoints**: 41
- **Tested**: 9 (22%)
- **Remaining HIGH**: 10
- **Remaining MEDIUM**: 10
- **Remaining LOW**: 12

### Estimated Work
- **HIGH PRIORITY tests**: ~15-20 hours (10 files × ~1.5-2 hours each)
- **MEDIUM PRIORITY tests**: ~10-15 hours
- **LOW PRIORITY tests**: ~5-8 hours (mostly simple read-only)
- **Total**: ~30-43 hours for complete coverage

---

**Created**: 2025-10-13
**Status**: Planning document
**Next Step**: Fix database locking issue or continue with read-only test focus
