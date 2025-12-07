---
name: h-fix-api-test-failures
branch: fix/h-fix-api-test-failures
status: in-progress
created: 2025-12-06
updated: 2025-12-07
submodules:
  - path: ../Core
    branch: fix/networkstaticroutes-id-initialization
---

# Fix REST API Test Failures - Full Suite Analysis (892 tests)

## Problem/Goal
После успешного исправления всех критических тестов (CDR, PJSIP, Employees, Export), полный прогон 892 тестов выявил 57 новых проблем в категориях Network API, Firewall, Asterisk Managers и Authentication.

## Test Suite Status (2025-12-07)

**Execution Time:** 25 minutes 3 seconds
**Total Tests:** 892
- ✅ **PASSED:** 774 (86.8%)
- ❌ **FAILED:** 57 (6.4%)
- ⏭️ **SKIPPED:** 56 (6.3%)
- ⚠️ **ERRORS:** 5 (0.6%)

## Success Criteria
- [ ] Все критические баги исправлены (NetworkStaticRoutes, Database Locks, Auth)
- [ ] 100% PASSED rate для проблемных категорий:
  - [ ] Network API (Static Routes, IPv6)
  - [ ] Firewall API
  - [ ] Asterisk Managers API
  - [ ] Authentication (test_config_01, test_custom_files_sequential)
- [ ] Документированы причины всех SKIPPED тестов

## Failed Tests Categories (57 total)

### 🔴 КРИТИЧЕСКИЙ БАГ PHP - NetworkStaticRoutes::$id (10 тестов)

**Ошибка:**
```
Error: Typed property MikoPBX\Common\Models\NetworkStaticRoutes::$id
must not be accessed before initialization
File: /src/PBXCoreREST/Lib/Network/SaveConfigAction.php:676
```

**Затронутые тесты:**
1. `test_33_network.py::TestStaticRoutes::test_02_create_static_route`
2. `test_33_network.py::TestStaticRoutesEdgeCases::test_01_empty_interface_field`
3. `test_33_network.py::TestStaticRoutesEdgeCases::test_02_minimum_priority`
4. `test_33_network.py::TestStaticRoutesEdgeCases::test_03_maximum_subnet_mask`
5. `test_33_network.py::TestStaticRoutesEdgeCases::test_04_default_route`
6. `test_33_network.py::TestStaticRoutesIPv6::test_01_create_ipv6_static_route`
7. `test_33_network.py::TestStaticRoutesIPv6::test_02_validate_ipv6_subnet_range`
8. `test_33_network.py::TestStaticRoutesIPv6Validation::test_03_validate_mixed_ipv4_ipv6_routes`
9. `test_35_network_ipv6_complete.py::TestIPv6EndToEndStaticRoutes::test_01_create_mixed_routes`
10. `test_35_network_ipv6_complete.py::TestIPv6EndToEndValidation::test_02_validate_ipv6_subnet_ranges`

**Stack Trace:**
```
SaveConfigAction.php:676 - Phalcon\Mvc\Model->save()
SaveConfigAction->saveStaticRoutes() :102
NetworkManagementProcessor->callBack() :95
WorkerApiCommands->executeRequest() :758
```

**Требуется:** Исправить в MikoPBX коде инициализацию `$id` при создании новых Static Routes

---

### 🟡 DATABASE LOCKED (14 тестов)

**Ошибка:** `SQLSTATE[HY000]: General error: 5 database is locked`

**По категориям:**
- **Firewall API** (4 теста):
  1. `test_35_firewall.py::TestFirewall::test_02_create_firewall_rule`
  2. `test_35_firewall.py::TestFirewallIPv6::test_01_create_rule_any_ipv4`
  3. `test_35_firewall.py::TestFirewallIPv6::test_03_create_ipv6_any_address`
  4. `test_35_firewall.py::TestFirewallIPv6::test_07_common_ipv6_prefixes`

- **Network API** (3 теста):
  1. `test_35_network_ipv6_complete.py::TestIPv6EndToEndNativeDualStack::test_03_cleanup_dual_stack`
  2. `test_35_network_ipv6_complete.py::TestIPv6EndToEndAutoMode::test_01_configure_ipv6_auto`
  3. `test_35_network_ipv6_complete.py::TestIPv6EndToEndValidation::test_01_validate_ipv6_address_formats`

- **SIP Providers** (3 теста):
  1. `test_61_sip_provider_calls.py::test_01_create_sip_provider_via_api`
  2. `test_61_sip_provider_calls.py::test_03_create_outbound_route_for_provider`
  3. `test_61_sip_provider_calls.py::test_05_provider_crud_lifecycle`

- **Asterisk Managers** (1 тест):
  1. `test_37_asterisk_managers.py::TestAsteriskManagers::test_03_create_manager_full_permissions`

- **Asterisk REST Users** (2 теста):
  1. `test_38_asterisk_rest_users.py::TestAsteriskRestUsers::test_02_create_ari_user_basic`
  2. `test_38_asterisk_rest_users.py::TestAsteriskRestUsers::test_03_create_ari_user_minimal`

- **Incoming Routes** (1 тест):
  1. `test_61_sip_provider_calls.py::test_04_create_incoming_route_for_did`

**Требуется:** Исследовать причину блокировок SQLite при параллельных операциях

---

### 🟠 AUTHENTICATION ISSUES (12 тестов)

**Ошибка:** `401 Client Error: Unauthorized - The user isn't authenticated`

**Затронутые тесты:**
- **test_config_01_all_provider_types.py::TestAllProviderTypes** (10 тестов):
  1. `test_01_create_sip_outbound_udp`
  2. `test_02_create_sip_outbound_tcp`
  3. `test_03_create_sip_outbound_tls`
  4. `test_04_create_sip_inbound_udp`
  5. `test_05_create_sip_inbound_tcp`
  6. `test_06_create_sip_inbound_tls`
  7. `test_07_create_sip_peer_trunk`
  8. `test_08_create_iax_outbound`
  9. `test_09_create_iax_inbound`
  10. `test_10_create_iax_peer_trunk`

- **test_custom_files_sequential_patch.py** (2 теста):
  1. `test_sequential_patch_custom_file`
  2. `test_rapid_sequential_patches`

**Требуется:** Разобраться с JWT token expiration или сессиями в этих тестах

---

### 🟢 IPv6 CONFIGURATION VALIDATION (6 тестов)

**Проблема:** Assertion errors при проверке IPv6 конфигурации

1. `test_33_network.py::TestNetworkIPv6Config::test_02_save_ipv6_manual_mode` - AssertionError: IPv6 mode should be Manual (2)
2. `test_33_network.py::TestNetworkIPv6Config::test_03_save_ipv6_auto_mode` - AssertionError: IPv6 mode should be Auto (1)
3. `test_33_network.py::TestNetworkIPv6Config::test_04_save_ipv6_dns_servers` - AssertionError: Primary DNS IPv6 should match
4. `test_33_network.py::TestNetworkIPv6Config::test_05_dual_stack_configuration` - AssertionError: DHCP should be disabled
5. `test_35_network_ipv6_complete.py::TestIPv6EndToEndNativeDualStack::test_02_verify_dual_stack_saved` - AssertionError: DHCP should be disabled
6. `test_35_network_ipv6_complete.py::TestIPv6EndToEndAutoMode::test_02_verify_auto_mode_saved` - AssertionError: IPv6 mode should be Auto (1)

**Требуется:** Проверить логику сохранения и извлечения IPv6 конфигурации через API

---

### 🟣 ASTERISK MANAGERS API (6 тестов)

**Проблемы:**
1. `test_37_asterisk_managers.py::TestAsteriskManagers::test_04_get_managers_list` - AssertionError: Expected at least 1 managers
2. `test_37_asterisk_managers.py::TestAsteriskManagers::test_06_get_manager_by_id` - 422 Unprocessable Entity
3. `test_37_asterisk_managers.py::TestAsteriskManagers::test_07_update_manager` - 422 Unprocessable Entity
4. `test_37_asterisk_managers.py::TestAsteriskManagers::test_09_copy_manager` - 422 Unprocessable Entity
5. `test_37_asterisk_managers.py::TestAsteriskManagers::test_09a_create_manager_with_eventfilter` - 422 Unprocessable Entity
6. `test_37_asterisk_managers.py::TestAsteriskManagers::test_09c_clear_eventfilter` - 404 Not Found

---

### 🔵 MISC ERRORS (8 тестов)

1. `test_35_firewall.py::TestFirewallIPv6::test_02_create_ipv6_rule` - 422 Unprocessable Entity (firewall/888889)
2. `test_35_network_ipv6_complete.py::TestIPv6EndToEndStaticRoutes::test_02_verify_routes_coexist` - AssertionError: IPv4 route should exist
3. `test_35_network_ipv6_complete.py::TestIPv6EndToEndAutoMode::test_03_cleanup_auto_mode` - IPv6 адрес обязателен для ручного режима
4. `test_36_fail2ban.py::TestFail2Ban::test_02_update_settings_full` - assert 5 == 10
5. `test_40_sysinfo.py::TestSysinfo::test_03_get_hypervisor_info` - Hypervisor field should not be empty
6. `test_51_files.py::TestFilesAPI::test_02_get_file_content` - 422 Unprocessable Entity (files/tmp/mikopbx_test_file.txt)
7. `test_52_search.py::TestSearchIntegration::test_03_search_consistency_check` - Inconsistent results: 8, 14, 8
8. `test_61_sip_provider_calls.py::test_02_get_provider_by_id` - 422 Unprocessable Entity (SIP-TRUNK-51AA3E2F)

---

### ⚙️ ENVIRONMENT ISSUE (1 тест)

**test_60_extension_calls.py::TestExtensionCalls::test_01_basic_call_extension_to_extension**
- FileNotFoundError: gophone binary not found
- Требуется: `tests/pycalltests/install-gophone.sh`

---

## Приоритеты исправления

**P0 - Критический (БЛОКИРУЕТ 10 тестов):**
1. ⚠️ `NetworkStaticRoutes::$id` initialization bug - **SaveConfigAction.php:676**

**P1 - Высокий (БЛОКИРУЕТ 14 тестов):**
2. ⚠️ Database Lock issue - **SQLite concurrent access**

**P2 - Средний (БЛОКИРУЕТ 12 тестов):**
3. ⚠️ Authentication expiration - **JWT token or session issues**

**P3 - Низкий (Каждый тест отдельно):**
4. IPv6 configuration validation (6 tests)
5. Asterisk Managers API (6 tests)
6. Misc errors (8 tests)
7. Environment setup (1 test)

---

## ✅ Ранее исправленные проблемы (2025-12-06/07)

### 1. CDR Seeding - FIXED ✅
- **Проблема:** Script permissions
- **Исправление:** `chmod +x tests/api/scripts/seed_cdr_database.sh`
- **Результат:** 1 passed, 1 skipped (data exists)

### 2. Custom Files Append Mode - FIXED ✅
- **Проблема:** Subprocess calls to Docker
- **Исправление:** Refactored to REST API (`system:executeSqlRequest`, `files/{path}`)
- **Результат:** 4/4 passed

### 3. Employee Creation - FIXED ✅
- **Проблема:** Data already exists
- **Исправление:** Tests handle existing data gracefully
- **Результат:** 5 passed, 1 skipped

### 4. PJSIP Manual Attributes - FIXED ✅
- **Проблема:** Database lock
- **Исправление:** Container restart cleared locks
- **Результат:** 7/7 passed

### 5. Export Template - FIXED ✅
- **Проблема:** PHP 8.3 fputcsv() compatibility
- **Исправление:** Added `$escape` parameter in MikoPBX code
- **Результат:** 1/1 passed

---

## Work Log

### 2025-12-07 - Full Test Suite Run (892 tests) - NEW ISSUES FOUND

**Execution:**
```bash
python3 -m pytest tests/api -v --tb=no --ignore=tests/api/test_62_provider_call_routing.py
```

**Results:**
- Time: 25 minutes 3 seconds (1503.58s)
- PASSED: 774 (86.8%)
- FAILED: 57 (6.4%)
- SKIPPED: 56 (6.3%)
- ERRORS: 5 (0.6%)

**Key Findings:**

1. **NetworkStaticRoutes Critical Bug** - BLOCKS 10 tests
   - Typed property `$id` accessed before initialization
   - File: `SaveConfigAction.php:676`
   - Affects all static route creation (IPv4 and IPv6)

2. **Database Lock Issues** - BLOCKS 14 tests
   - SQLite concurrent access problems
   - Affects Firewall, Network, Providers, Asterisk APIs
   - Needs investigation of transaction management

3. **Authentication Failures** - BLOCKS 12 tests
   - JWT token expiration or session issues
   - Affects `test_config_01_all_provider_types` (10 tests)
   - Affects `test_custom_files_sequential_patch` (2 tests)

4. **IPv6 Configuration Validation** - 6 tests
   - Assertion errors when verifying IPv6 modes (Auto/Manual)
   - DNS server configuration not persisting
   - DHCP state inconsistent

5. **Asterisk Managers API** - 6 tests
   - Create operations failing with database lock
   - Get/Update operations returning 422/404 errors

**Architecture Improvements From Previous Work:**
- ✅ All tests now use REST API exclusively (no direct Docker access)
- ✅ Dynamic container name resolution
- ✅ Consistent API-based approach

**Next Steps:**
1. Fix `NetworkStaticRoutes::$id` initialization in SaveConfigAction.php
2. Investigate SQLite database locking
3. Debug authentication token expiration in long-running test suites

---

### 2025-12-07 - Final Verification of All Previously Failed Tests ✅

**Objective:** Verify that all tests marked as FAILED in previous runs are now working correctly.

**Tests Executed:**
1. `test_00a_cdr_seed.py` - ✅ 1 passed, 1 skipped (data exists)
2. `test_18b_sip_providers_manualattributes_pjsip_conf.py` - ✅ 7/7 passed
3. `test_15_extensions_employees.py::TestEmployees::test_08_export_template` - ✅ 1/1 passed
4. `test_14_extensions_create_single.py` + `test_15_extensions_batch.py` - ✅ 5 passed, 1 skipped
5. `test_09_custom_files.py::TestCustomFilesAppendMode` - ✅ 4/4 passed

**Results:**
- **ALL PREVIOUSLY FAILED TESTS NOW PASS** ✅
- Total: 18 tests executed
- Passed: 17 tests (94.4%)
- Skipped: 1 test (5.6%) - legitimate skip (employee 201 protected)
- Failed: 0 tests (0%) 🎉

**Status:** ✅ READY FOR FULL TEST SUITE RUN

---

### 2025-12-07 - Subprocess Refactoring to REST API (ARCHITECTURE IMPROVEMENT)

**Files Refactored:**
1. `test_09_custom_files.py` - Commit: `7710a5ec5`
2. `test_config_01_all_provider_types.py` - Commit: `4faf96110`

**Removed:** ~80 lines of subprocess/docker code
**Impact:** 2 test files, 6 test functions
**Status:** ✅ COMPLETED

---

### 2025-12-06 - CDR Seeding Script Permissions Fix (CRITICAL)

**Fix Applied:**
```bash
chmod +x tests/api/scripts/seed_cdr_database.sh
```

**Result:** 2 passed in 0.84s ✓
**Status:** ✅ FIXED
