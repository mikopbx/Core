---
title: Implement IPv6 Firewall Rules Support
status: completed
priority: medium
type: implementation
created: 2025-11-21
completed: 2025-12-16
branch: ipv6-firewall-rules
---

# Task: Implement IPv6 Firewall Rules Support

## Request

**Original User Message**: "mek: проверить как формируются правила firewall при включенном ipv6, добавить возможность сохранениия правил firewall для ipv6 сетей (это нормальная практика?) в NetworkFilters"

**Translation**: Check how firewall rules are formed when IPv6 is enabled, add ability to save firewall rules for IPv6 networks (is this normal practice?) in NetworkFilters

## Objectives

1. **Audit Current IPv6 Firewall Support**:
   - Analyze how `IptablesConf.php` generates firewall rules for IPv6
   - Check how `NetworkFilters` model stores IPv4/IPv6 addresses
   - Verify if IPv6 addresses are properly validated and stored
   - Test dual-stack firewall rule generation

2. **Research Best Practices**:
   - Determine if separate IPv6 firewall rules are industry standard
   - Identify whether unified IPv4/IPv6 storage is acceptable
   - Research security implications of IPv6 firewall rules

3. **Implement Enhancements (if needed)**:
   - Add IPv6 validation to NetworkFilters model if missing
   - Ensure admin UI supports IPv6 CIDR notation
   - Add unit tests for IPv6 firewall rule generation
   - Document IPv6 firewall behavior

## Context Manifest

### Key Files
- `src/Core/System/Configs/IptablesConf.php` - Firewall rule generation (lines 209-231: dual-stack support)
- `src/Common/Models/NetworkFilters.php` - Network filter storage (permit/deny fields)
- `src/Common/Models/FirewallRules.php` - Firewall rule configuration
- `src/Core/Utilities/IpAddressHelper.php` - IPv6 detection and validation

### Current Implementation Status

**IptablesConf.php** (Already has IPv6 support):
- Line 168-172: Flushes both `iptables` and `ip6tables` rules
- Line 209-231: `getFirewallRule()` method automatically detects IPv4 vs IPv6
- Line 227-228: Generates `ip6tables` rules for IPv6 addresses
- Line 261-263: Dual-stack rules for SIP hosts (both IPv4 and IPv6)
- Line 268: Explicit IPv6 localhost rule (`::1`)

**NetworkFilters.php**:
- `permit` and `deny` fields store IP addresses/networks (string)
- No explicit IPv6 validation in model
- No IP version distinction in database schema

### Potential Issues to Investigate

1. **Validation**: Does NetworkFilters validate IPv6 CIDR notation?
2. **UI Support**: Can admin UI accept IPv6 addresses in network filters?
3. **Testing**: Are there tests for IPv6 firewall rule generation?
4. **Documentation**: Is IPv6 firewall behavior documented?

## Audit Results (Completed 2025-11-21)

### ✅ What Works Correctly

1. **Backend Firewall Rule Generation** (`IptablesConf.php:209-231`)
   - Automatically detects IPv4 vs IPv6 using `IpAddressHelper::isIpv6()`
   - Generates correct `iptables` vs `ip6tables` commands
   - Dual-stack support for SIP hosts
   - Explicit IPv6 localhost rule (`::1`)

2. **IP Address Utilities** (`IpAddressHelper.php`)
   - Comprehensive IPv6 validation (`isIpv6()`, `normalizeCidr()`)
   - CIDR parsing for both IPv4 and IPv6
   - Network membership checking supports both protocols

3. **Unified Storage** (`NetworkFilters` model)
   - Single `permit`/`deny` fields for both IPv4 and IPv6
   - ✅ **CORRECT** per industry best practices (NIST, DoD guidelines)

### ❌ Critical Issues Found

1. **UI Validation Only Supports IPv4** (`firewall-modify.js:55`)
   - JavaScript validation rule `type: 'ipaddr'` only validates IPv4
   - Cannot enter or save IPv6 addresses through UI

2. **Form Input Mask Only Supports IPv4** (`FirewallEditForm.php:44`)
   - `data-inputmask => "'alias': 'ip'"` only accepts IPv4
   - Placeholder shows only IPv4 example (`192.168.1.0`)

3. **Cidr Class Only Supports IPv4** (`Cidr.php`)
   - All methods use IPv4-only functions (`ip2long()`, `long2ip()`)
   - `getNetMasks()` returns only /0-/32 (IPv6 needs /0-/128)
   - Subnet dropdown cannot represent IPv6 prefix lengths

4. **SaveRecordAction IPv4-Only** (`SaveRecordAction.php:200-213`)
   - Validation assumes /0-/32 range
   - Would reject valid IPv6 prefixes (/64, /48, etc.)

5. **No Model-Level Validation** (`NetworkFilters.php`)
   - Missing `beforeValidation()` hook
   - Invalid IPv6 addresses can be saved to database

### 🔍 Research Findings: IPv6 Best Practices

**Sources**: NIST SP 800-119, DoD IPv6 Security Guidance, RFC 9099

**Key Findings**:
1. ✅ **Execution Layer**: Separate `iptables`/`ip6tables` rules required (already implemented)
2. ✅ **Storage Layer**: Unified IPv4/IPv6 storage acceptable (current approach is correct)
3. ✅ **Database Schema**: Each rule contains EITHER IPv4 OR IPv6, not both (NIST requirement)
4. ⚠️ **Security Parity**: IPv6 rules must have equivalent security to IPv4 rules

**Conclusion**: Current unified storage approach is industry-standard and correct.

## Implementation Plan: Dual-Stack IPv4/IPv6 UI

### Agreed Approach
- **Two separate input fields** - one for IPv4, one for IPv6
- **Either/or validation** - user fills IPv4 OR IPv6, not both
- **Conditional visibility** - IPv6 fields shown only when IPv6 enabled (`LanInterfaces.ipv6_mode != '0'`)
- **Database schema unchanged** - keep current `permit`/`deny` fields (backward compatible)

### Implementation Tasks

#### 1. Add IPv6 Helper to LanInterfaces Model
**File**: `src/Common/Models/LanInterfaces.php`

```php
/**
 * Check if IPv6 is enabled on any interface
 * @return bool True if at least one interface has IPv6 enabled
 */
public static function isIpv6Enabled(): bool
{
    $count = self::count([
        'conditions' => 'ipv6_mode != :mode:',
        'bind' => ['mode' => '0']
    ]);
    return $count > 0;
}
```

#### 2. Add CIDR Validation to NetworkFilters Model
**File**: `src/Common/Models/NetworkFilters.php`

```php
public function beforeValidation(): bool
{
    // Validate permit field (IPv4 or IPv6 CIDR)
    if (!empty($this->permit)) {
        $cidrInfo = IpAddressHelper::normalizeCidr($this->permit);
        if ($cidrInfo === false) {
            $this->appendMessage(new Message(
                'Invalid permit network CIDR notation',
                'permit'
            ));
            return false;
        }
    }

    // Validate deny field
    if (!empty($this->deny)) {
        $cidrInfo = IpAddressHelper::normalizeCidr($this->deny);
        if ($cidrInfo === false) {
            $this->appendMessage(new Message(
                'Invalid deny network CIDR notation',
                'deny'
            ));
            return false;
        }
    }

    return true;
}
```

#### 3. Extend Cidr Class for IPv6
**File**: `src/AdminCabinet/Library/Cidr.php`

Add methods:
- `getIPv4NetMasks()` - existing `getNetMasks()`, renamed for clarity
- `getIPv6NetMasks()` - return array with /0-/128 prefix lengths

```php
public static function getIPv6NetMasks(): array
{
    $masks = [];
    // Common IPv6 prefixes first (128, 64, 56, 48, 32, 16, 8, 0)
    $common = [128, 64, 56, 48, 32, 16, 8, 0];
    foreach ($common as $prefix) {
        $masks[(string)$prefix] = (string)$prefix;
    }
    // Then all others
    for ($i = 127; $i >= 1; $i--) {
        if (!isset($masks[(string)$i])) {
            $masks[(string)$i] = (string)$i;
        }
    }
    krsort($masks, SORT_NUMERIC);
    return $masks;
}
```

#### 4. Update FirewallEditForm with Separate Fields
**File**: `src/AdminCabinet/Forms/FirewallEditForm.php`

Changes:
- Check `LanInterfaces::isIpv6Enabled()` to determine IPv6 visibility
- Add separate fields: `ipv4_network`, `ipv4_subnet`, `ipv6_network`, `ipv6_subnet`
- Parse existing `permit` value into IPv4 or IPv6 components
- Use `Cidr::getIPv4NetMasks()` and `Cidr::getIPv6NetMasks()`

```php
// Parse existing permit value
[$ipv4Network, $ipv4Subnet, $ipv6Network, $ipv6Subnet] =
    $this->parsePermitValue($entity->permit ?? '');

// IPv4 fields (always visible)
$this->add(new Text('ipv4_network', [
    'value' => $ipv4Network,
    'data-inputmask' => "'alias': 'ip'",
    'placeholder' => '192.168.1.0'
]));

$this->addSemanticUIDropdown('ipv4_subnet',
    Cidr::getIPv4NetMasks(), $ipv4Subnet ?? '24');

// IPv6 fields (conditional)
if (LanInterfaces::isIpv6Enabled()) {
    $this->add(new Text('ipv6_network', [
        'value' => $ipv6Network,
        'placeholder' => '2001:db8::'
    ]));

    $this->addSemanticUIDropdown('ipv6_subnet',
        Cidr::getIPv6NetMasks(), $ipv6Subnet ?? '64');
}
```

#### 5. Update firewall-modify.js with Dual-Stack Validation
**File**: `sites/admin-cabinet/assets/js/src/Firewall/firewall-modify.js`

Changes:
- Add validation rules for `ipv4_network` (IPv4 regex) and `ipv6_network` (IPv6 regex)
- Implement either/or validation in `cbBeforeSendForm()`
- Combine selected IPv4 or IPv6 into `network` and `subnet` fields for backend

```javascript
validateRules: {
    ipv4_network: {
        identifier: 'ipv4_network',
        optional: true,
        rules: [{
            type: 'regExp',
            value: /^(\d{1,3}\.){3}\d{1,3}$/,
            prompt: globalTranslate.fw_ValidateIPv4Address,
        }],
    },
    ipv6_network: {
        identifier: 'ipv6_network',
        optional: true,
        rules: [{
            type: 'regExp',
            value: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
            prompt: globalTranslate.fw_ValidateIPv6Address,
        }],
    },
},

cbBeforeSendForm(settings) {
    // Validate: either IPv4 OR IPv6, not both, not neither
    const hasIPv4 = ipv4Network && ipv4Network !== '';
    const hasIPv6 = ipv6Network && ipv6Network !== '';

    if (!hasIPv4 && !hasIPv6) {
        UserMessage.showError(globalTranslate.fw_ValidateEitherIPv4OrIPv6Required);
        return false;
    }
    if (hasIPv4 && hasIPv6) {
        UserMessage.showError(globalTranslate.fw_ValidateOnlyOneProtocol);
        return false;
    }

    // Combine for backend
    result.data = {
        network: hasIPv4 ? ipv4Network : ipv6Network,
        subnet: hasIPv4 ? ipv4Subnet : ipv6Subnet,
        // ... other fields
    };
    return result;
}
```

#### 6. Update SaveRecordAction for IPv6 Subnets
**File**: `src/PBXCoreREST/Lib/Firewall/SaveRecordAction.php`

Update `validateIpAndCidr()` method:
```php
private static function validateIpAndCidr(string $network, int|string $subnet): array
{
    $errors = [];

    // Detect IP version
    $version = IpAddressHelper::getIpVersion($network);
    if ($version === false) {
        $errors[] = 'Invalid IP address format';
        return $errors;
    }

    $subnetInt = is_string($subnet) ? intval($subnet) : $subnet;

    // Validate subnet range based on IP version
    if ($version === IpAddressHelper::IP_VERSION_4) {
        if ($subnetInt < 0 || $subnetInt > 32) {
            $errors[] = 'IPv4 subnet prefix must be between 0 and 32';
        }
    } else { // IPv6
        if ($subnetInt < 0 || $subnetInt > 128) {
            $errors[] = 'IPv6 prefix length must be between 0 and 128';
        }
    }

    // Validate CIDR notation
    $cidr = "$network/$subnet";
    if (IpAddressHelper::normalizeCidr($cidr) === false) {
        $errors[] = 'Invalid CIDR notation format';
    }

    return $errors;
}
```

#### 7. Add Translation Keys
**File**: `src/Common/Messages/ru.php`

```php
'fw_ValidateIPv4Address' => 'Неверный формат IPv4 адреса',
'fw_ValidateIPv6Address' => 'Неверный формат IPv6 адреса',
'fw_ValidateEitherIPv4OrIPv6Required' => 'Укажите IPv4 или IPv6 сеть',
'fw_ValidateOnlyOneProtocol' => 'Можно указать только один протокол',
'fw_IPv4Network' => 'IPv4 сеть',
'fw_IPv4Subnet' => 'IPv4 префикс',
'fw_IPv6Network' => 'IPv6 сеть',
'fw_IPv6Subnet' => 'IPv6 префикс',
'fw_IPv6FieldsVisibleWhenEnabled' => 'IPv6 поля отображаются при включенном IPv6',
```

Then use `translations` skill to translate to all 29 languages.

#### 8. Create Unit Tests
**File**: `tests/Core/System/Configs/IptablesConfTest.php` (new)

Tests:
- `testGetFirewallRuleIPv4()` - verify IPv4 generates `iptables` command
- `testGetFirewallRuleIPv6()` - verify IPv6 generates `ip6tables` command
- `testGetFirewallRuleIPv6CIDR()` - verify IPv6 CIDR notation (/64, /48)
- `testGetFirewallRuleLocalhost()` - verify `::1` handling

**File**: `tests/Common/Models/NetworkFiltersTest.php` (new)

Tests:
- `testValidateIPv4CIDR()` - valid IPv4 CIDR passes validation
- `testValidateIPv6CIDR()` - valid IPv6 CIDR passes validation
- `testRejectInvalidIPv6CIDR()` - invalid IPv6 rejected
- `testRejectMixedProtocols()` - cannot have both IPv4 and IPv6

#### 9. Update Documentation
**Files to update**:
- `src/Core/System/Configs/CLAUDE.md` - document IPv6 firewall support
- `src/AdminCabinet/CLAUDE.md` - document dual-stack form pattern
- User-facing docs (if any)

## Success Criteria

- [x] Complete audit of IPv6 firewall rule generation
- [x] Research report on IPv6 firewall best practices
- [x] LanInterfaces helper method added (`isIpv6Enabled()`)
- [x] NetworkFilters model validates IPv6 CIDR (`beforeValidation()` with `IpAddressHelper::normalizeCidr()`)
- [x] Cidr class supports IPv6 prefix lengths (`getIPv6NetMasks()` /0-/128)
- [x] FirewallEditForm has separate IPv4/IPv6 fields (conditional based on `isIpv6Enabled()`)
- [x] JavaScript validates dual-stack input (RFC 4291 regex, auto-clear logic)
- [x] SaveRecordAction accepts IPv6 subnets (`validateIpAndCidr()` with /0-/128)
- [x] Translation keys added (ru/en/nl - core languages)
- [x] Unit tests for IPv6 firewall rules (`NetworkFiltersTest.php`, `IptablesConfIpv6Test.php`)
- [x] Documentation updated (CLAUDE.md files)

## Implementation Summary (Completed 2025-12-16)

### Files Modified

| Component | File | Changes |
|-----------|------|---------|
| **Model** | `src/Common/Models/NetworkFilters.php` | Added `beforeValidation()` with IPv6 CIDR validation |
| **Model** | `src/Common/Models/LanInterfaces.php` | Added `isIpv6Enabled()` static method |
| **Library** | `src/AdminCabinet/Library/Cidr.php` | Added `getIPv6NetMasks()` for /0-/128 prefixes |
| **Form** | `src/AdminCabinet/Forms/FirewallEditForm.php` | Separate IPv4/IPv6 fields, conditional on `isIpv6Enabled()` |
| **View** | `src/AdminCabinet/Views/Firewall/modify.volt` | IPv6 network/subnet fields with conditional display |
| **JavaScript** | `sites/admin-cabinet/assets/js/src/Firewall/firewall-modify.js` | RFC 4291 validation, auto-clear logic, either/or enforcement |
| **REST API** | `src/PBXCoreREST/Lib/Firewall/SaveRecordAction.php` | `validateIpAndCidr()` with IPv6 /0-/128 support |
| **REST API** | `src/PBXCoreREST/Lib/Firewall/GetListAction.php` | IPv6 support, ::/0 handling, dual-stack detection |
| **Translations** | `src/Common/Messages/*/NetworkSecurity.php` | IPv6 keys (fw_ValidateIPv6Address, fw_IPv6Network, etc.) |
| **Tests** | `tests/Common/Models/NetworkFiltersTest.php` | IPv6 CIDR validation tests |
| **Tests** | `tests/Unit/Core/System/Configs/IptablesConfIpv6Test.php` | ip6tables rule generation tests |

### Key Features Implemented

1. **Dual-Stack UI** - Separate IPv4/IPv6 input fields with auto-clear logic
2. **Either/Or Validation** - User must enter IPv4 OR IPv6, not both (NIST compliance)
3. **Conditional IPv6 Fields** - Only visible when IPv6 enabled on any interface
4. **RFC 4291 Validation** - Strict IPv6 format validation in JavaScript
5. **Backend Validation** - IpAddressHelper::normalizeCidr() for both protocols
6. **Unified Storage** - Single permit/deny fields (backward compatible)

## Notes

**Key Design Decisions**:
1. ✅ **Keep unified storage** - `permit`/`deny` fields unchanged (industry standard)
2. ✅ **Separate UI fields** - explicit IPv4 vs IPv6 for better UX
3. ✅ **Conditional IPv6** - only show IPv6 when enabled in LanInterfaces
4. ✅ **Either/or validation** - enforce NIST requirement (one protocol per rule)
5. ✅ **Backward compatible** - existing IPv4 rules continue to work
