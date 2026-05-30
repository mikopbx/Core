# CLAUDE.md - MikoPBX Models

Database models for MikoPBX using Phalcon ORM with SQLite backend. General ORM/cache/cascade overview lives in root `CLAUDE.md` (§ Database); this file holds the model-specific conventions, relationships, constants and gotchas.

## File Inventory

```
ModelsBase.php                       # Base class (extends Phalcon\Mvc\Model)
PBXSettings/PbxSettingsConstantsTrait.php       # Settings key constants
PBXSettings/PbxSettingsDefaultValuesTrait.php   # Default values for all keys
Traits/RecordRepresentationTrait.php # Human-readable model display

Extensions.php          # Central hub - connects all phone number types
Users.php               # User accounts
Sip.php / Iax.php       # SIP / IAX endpoint configuration
Providers.php           # SIP/IAX trunk providers
SipHosts.php            # Provider SIP host addresses

IncomingRoutingTable.php / OutgoingRoutingTable.php  # Inbound / outbound routing rules

CallQueues.php / CallQueueMembers.php  # Queue config / member assignments
ConferenceRooms.php     # Conference rooms
IvrMenu.php / IvrMenuActions.php       # IVR menu defs / digit-press actions
OutWorkTimes.php / OutWorkTimesRouts.php   # After-hours schedules / routing
ExtensionForwardingRights.php          # Call forwarding settings

LanInterfaces.php       # Network interfaces (IPv4/IPv6)
NetworkFilters.php      # IP allow/deny filters
NetworkStaticRoutes.php # Static routes (IPv4/IPv6)
FirewallRules.php       # Firewall port rules
Fail2BanRules.php       # Intrusion prevention

ApiKeys.php             # REST API Bearer tokens
UserPasskeys.php        # WebAuthn/FIDO2 passkeys
AsteriskManagerUsers.php / AsteriskRestUsers.php   # AMI / ARI user accounts

RecordingStorage.php    # S3 recording location mapping
StorageSettings.php     # S3 storage configuration
Storage.php             # Local storage devices

PbxSettings.php         # Key-value system settings
PbxSettingsConstants.php # Constants class (uses trait)
SoundFiles.php          # Audio files
Codecs.php              # Audio/video codecs
CustomFiles.php         # Custom config file overrides
DialplanApplications.php # Custom dialplan apps
ExternalPhones.php      # External phone endpoints

CallDetailRecords.php / CallDetailRecordsTmp.php / CallDetailRecordsBase.php
                        # CDR permanent (cdr_general) / temp (cdr) / base class
PbxExtensionModules.php # Installed modules registry
LongPollSubscribe.php   # Event subscriptions
```

`PbxExtensionModules.module_type` is an open enum (`general`|`languagepack`|`security`|`cti`|`utility`|`call_feature`|`ai`|…, default `general`) used by the advice-banner classification and the marketplace category filter.

## Table & Connection Mapping

Every model maps to table `m_<ClassName>` on the **main** DB (connection `db`),
except:

| Model | Table | Connection |
|-------|-------|------------|
| CallDetailRecords | `cdr_general` | `dbCDR` |
| CallDetailRecordsTmp | `cdr` | `dbCDR` |
| RecordingStorage | `m_RecordingStorage` | `dbRecordingStorage` |

CDR uses a separate database for performance; recording metadata its own.

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

- **Central Hub**: `Extensions` connects all phone number types (polymorphic — links to different entities by `type`).
- **Auto Caching**: Redis caching via `ManagedCacheProvider`.
- **Change Tracking**: all models inherit `ModelsBase` snapshot tracking (`keepSnapshots(true)`).
- **Cascade Operations**: automatic related-record management via `beforeDelete` (deleting an Extension removes related records).

## Key Constants

### Extensions Types & Prefixes
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
public const string CALLERID_SOURCE_RPID = 'rpid';        // Remote-Party-ID
public const string CALLERID_SOURCE_PAI = 'pai';          // P-Asserted-Identity
public const string CALLERID_SOURCE_CUSTOM = 'custom';

public const string DID_SOURCE_DEFAULT = 'default';
public const string DID_SOURCE_TO = 'to';
public const string DID_SOURCE_DIVERSION = 'diversion';
public const string DID_SOURCE_CUSTOM = 'custom';
```

## Models with Custom Schema/Helpers

### ApiKeys (`m_ApiKeys`) — REST API Bearer token storage
Fields: `id, description, key_hash` (bcrypt), `key_suffix` (last 4 chars), `key_display` (masked), `networkfilterid, allowed_paths` (JSON), `full_permissions, created_at, last_used_at`.
Helper: `static generateApiKey(): string` — 64-char hex token.

### UserPasskeys (`m_UserPasskeys`) — WebAuthn/FIDO2 passwordless auth
Fields: `id, login, credential_id` (base64url, UNIQUE), `public_key` (base64 COSE), `counter` (replay prevention), `aaguid` (authenticator GUID), `name` ("iPhone 15", "YubiKey 5"), `created_at, last_used_at`.

### RecordingStorage (`m_RecordingStorage`, conn `dbRecordingStorage`)
Maps CDR recording paths to storage locations (local vs S3).
Fields: `id, recordingfile` (UNIQUE INDEX), `storage_location` ("local"|"s3"), `s3_key, uploaded_at, file_size`.
Helpers: `static findByPath(string): ?self`, `isInS3(): bool`, `shouldDeleteLocal(int $days): bool`, `shouldPermanentlyDelete(int $days): bool`.

### StorageSettings (`m_StorageSettings`) — S3-compatible config (singleton, id=1)
Fields: `id, s3_enabled` (0|1), `s3_endpoint, s3_region, s3_bucket, s3_access_key, s3_secret_key`.
Helpers: `static getSettings(): self`, `isS3Configured(): bool`.

## Base Classes

### ModelsBase
All models extend this. Provides:
- `RecordRepresentationTrait` for human-readable display
- `makeCacheKey(string $modelClass, string $keyName): string`
- Snapshot tracking (`keepSnapshots(true)`) and event management

### CallDetailRecordsBase
Parent for CDR models. Shared fields: UNIQUEID, start, src_chan, dst_chan, src_num, dst_num, linkedid.

### PbxSettings Traits
- `PbxSettingsConstantsTrait` — settings key constants (General, Language, Cloud, Security, SIP/RTP/IAX, AMI, Email, Voicemail, etc.)
- `PbxSettingsDefaultValuesTrait` — `getDefaultArrayValues(): array`

## Usage Patterns

```php
$ext = Extensions::findFirstByNumber('100');           // find by indexed field

$providers = Providers::find([                          // with conditions
    'conditions' => 'type = :type:',
    'bind' => ['type' => 'SIP']
]);

if ($ext->type === Extensions::TYPE_SIP) {              // use constants, not literals
    $sip = $ext->Sip;
}

if (!$model->save()) {                                  // always validate saves
    $errors = $model->getMessages();
}
// Model events: beforeValidation, afterSave, beforeDelete, etc.
```

## Best Practices

1. Always use constants: `Extensions::TYPE_SIP` not `'SIP'`.
2. Validate saves and check `getMessages()`.
3. Use transactions for related operations.
4. Check existence before accessing relations.
5. Handle cascades — deleting an Extension removes related records.
