---
name: h-fix-build-35184-browserstack
status: in-progress
created: 2025-12-31
build: "35184"
version: "2025.1.123-dev"
type: ui-tests
---

# Fix TeamCity Build #35184 BrowserStack Failures

## Summary

13 UI тестов упало в сборке BrowserStack tests #35184 (2025.1.123-dev).
123 passed, 13 failed (2 new), 4 ignored.

**Дата сборки:** 30.12.2025, 18:29 - 21:45 (3ч 16мин)

---

## Failed Tests

| # | Test | Error | Group | Priority |
|---|------|-------|-------|----------|
| 1 | `FillDataTimeSettingsTest::testChangeDataTimeSettings #0` | Failed to verify time settings | UI Navigation | P2 |
| 2 | `FillDataTimeSettingsTest::testChangeDataTimeSettings #1` | Could not navigate to page | UI Navigation | P2 |
| 3 | `StorageRetentionPeriodTest::testChangeStorageRetentionPeriod` | NoSuchElementException | UI Navigation | P2 |
| 4 | `MikoNetworkTest::testCreateFirewallRule` | Undefined array key "network" | Missing Fixture | P1 |
| 5 | `MikoVpnTest::testCreateFirewallRule` | Undefined array key "network" | Missing Fixture | P1 |
| 6 | `NikolayMacbookTest::testCreateFirewallRule` | Undefined array key "network" | Missing Fixture | P1 |
| 7 | `SvetlanaVlasovaTest::testCreateExtension` | Value '4' not in dropdown | Missing Data | P1 |
| 8 | `ChangeExtensionsSettingsTest::testChangeExtensions` | Value '4' not in dropdown | Missing Data | P1 |
| 9 | `SecondRuleTest::testCreateIncomingCallRule` | Value 'SIP-1683372701' not in dropdown | Missing Data | P1 |
| 10 | `EveningTest::testCreateOutOfWorkPeriod` | Checkbox route-15 not found | Missing Data | P1 |
| 11 | `MorningTest::testCreateOutOfWorkPeriod` | Checkbox route-15 not found | Missing Data | P1 |
| 12 | `WeekendTest::testCreateOutOfWorkPeriod` | Checkbox route-15 not found | Missing Data | P1 |
| 13 | `NetworkInterfacesTest::testAddNewVLAN` | externalSIPPort value mismatch | Assertion | P3 |

---

## Group 1: Missing Fixture Key "network" (3 tests)

**Status:** 🔍 Investigating
**Error:** `Undefined array key "network"`
**File:** `FirewallRulesTrait.php:55`

### Affected Tests

- `MikoNetworkTest::testCreateFirewallRule`
- `MikoVpnTest::testCreateFirewallRule`
- `NikolayMacbookTest::testCreateFirewallRule`

### Stack Trace

```
Undefined array key "network"
 /tests/AdminCabinet/Tests/Traits/FirewallRulesTrait.php:55
 /tests/AdminCabinet/Tests/CreateFirewallRuleTest.php:46
```

### Root Cause

Fixture JSON files for firewall rules don't contain the `network` key that the trait expects.

### Investigation Steps

- [ ] Check fixture files for firewall rules
- [ ] Review FirewallRulesTrait.php:55 to understand expected data structure
- [ ] Add missing key to fixtures or fix code to handle missing key

---

## Group 2: Missing Dropdown Values (3 tests)

**Status:** 🔍 Investigating
**Error:** `Value 'X' not found in dropdown`

### Affected Tests

| Test | Dropdown | Missing Value |
|------|----------|---------------|
| `SvetlanaVlasovaTest::testCreateExtension` | `sip_networkfilterid` | `4` |
| `ChangeExtensionsSettingsTest::testChangeExtensions` | `sip_networkfilterid` | `4` |
| `SecondRuleTest::testCreateIncomingCallRule` | `providerid` | `SIP-1683372701` |

### Stack Trace

```
RuntimeException : Value '4' not found in dropdown 'sip_networkfilterid'
 /tests/AdminCabinet/Lib/Traits/DropdownInteractionTrait.php:293
 /tests/AdminCabinet/Lib/Traits/DropdownInteractionTrait.php:546
```

### Root Cause

Tests reference IDs that don't exist in the system:
- Firewall rule ID=4 (for sip_networkfilterid)
- Provider SIP-1683372701 (for providerid)

These entities should be created by earlier tests in the chain.

### Investigation Steps

- [ ] Check test execution order
- [ ] Verify firewall rules are created before extension tests
- [ ] Verify provider SIP-1683372701 is created before incoming call rules test
- [ ] Check if IDs are hardcoded or should be dynamic

---

## Group 3: Missing Checkbox (3 tests)

**Status:** 🔍 Investigating
**Error:** `Checkbox route-15 not found`

### Affected Tests

- `EveningTest::testCreateOutOfWorkPeriod`
- `MorningTest::testCreateOutOfWorkPeriod`
- `WeekendTest::testCreateOutOfWorkPeriod`

### Stack Trace

```
Failed to change checkbox state: route-15. Error: Checkbox route-15 not found
Screenshot saved at: /opt/buildagent/temp/buildTmp/test-screenshots/2025-12-30_17-55-13_*.png
 /tests/AdminCabinet/Lib/MikoPBXTestsBase.php:279
 /tests/AdminCabinet/Tests/Traits/OutOfWorkPeriodsTrait.php:114
```

### Root Cause

Tests reference `route-15` checkbox which doesn't exist. The route ID may have changed or the route wasn't created by a previous test.

### Investigation Steps

- [ ] Check OutOfWorkPeriodsTrait.php:114 for route-15 reference
- [ ] Verify if route-15 is created by earlier tests
- [ ] Check if route IDs are dynamic or hardcoded
- [ ] Download screenshots from build agent for visual debugging

---

## Group 4: UI Navigation Issues (3 tests)

**Status:** 🔍 Investigating
**Errors:**
- `Failed to verify time settings after multiple attempts`
- `Could not navigate to time settings page`
- `NoSuchElementException: //a[@data-tab="storage-settings"]`

### Affected Tests

- `FillDataTimeSettingsTest::testChangeDataTimeSettings #0`
- `FillDataTimeSettingsTest::testChangeDataTimeSettings #1`
- `StorageRetentionPeriodTest::testChangeStorageRetentionPeriod`

### Stack Trace

```
Facebook\WebDriver\Exception\NoSuchElementException : no such element:
Unable to locate element: {"method":"xpath","selector":"//a[@data-tab=\"storage-settings\"]"}
(Session info: chrome=143.0.7499.41)
 /tests/AdminCabinet/Tests/StorageRetentionPeriodTest.php:62
```

### Root Cause

Possible causes:
1. UI changed - tab selector no longer valid
2. Page load timing issues
3. Chrome version compatibility (143.0.7499.41)

### Investigation Steps

- [ ] Check if storage-settings tab exists in current UI
- [ ] Review page load waits in tests
- [ ] Check Chrome version compatibility
- [ ] Verify selectors match current HTML structure

---

## Group 5: Value Mismatch Assertion (1 test)

**Status:** 🔍 Investigating
**Error:** `Input field 'externalSIPPort' value mismatch`

### Affected Test

- `NetworkInterfacesTest::testAddNewVLAN` (data set "eth0")

### Stack Trace

```
Input field 'externalSIPPort' value mismatch
Failed asserting that two strings are equal.
 /tests/AdminCabinet/Lib/Traits/AssertionTrait.php:36
 /tests/AdminCabinet/Tests/NetworkInterfacesTest.php:93
```

### Root Cause

After saving VLAN settings, the `externalSIPPort` field value doesn't match expected value.

### Investigation Steps

- [ ] Check what value is expected vs actual
- [ ] Verify if field is saved correctly
- [ ] Check if there's default value override logic

---

## Work Log

### 2025-12-31

- Created task from TeamCity build #35184 analysis
- Identified 13 failing tests in 5 root cause groups
- Primary issue: test data dependencies (IDs created by earlier tests)

---

## Context Manifest

### Test Environment

- **Platform:** BrowserStack
- **Browser:** Chrome 143.0.7499.41
- **Test Framework:** PHPUnit + Selenium WebDriver
- **Build Agent:** 172.16.33.61

### Test File Locations

| Test | File Path |
|------|-----------|
| FillDataTimeSettings | `tests/AdminCabinet/Tests/FillDataTimeSettingsTest.php` |
| StorageRetentionPeriod | `tests/AdminCabinet/Tests/StorageRetentionPeriodTest.php` |
| FirewallRules | `tests/AdminCabinet/Tests/CreateFirewallRuleTest.php` |
| FirewallRulesTrait | `tests/AdminCabinet/Tests/Traits/FirewallRulesTrait.php` |
| Extensions | `tests/AdminCabinet/Tests/CreateExtensionsTest.php` |
| ChangeExtensions | `tests/AdminCabinet/Tests/ChangeExtensionsSettingsTest.php` |
| IncomingCallRules | `tests/AdminCabinet/Tests/CreateIncomingCallRuleTest.php` |
| OutOfWorkPeriods | `tests/AdminCabinet/Tests/CreateOutOfWorkPeriodTest.php` |
| OutOfWorkPeriodsTrait | `tests/AdminCabinet/Tests/Traits/OutOfWorkPeriodsTrait.php` |
| NetworkInterfaces | `tests/AdminCabinet/Tests/NetworkInterfacesTest.php` |
| DropdownInteractionTrait | `tests/AdminCabinet/Lib/Traits/DropdownInteractionTrait.php` |

### Key Traits

- **FirewallRulesTrait.php:55** - expects `network` key in fixture
- **DropdownInteractionTrait.php:293** - throws when dropdown value not found
- **OutOfWorkPeriodsTrait.php:114** - references `route-15` checkbox
- **AssertionTrait.php:36** - value comparison assertions

### Screenshots Location

```
/opt/buildagent/temp/buildTmp/test-screenshots/
```

### Build Agent SSH Access

```bash
ssh mikoadmin@172.16.33.61
# Work directory: /opt/buildagent/work/a126da2f62f4ba7b/Core/tests/
```
