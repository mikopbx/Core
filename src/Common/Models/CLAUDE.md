# CLAUDE.md - MikoPBX Models

Database models for MikoPBX using Phalcon ORM with SQLite backend.

## File Inventory (43 models)

```
Models/
├── ModelsBase.php                     # Base class for all models (extends Phalcon\Mvc\Model)
├── PBXSettings/
│   ├── PbxSettingsConstantsTrait.php  # 300+ settings key constants
│   └── PbxSettingsDefaultValuesTrait.php # Default values for all keys
├── Traits/
│   └── RecordRepresentationTrait.php  # Human-readable model display
│
├── Extensions.php                     # Central hub - connects all phone number types
├── Users.php                          # User accounts
├── Sip.php                            # SIP endpoint configuration
├── Iax.php                            # IAX endpoint configuration
├── Providers.php                      # SIP/IAX trunk providers
├── SipHosts.php                       # Provider SIP host addresses
│
├── IncomingRoutingTable.php           # Inbound call routing rules
├── OutgoingRoutingTable.php           # Outbound call routing rules
│
├── CallQueues.php                     # Call queue configuration
├── CallQueueMembers.php               # Queue member assignments
├── ConferenceRooms.php                # Conference rooms
├── IvrMenu.php                        # IVR menu definitions
├── IvrMenuActions.php                 # IVR digit-press actions
├── OutWorkTimes.php                   # After-hours schedules
├── OutWorkTimesRouts.php              # After-hours routing
├── ExtensionForwardingRights.php      # Call forwarding settings
│
├── LanInterfaces.php                  # Network interfaces (IPv4/IPv6)
├── NetworkFilters.php                 # IP allow/deny filters
├── NetworkStaticRoutes.php            # Static routes (IPv4/IPv6)
├── FirewallRules.php                  # Firewall port rules
├── Fail2BanRules.php                  # Intrusion prevention
│
├── ApiKeys.php                        # REST API Bearer tokens
├── UserPasskeys.php                   # WebAuthn/FIDO2 passkeys
├── AsteriskManagerUsers.php           # AMI user accounts
├── AsteriskRestUsers.php              # ARI user accounts
│
├── RecordingStorage.php               # S3 recording location mapping
├── StorageSettings.php                # S3 storage configuration
├── Storage.php                        # Local storage devices
│
├── PbxSettings.php                    # Key-value system settings
├── PbxSettingsConstants.php           # Constants class (uses trait)
├── SoundFiles.php                     # Audio files
├── Codecs.php                         # Audio/video codecs
├── CustomFiles.php                    # Custom config file overrides
├── DialplanApplications.php           # Custom dialplan apps
├── ExternalPhones.php                 # External phone endpoints
│
├── CallDetailRecords.php              # CDR permanent (cdr_general)
├── CallDetailRecordsBase.php          # CDR base class
├── CallDetailRecordsTmp.php           # CDR temporary (cdr)
│
├── PbxExtensionModules.php            # Installed modules registry (incl. `module_type`: open enum `general`|`languagepack`|`security`|`cti`|`utility`|`call_feature`|`ai`|…, default `general`; used by advice banner classification and marketplace category filter)
└── LongPollSubscribe.php              # Event subscriptions
```

## Architecture

```
Users ──hasMany──> Extensions <──hasOne── Sip
                        │                   │
                        ├──> CallQueues     └──> SipHosts
                        ├──> ConferenceRooms
                        └──> IvrMenu ──hasMany──> IvrMenuActions

Providers ──hasMany──> IncomingRoutingTable <──belongsTo── Extensions
    └──hasMany──> OutgoingRoutingTable
```

- **Central Hub**: `Extensions` model connects all phone number types
- **Polymorphic Relations**: Extensions link to different entities by type
- **Auto Caching**: Redis caching via `ManagedCacheProvider`
- **Change Tracking**: All models inherit from `ModelsBase` (snapshot tracking)
- **Cascade Operations**: Automatic related record management via `beforeDelete`

## Key Constants

### Extensions Types
```php
public const string TYPE_SIP = 'SIP';
public const string TYPE_EXTERNAL = 'EXTERNAL';
public const string TYPE_QUEUE = 'QUEUE';
public const string TYPE_CONFERENCE = 'CONFERENCE';
public const string TYPE_DIALPLAN_APPLICATION = 'DIALPLAN APPLICATION';
public const string TYPE_IVR_MENU = 'IVR MENU';
public const string TYPE_MODULES = 'MODULES';
public const string TYPE_SYSTEM = 'SYSTEM';
public const string TYPE_PARKING = 'PARKING';

// Prefix constants for unique ID generation
public const string PREFIX_SIP = 'SIP-PHONE';
public const string PREFIX_EXTERNAL = 'EXTERNAL';
public const string PREFIX_EXTENSION = 'EXT';
public const string PREFIX_DIALPLAN = 'DIALPLAN';
public const string PREFIX_IVR = 'IVR';
public const string PREFIX_QUEUE = 'QUEUE';
public const string PREFIX_CONFERENCE = 'CONFERENCE';
public const string PREFIX_TRUNK_SIP = 'SIP-TRUNK';
public const string PREFIX_TRUNK_IAX = 'IAX-TRUNK';
public const string PREFIX_OUT_WORK_TIME = 'OUT-WORK-TIME';
```

### IncomingRoutingTable Actions
```php
public const string ACTION_EXTENSION = 'extension';      // Route to extension
public const string ACTION_PLAYBACK = 'playback';        // Play audio file

// DEPRECATED (since 2024.12.12) - Use ACTION_EXTENSION with special extensions:
public const string ACTION_HANGUP = 'hangup';            // Use extension='hangup'
public const string ACTION_BUSY = 'busy';                // Use extension='busy'
public const string ACTION_DID = 'did2user';             // Use extension='did2user'
public const string ACTION_VOICEMAIL = 'voicemail';      // Use extension='voicemail'
```

### Sip CallerID/DID Sources
```php
public const string CALLERID_SOURCE_DEFAULT = 'default';
public const string CALLERID_SOURCE_FROM = 'from';
public const string CALLERID_SOURCE_RPID = 'rpid';       // Remote-Party-ID
public const string CALLERID_SOURCE_PAI = 'pai';          // P-Asserted-Identity
public const string CALLERID_SOURCE_CUSTOM = 'custom';

public const string DID_SOURCE_DEFAULT = 'default';
public const string DID_SOURCE_TO = 'to';
public const string DID_SOURCE_RDNIS = 'rdnis';
public const string DID_SOURCE_INVITE = 'invite';
public const string DID_SOURCE_CUSTOM = 'custom';
```

## New Models

### ApiKeys (`m_ApiKeys`)
REST API Bearer token storage for authentication:
```php
id, description, key_hash (bcrypt), key_suffix (last 4 chars),
key_display (masked), networkfilterid, allowed_paths (JSON),
full_permissions, created_at, last_used_at

static generateApiKey(): string  // Generate 64-char hex token
```

### UserPasskeys (`m_UserPasskeys`)
WebAuthn/FIDO2 passkey storage for passwordless authentication:
```php
id, login, credential_id (base64url, UNIQUE),
public_key (base64 COSE), counter (replay prevention),
aaguid (authenticator GUID), name ("iPhone 15", "YubiKey 5"),
created_at, last_used_at
```

### RecordingStorage (`m_RecordingStorage`)
Maps CDR recording paths to storage locations (local vs S3):
```php
id, recordingfile (UNIQUE INDEX), storage_location ("local"|"s3"),
s3_key, uploaded_at, file_size

// Uses separate dbRecordingStorage connection
static findByPath(string): ?self
isInS3(): bool
shouldDeleteLocal(int $days): bool
shouldPermanentlyDelete(int $days): bool
```

### StorageSettings (`m_StorageSettings`)
S3-compatible storage configuration (singleton, id=1):
```php
id, s3_enabled (0|1), s3_endpoint, s3_region,
s3_bucket, s3_access_key, s3_secret_key

static getSettings(): self
isS3Configured(): bool
```

## Model Tables

| Model | Table | Database |
|-------|-------|----------|
| Extensions | `m_Extensions` | main |
| Users | `m_Users` | main |
| Sip | `m_Sip` | main |
| Iax | `m_Iax` | main |
| Providers | `m_Providers` | main |
| SipHosts | `m_SipHosts` | main |
| AsteriskManagerUsers | `m_AsteriskManagerUsers` | main |
| AsteriskRestUsers | `m_AsteriskRestUsers` | main |
| IncomingRoutingTable | `m_IncomingRoutingTable` | main |
| OutgoingRoutingTable | `m_OutgoingRoutingTable` | main |
| CallQueues | `m_CallQueues` | main |
| CallQueueMembers | `m_CallQueueMembers` | main |
| ConferenceRooms | `m_ConferenceRooms` | main |
| IvrMenu | `m_IvrMenu` | main |
| IvrMenuActions | `m_IvrMenuActions` | main |
| OutWorkTimes | `m_OutWorkTimes` | main |
| OutWorkTimesRouts | `m_OutWorkTimesRouts` | main |
| ExtensionForwardingRights | `m_ExtensionForwardingRights` | main |
| LanInterfaces | `m_LanInterfaces` | main |
| NetworkFilters | `m_NetworkFilters` | main |
| NetworkStaticRoutes | `m_NetworkStaticRoutes` | main |
| FirewallRules | `m_FirewallRules` | main |
| Fail2BanRules | `m_Fail2BanRules` | main |
| ApiKeys | `m_ApiKeys` | main |
| UserPasskeys | `m_UserPasskeys` | main |
| RecordingStorage | `m_RecordingStorage` | recording_storage |
| StorageSettings | `m_StorageSettings` | main |
| Storage | `m_Storage` | main |
| PbxSettings | `m_PbxSettings` | main |
| SoundFiles | `m_SoundFiles` | main |
| Codecs | `m_Codecs` | main |
| CustomFiles | `m_CustomFiles` | main |
| DialplanApplications | `m_DialplanApplications` | main |
| ExternalPhones | `m_ExternalPhones` | main |
| CallDetailRecords | `cdr_general` | CDR |
| CallDetailRecordsTmp | `cdr` | CDR |
| PbxExtensionModules | `m_PbxExtensionModules` | main |
| LongPollSubscribe | `m_LongPollSubscribe` | main |

## Base Classes

### ModelsBase
All models extend this. Features:
- `RecordRepresentationTrait` for human-readable display
- `makeCacheKey(string $modelClass, string $keyName): string`
- Snapshot tracking (`keepSnapshots(true)`)
- Event management

### CallDetailRecordsBase
Parent for CDR models. Shared fields: UNIQUEID, start, src_chan, dst_chan, src_num, dst_num, linkedid.

### PbxSettings Traits
- `PbxSettingsConstantsTrait` - 300+ key constants (General, Language, Cloud, Security, SIP/RTP/IAX, AMI, Email, Voicemail, etc.)
- `PbxSettingsDefaultValuesTrait` - `getDefaultArrayValues(): array`

## Usage Patterns

```php
// Find by primary key
$ext = Extensions::findFirstByNumber('100');

// With conditions
$providers = Providers::find([
    'conditions' => 'type = :type:',
    'bind' => ['type' => 'SIP']
]);

// Use constants
if ($ext->type === Extensions::TYPE_SIP) {
    $sip = $ext->Sip;
}

// Validate saves
if (!$model->save()) {
    $errors = $model->getMessages();
}

// Model events: beforeValidation, afterSave, beforeDelete, etc.
```

## Best Practices

1. Always use constants: `Extensions::TYPE_SIP` not `'SIP'`
2. Validate saves and check `getMessages()`
3. Use transactions for related operations
4. Check existence before accessing relations
5. Handle cascades - deleting Extension removes related records
