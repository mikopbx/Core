# MikoPBX Models Guide

Database models for MikoPBX using Phalcon ORM. Located in `/src/Common/Models/`.

## Architecture

1. **Central Hub**: `Extensions` model connects all phone number types
2. **Polymorphic Relations**: Extensions link to different entities by type
3. **Auto Caching**: Redis caching for performance
4. **Change Tracking**: All models inherit from `ModelsBase`
5. **Cascade Operations**: Automatic related record management

## Model Relationships

```
Users ──hasMany──> Extensions <──hasOne── Sip
                        │                   │
                        ├──> CallQueues     └──> SipHosts
                        ├──> ConferenceRooms
                        └──> IvrMenu ──hasMany──> IvrMenuActions

Providers ──hasMany──> IncomingRoutingTable <──belongsTo── Extensions
    └──hasMany──> OutgoingRoutingTable
```

## Core Models

### Extensions (Central Hub)
**Table**: `m_Extensions`

```php
// Types
const TYPE_SIP = 'SIP';
const TYPE_EXTERNAL = 'EXTERNAL';
const TYPE_QUEUE = 'QUEUE';
const TYPE_CONFERENCE = 'CONFERENCE';
const TYPE_DIALPLAN_APPLICATION = 'DIALPLAN APPLICATION';
const TYPE_IVR_MENU = 'IVR MENU';

// Key fields
number              // Extension number (2-8 digits)
type                // Extension type (see constants)
callerid            // Display name
userid              // Associated user
show_in_phonebook   // "1" to show
is_general_user_number // "1" for primary extension

// Usage
$ext = Extensions::findFirstByNumber('100');
if ($ext->type === Extensions::TYPE_SIP) {
    $sip = $ext->Sip; // Get SIP account
}
```

### Users
**Table**: `m_Users`

```php
// Fields
email, username, language, avatar

// Relations
hasMany → Extensions

// Get user extensions
$user = Users::findFirstById($userId);
$extensions = $user->Extensions;
```

### Sip
**Table**: `m_Sip`

```php
// Key fields
extension           // Extension number
secret              // Password
transport           // udp/tcp/tls
networkfilterid     // IP restrictions
manualattributes    // Custom SIP headers

// Generate password
$sip->secret = Sip::generateRandomPassword();
```

### Providers
**Table**: `m_Providers`

```php
// Types
type: 'SIP' or 'IAX'

// Relations
hasOne → Sip/Iax
hasMany → IncomingRoutingTable, OutgoingRoutingTable
```

## Routing Models

### IncomingRoutingTable
**Table**: `m_IncomingRoutingTable`

```php
// Actions
const ACTION_EXTENSION = 'extension';
const ACTION_HANGUP = 'hangup';
const ACTION_BUSY = 'busy';
const ACTION_VOICEMAIL = 'voicemail';

// Key fields
number              // DID pattern
extension           // Destination
provider            // Provider ID
priority            // Rule priority (0-9999)
timeout             // Ring timeout
```

### OutgoingRoutingTable
**Table**: `m_OutgoingRoutingTable`

```php
// Key fields
providerid          // Provider to use
numberbeginswith    // Pattern match
restnumbers         // Remaining digits (-1 = all)
trimfrombegin       // Strip prefix
prepend             // Add prefix
priority            // Rule order
```

## Call Features

### CallQueues
**Table**: `m_CallQueues`

```php
// Strategies
const STRATEGY_RINGALL = 'ringall';
const STRATEGY_LEASTRECENT = 'leastrecent';
const STRATEGY_RANDOM = 'random';
const STRATEGY_RRMEMORY = 'rrmemory';

// Fields
name, extension, strategy
seconds_to_ring_each_member
timeout_extension    // Overflow destination

// Get members
$queue = CallQueues::findFirstByUniqid($id);
$members = $queue->CallQueueMembers;
```

### ConferenceRooms
**Table**: `m_ConferenceRooms`

```php
extension, name, pinCode
```

### IvrMenu & IvrMenuActions
**Tables**: `m_IvrMenu`, `m_IvrMenuActions`

```php
// IvrMenu
name, extension, audio_message_id
timeout_extension, number_of_repeat

// IvrMenuActions (digit press actions)
digits              // Key pressed (0-9, *, #)
extension           // Destination
```

## Security Models

### NetworkFilters
**Table**: `m_NetworkFilters`
- `permit/deny` - Allowed/blocked IPs
- `local_network` - "1" for local nets

### FirewallRules
**Table**: `m_FirewallRules`

```php
const CATEGORY_SIP = 'SIP';     // 5060/5061
const CATEGORY_WEB = 'WEB';     // 80/443
const CATEGORY_SSH = 'SSH';     // 22
const CATEGORY_AMI = 'AMI';     // 5038
```

### Fail2BanRules
**Table**: `m_Fail2BanRules`
- `maxretry` (5), `bantime` (86400s), `findtime` (1800s), `whitelist`

## Settings & Data

### PbxSettings
**Table**: `m_PbxSettings` - Key-value store with Redis caching

```php
$value = PbxSettings::getValueByKey('PBXVersion');
PbxSettings::setValue('PBXVersion', '2024.1.0');
```

### SoundFiles
**Table**: `m_SoundFiles`

```php
const CATEGORY_MOH = 'moh';        // Music on hold
const CATEGORY_CUSTOM = 'custom';  // Custom sounds
// Fields: name, path, category
```

### CustomFiles
**Table**: `m_CustomFiles`

```php
const MODE_APPEND = 'append';      // Add to original
const MODE_OVERRIDE = 'override';  // Replace file
const MODE_SCRIPT = 'script';      // Execute as script
// Fields: filepath, content, mode, changed
```

## CDR Models

### CallDetailRecords
**Tables**: `cdr_general` (permanent), `cdr` (temporary)

```php
// Key fields: start, src_num, dst_num, duration, billsec
// disposition: ANSWERED/NO ANSWER/BUSY/FAILED
// recordingfile: Path to recording

$calls = CallDetailRecords::find([
    'conditions' => 'src_num = :num: OR dst_num = :num:',
    'bind' => ['num' => '100']
]);
```

## Usage Patterns

### Creating with Transaction
```php
$transaction = DI::getDefault()->getShared('db')->begin();
$extension = new Extensions();
$extension->setTransaction($transaction);
$extension->number = '100';
$extension->type = Extensions::TYPE_SIP;
$extension->save();
// Create related Sip...
$transaction->commit();
```

### Finding Records
```php
// By primary key
$ext = Extensions::findFirstByNumber('100');

// With conditions
$providers = Providers::find([
    'conditions' => 'type = :type:',
    'bind' => ['type' => 'SIP']
]);
```

### Model Events
```php
// Hooks: beforeValidation, afterSave, beforeDelete, etc.
public function afterSave() {
    $this->clearCache('Extensions');
}
```

## Best Practices

1. **Validate saves**: `if (!$model->save()) { $errors = $model->getMessages(); }`
2. **Use transactions** for related operations
3. **Check existence** before accessing relations
4. **Use constants**: `Extensions::TYPE_SIP` not `'SIP'`
5. **Handle cascades** - deleting Extension removes related records

## Quick Reference

```php
// All SIP extensions
Extensions::find(['conditions' => 'type = :type:', 'bind' => ['type' => Extensions::TYPE_SIP]]);

// Active calls
CallDetailRecordsTmp::find(['conditions' => 'endtime IS NULL OR endtime = ""']);

// Routes for provider
OutgoingRoutingTable::find(['conditions' => 'providerid = :pid:', 'bind' => ['pid' => $id]]);
```

For detailed field descriptions and advanced usage, see inline documentation in model classes.