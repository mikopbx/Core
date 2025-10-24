# MikoPBX Translation Key Prefixes

All translation keys follow a strict naming convention using module prefixes.

## Module Prefixes (2-3 characters)

### Core Modules

| Prefix | Module | Example File | Usage |
|--------|--------|--------------|-------|
| `ak_` | API Keys | `ApiKeys.php` | API key management interface |
| `am_` | Asterisk Managers | `AsteriskManagers.php` | AMI user configuration |
| `aru_` | Asterisk REST Users | `AsteriskRestUsers.php` | ARI user settings |
| `auth_` | Authentication | `Auth.php` | Login, logout, sessions |
| `ex_` | Extensions | `Extensions.php` | Extensions and employees |
| `pr_` | Providers | `Providers.php` | SIP/IAX provider settings |
| `pk_` | Passkeys | `Passkeys.php` | WebAuthn passkey management |
| `pw_` | Passwords | `Passwords.php` | Password management |

### Communication & Routing

| Prefix | Module | Example File | Usage |
|--------|--------|--------------|-------|
| `ir_` | Incoming Routes | `IncomingRoutes.php` | Inbound call routing |
| `or_` | Outbound Routes | `OutboundRoutes.php` | Outbound call routing |
| `iv_` | IVR Menu | `IvrMenu.php` | Interactive voice response |
| `cq_` | Call Queues | `CallQueues.php` | Queue configuration |
| `cr_` | Conference Rooms | `ConferenceRooms.php` | Conference settings |

### System & Settings

| Prefix | Module | Example File | Usage |
|--------|--------|--------------|-------|
| `gs_` | General Settings | `GeneralSettings.php` | System-wide settings |
| `ms_` | Mail Settings | `MailSettings.php` | Email configuration |
| `tf_` | Time Settings | `TimeSettings.php` | Time/date settings |
| `net_` | Network | `Network.php` | Network configuration |
| `fw_` | Firewall | `Firewall.php` | Security and firewall |
| `sf_` | Sound Files | `SoundFiles.php` | Audio file management |

### System Messages

| Prefix | Module | Example File | Usage |
|--------|--------|--------------|-------|
| `api_` | REST API | `RestApi.php` | API error/success messages |
| `sys_` | System | `System.php` | System-level messages |
| `adv_` | Advisor/Warnings | `Advice.php` | System advisories |
| `log_` | Logging | `Logging.php` | Log-related messages |
| `msg_` | Messages | `Common.php` | Generic messages |

### Features & Tools

| Prefix | Module | Example File | Usage |
|--------|--------|--------------|-------|
| `mod_` | Modules | `Modules.php` | Extension module management |
| `lic_` | License | `License.php` | Licensing system |
| `upd_` | Updates | `Updates.php` | System updates |
| `bk_` | Backup | `Backup.php` | Backup/restore |
| `cdr_` | Call Records | `CallRecords.php` | CDR interface |
| `bt_` | Buttons | `Common.php` | UI button labels |

## Message Type Suffixes

Use these suffixes to indicate message purpose:

### Validation & Errors

| Suffix | Purpose | Example |
|--------|---------|---------|
| `_Validate` | Validation rules | `gs_ValidateEmptyPassword` |
| `_Error` | Error messages | `api_UnknownError` |
| `_Warning` | Warning messages | `gs_WarningDefaultPassword` |
| `_Info` | Information messages | `sys_InfoRestarting` |
| `_Success` | Success messages | `ex_SuccessfullyCreated` |

### UI Elements

| Suffix | Purpose | Example |
|--------|---------|---------|
| `_Tooltip` | UI tooltips | `bt_ToolTipGeneratePassword` |
| `_Placeholder` | Input placeholders | `ex_PlaceholderEnterName` |
| `_Label` | Form labels | `gs_LabelSystemName` |
| `_Button` | Button text | `bt_ButtonSave` |

### Structured Content

| Suffix | Purpose | Example |
|--------|---------|---------|
| `_header` | Section header | `ak_ApiKeyUsageTooltip_header` |
| `_desc` | Description text | `ak_ApiKeyUsageTooltip_desc` |
| `_example` | Example content | `ak_ApiKeyUsageTooltip_curl_example` |
| `_title` | Title text | `gs_SettingsTitle` |

## Naming Best Practices

### 1. File Organization

Create dedicated files for major modules:

```
ApiKeys.php     → All ak_* keys
Extensions.php  → All ex_* keys
Providers.php   → All pr_* keys
Common.php      → Generic bt_*, msg_* keys
```

### 2. Key Structure

```php
// Pattern: [prefix]_[Feature][Type][Suffix]
'ak_ApiKeyWarning'              // API Keys warning
'ex_ValidateEmailFormat'        // Extension email validation
'pr_SipProviderSettings'        // Provider settings label
'gs_PasswordLength'             // General settings with placeholder
```

### 3. Consistency Examples

```php
// ✅ GOOD - Consistent naming
'ex_AddNewExtension'        // Action button
'ex_DeleteExtension'        // Delete action
'ex_EditExtension'          // Edit action

// ❌ BAD - Inconsistent naming
'ex_AddNewExtension'        // "New" included
'ex_Delete'                 // Missing context
'ex_EditExisting'           // "Existing" unnecessary
```

### 4. Placeholder Naming

Always use descriptive placeholder names:

```php
// ✅ GOOD
'gs_PasswordLength' => 'Длина: %length% из %max%'
'ak_ConfirmDelete' => 'Удалить API ключ "{0}"?'

// ❌ BAD
'gs_PasswordLength' => 'Длина: %1% из %2%'  // Non-descriptive
'ak_ConfirmDelete' => 'Удалить %s?'         // Wrong format
```

## Choosing the Right Prefix

### Decision Tree

```
Is it for a specific module/feature?
├─ YES → Use module prefix (ak_, ex_, pr_, etc.)
└─ NO ↓

Is it a REST API message?
├─ YES → Use api_
└─ NO ↓

Is it a system-level message?
├─ YES → Use sys_
└─ NO ↓

Is it a generic UI element?
├─ YES → Use bt_ (button) or msg_
└─ NO → Use msg_ or ask maintainer
```

### Examples

```php
// Feature-specific → Use module prefix
'ak_ApiKeyExpired' => 'API ключ истек'  // API Keys module

// REST API error → Use api_
'api_InvalidRequest' => 'Некорректный запрос'

// System message → Use sys_
'sys_ServiceRestarting' => 'Служба перезапускается'

// Generic button → Use bt_
'bt_Save' => 'Сохранить'
```

## Reserving New Prefixes

When creating a new module:

1. **Choose 2-3 character prefix** (lowercase)
2. **Check for conflicts** in existing files
3. **Document in this file**
4. **Create dedicated translation file**

Example:

```php
// New Firewall module
Prefix: fw_
File: Firewall.php
Usage: 'fw_AddRule', 'fw_BlockedIPs', etc.
```

## Migration & Cleanup

When renaming or removing modules:

1. **Find all keys** with old prefix
2. **Update in ALL 29 languages**
3. **Test for broken references**
4. **Remove obsolete keys**

Example cleanup command:

```bash
# Find all keys with deprecated prefix
grep -r "old_" src/Common/Messages/

# Count occurrences
grep -r "old_" src/Common/Messages/ | wc -l
```

## Quick Reference

**Most Common Prefixes:**
- `ak_` - API Keys
- `ex_` - Extensions
- `pr_` - Providers
- `gs_` - General Settings
- `api_` - REST API messages
- `bt_` - Buttons

**Most Common Suffixes:**
- `_Validate` - Validation
- `_Error` - Errors
- `_Tooltip` - Help text
- `_header` / `_desc` - Structured content
