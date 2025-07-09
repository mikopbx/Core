# Models Documentation for MikoPBX

This document provides comprehensive information about all data models used in MikoPBX. The models are located in `/src/Common/Models/` and represent the database structure and business logic of the PBX system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Model Relationships Diagram](#model-relationships-diagram)
- [Base Classes](#base-classes)
- [User and Extension Models](#user-and-extension-models)
- [Provider and Routing Models](#provider-and-routing-models)
- [Call Features Models](#call-features-models)
- [Security and Network Models](#security-and-network-models)
- [Settings and Data Models](#settings-and-data-models)
- [CDR and Logging Models](#cdr-and-logging-models)
- [System Models](#system-models)
- [Usage Patterns](#usage-patterns)
- [Constants and Enumerations](#constants-and-enumerations)

## Architecture Overview

MikoPBX uses Phalcon ORM for database interactions. The models follow these architectural principles:

1. **Central Extension Model**: The `Extensions` model serves as the central hub connecting all types of phone numbers (SIP, queues, conferences, etc.)
2. **Polymorphic Relations**: Extensions can be associated with different entity types through conditional relations
3. **Automatic Caching**: Many models implement caching through Redis for performance
4. **Change Tracking**: All models inherit change tracking functionality from `ModelsBase`
5. **Cascade Operations**: Related records are automatically managed through cascade delete/update rules

## Model Relationships Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│    Users    │────────▶│  Extensions  │◀────────│      Sip        │
└─────────────┘ hasMany └──────────────┘ hasOne  └─────────────────┘
                              │                           │
                              │                           │ hasMany
                    ┌─────────┴─────────┐                 ▼
                    │                   │         ┌─────────────────┐
                    ▼                   ▼         │   SipHosts      │
           ┌──────────────┐    ┌───────────────┐  └─────────────────┘
           │ CallQueues   │    │ConferenceRooms│
           └──────────────┘    └───────────────┘
                  │
                  │ hasMany
                  ▼
         ┌──────────────────┐
         │CallQueueMembers  │
         └──────────────────┘

┌─────────────┐          ┌────────────────────┐          ┌──────────────────┐
│  Providers  │─────────▶│IncomingRoutingTable│◀─────────│   Extensions     │
└─────────────┘ hasMany  └────────────────────┘ belongsTo└──────────────────┘
       │
       │ hasMany
       ▼
┌────────────────────┐
│OutgoingRoutingTable│
└────────────────────┘
```

## Base Classes

### ModelsBase

**Location**: `ModelsBase.php`

Base class for all models providing common functionality:

- **Change Tracking**: Tracks field changes and fires events
- **Caching**: Implements model caching with Redis
- **Validation**: Common validation methods
- **Representation**: Methods like `getRepresent()` for display names
- **Module Integration**: Automatically adds relations from extension modules

Key Methods:
- `getChangedFields()` - Get list of changed fields
- `saveCache()` / `readCache()` - Cache management
- `getMessages()` - Get validation messages
- `getWebInterfaceLink()` - Get web UI link for the entity

### CallDetailRecordsBase

**Location**: `CallDetailRecordsBase.php`

Base class for CDR models containing all call record fields:

```php
public string $start;          // Call start timestamp
public string $src_num;        // Source number
public string $dst_num;        // Destination number
public string $duration;       // Call duration
public string $billsec;        // Billable seconds
public string $disposition;    // Call result (ANSWERED, NO ANSWER, BUSY, FAILED)
public string $recordingfile;  // Path to recording
```

## User and Extension Models

### Users

**Table**: `m_Users`  
**Purpose**: Stores system users who can have extensions

**Key Fields**:
- `id` (string) - Unique identifier
- `email` (string) - User email
- `username` (string) - Display name
- `language` (string) - User interface language
- `avatar` (string) - Avatar image path

**Relations**:
- hasMany → `Extensions`

**Usage Example**:
```php
$user = Users::findFirstById($userId);
$extensions = $user->Extensions; // Get all user extensions
```

### Extensions

**Table**: `m_Extensions`  
**Purpose**: Central model for all internal numbers in the system

**Key Fields**:
- `id` (string) - Unique identifier
- `number` (string) - Extension number
- `type` (string) - Extension type (see constants below)
- `callerid` (string) - Caller ID name
- `userid` (string) - Associated user ID
- `show_in_phonebook` (string) - "1" to show in phonebook
- `public_access` (string) - "1" for public access
- `is_general_user_number` (string) - "1" for primary user extension

**Extension Types**:
```php
const TYPE_SIP = 'SIP';
const TYPE_EXTERNAL = 'EXTERNAL';
const TYPE_QUEUE = 'QUEUE';
const TYPE_CONFERENCE = 'CONFERENCE';
const TYPE_DIALPLAN_APPLICATION = 'DIALPLAN APPLICATION';
const TYPE_IVR_MENU = 'IVR MENU';
const TYPE_MODULES = 'MODULES';
const TYPE_SYSTEM = 'SYSTEM';
const TYPE_PARKING = 'PARKING';
```

**Relations**:
- belongsTo → `Users`
- hasOne → `Sip`, `ExternalPhones`, `DialplanApplications`, `ConferenceRooms`, `CallQueues`, `IvrMenu`
- hasMany → `CallQueueMembers`, `IncomingRoutingTable`, `OutWorkTimes`, `IvrMenuActions`

**Usage Example**:
```php
// Find extension by number
$extension = Extensions::findFirstByNumber('100');

// Get associated entity based on type
if ($extension->type === Extensions::TYPE_SIP) {
    $sipAccount = $extension->Sip;
}
```

### Sip

**Table**: `m_Sip`  
**Purpose**: SIP account configurations for users and providers

**Key Fields**:
- `uniqid` (string) - Unique identifier
- `extension` (string) - Associated extension number
- `type` (string) - peer/friend
- `username` (string) - SIP username
- `secret` (string) - SIP password
- `host` (string) - Host/IP address
- `port` (integer) - SIP port
- `transport` (string) - Transport protocol
- `networkfilterid` (string) - Network filter ID
- `manualattributes` (string) - Additional SIP attributes

**Relations**:
- belongsTo → `Extensions`, `NetworkFilters`, `Providers`
- hasMany → `SipHosts`

### ExternalPhones

**Table**: `m_ExternalPhones`  
**Purpose**: External phone numbers (mobile) for users

**Key Fields**:
- `extension` (string) - Associated extension
- `dialstring` (string) - Number to dial
- `disabled` (string) - "1" if disabled

**Relations**:
- belongsTo → `Extensions`

## Provider and Routing Models

### Providers

**Table**: `m_Providers`  
**Purpose**: Telephony providers (SIP/IAX trunks)

**Key Fields**:
- `id` (string) - Unique identifier
- `uniqid` (string) - Unique ID
- `type` (string) - Provider type (SIP/IAX)
- `sipuid` (string) - SIP account ID
- `iaxuid` (string) - IAX account ID
- `note` (string) - Description

**Relations**:
- hasOne → `Sip`, `Iax`
- hasMany → `OutgoingRoutingTable`, `IncomingRoutingTable`

### IncomingRoutingTable

**Table**: `m_IncomingRoutingTable`  
**Purpose**: Incoming call routing rules

**Key Fields**:
- `rulename` (string) - Rule name
- `number` (string) - DID number pattern
- `extension` (string) - Destination extension
- `provider` (string) - Provider ID
- `priority` (integer) - Rule priority
- `timeout` (integer) - Ring timeout
- `action` (string) - Action to perform

**Actions**:
```php
const ACTION_EXTENSION = 'extension';
const ACTION_HANGUP = 'hangup';
const ACTION_BUSY = 'busy';
const ACTION_DID2USER = 'did2user';
const ACTION_VOICEMAIL = 'voicemail';
const ACTION_PLAYBACK = 'playback';
```

**Relations**:
- belongsTo → `Extensions`, `Providers`, `SoundFiles`

### OutgoingRoutingTable

**Table**: `m_OutgoingRoutingTable`  
**Purpose**: Outgoing call routing rules

**Key Fields**:
- `rulename` (string) - Rule name
- `providerid` (string) - Provider to use
- `priority` (integer) - Rule priority
- `numberbeginswith` (string) - Number pattern
- `restnumbers` (integer) - Remaining digits count
- `trimfrombegin` (integer) - Digits to trim
- `prepend` (string) - Prefix to add

**Relations**:
- belongsTo → `Providers`

## Call Features Models

### CallQueues

**Table**: `m_CallQueues`  
**Purpose**: Call queue configurations

**Key Fields**:
- `uniqid` (string) - Unique identifier
- `name` (string) - Queue name
- `extension` (string) - Queue extension
- `strategy` (string) - Ring strategy
- `seconds_to_ring_each_member` (integer) - Ring duration
- `periodic_announce_sound_id` (string) - Announcement sound
- `timeout_extension` (string) - Timeout destination

**Strategies**:
```php
const STRATEGY_RINGALL = 'ringall';
const STRATEGY_LEASTRECENT = 'leastrecent';
const STRATEGY_FEWESTCALLS = 'fewestcalls';
const STRATEGY_RANDOM = 'random';
const STRATEGY_RRMEMORY = 'rrmemory';
const STRATEGY_LINEAR = 'linear';
```

**Relations**:
- belongsTo → `Extensions`, `SoundFiles`
- hasMany → `CallQueueMembers`

### CallQueueMembers

**Table**: `m_CallQueueMembers`  
**Purpose**: Queue member assignments

**Key Fields**:
- `queue` (string) - Queue uniqid
- `extension` (string) - Member extension
- `priority` (integer) - Member priority

**Relations**:
- belongsTo → `Extensions`, `CallQueues`

### ConferenceRooms

**Table**: `m_ConferenceRooms`  
**Purpose**: Conference room configurations

**Key Fields**:
- `uniqid` (string) - Unique identifier
- `extension` (string) - Conference extension
- `name` (string) - Room name
- `pinCode` (string) - Access PIN

**Relations**:
- belongsTo → `Extensions`

### IvrMenu

**Table**: `m_IvrMenu`  
**Purpose**: Interactive Voice Response menus

**Key Fields**:
- `uniqid` (string) - Unique identifier
- `name` (string) - Menu name
- `extension` (string) - IVR extension
- `audio_message_id` (string) - Welcome message
- `timeout_extension` (string) - Timeout destination
- `number_of_repeat` (integer) - Repeat count

**Relations**:
- belongsTo → `Extensions`, `SoundFiles`
- hasMany → `IvrMenuActions`

### IvrMenuActions

**Table**: `m_IvrMenuActions`  
**Purpose**: IVR menu digit actions

**Key Fields**:
- `ivr_menu_id` (string) - Parent IVR ID
- `digits` (string) - Digit(s) pressed
- `extension` (string) - Destination extension
- `priority` (integer) - Action priority

**Relations**:
- belongsTo → `IvrMenu`, `Extensions`

### DialplanApplications

**Table**: `m_DialplanApplications`  
**Purpose**: Custom dialplan applications

**Key Fields**:
- `uniqid` (string) - Unique identifier
- `name` (string) - Application name
- `extension` (string) - Extension number
- `applicationlogic` (string) - Dialplan code
- `type` (string) - Application type
- `hint` (string) - BLF hint

**Relations**:
- belongsTo → `Extensions`

## Security and Network Models

### NetworkFilters

**Table**: `m_NetworkFilters`  
**Purpose**: IP-based access control

**Key Fields**:
- `id` (string) - Unique identifier
- `permit` (string) - Allowed networks (comma-separated)
- `deny` (string) - Denied networks (comma-separated)
- `newer_block_ip` (integer) - "1" to not block IPs
- `local_network` (integer) - "1" for local networks
- `description` (string) - Filter description

**Relations**:
- hasMany → `Sip`, `FirewallRules`, `AsteriskManagerUsers`

### FirewallRules

**Table**: `m_FirewallRules`  
**Purpose**: Firewall rule configurations

**Key Fields**:
- `protocol` (string) - Protocol (TCP/UDP/ICMP)
- `portfrom` (string) - Start port
- `portto` (string) - End port
- `networkfilterid` (string) - Network filter
- `action` (string) - allow/block
- `category` (string) - Rule category

**Categories**:
```php
const CATEGORY_SIP = 'SIP';
const CATEGORY_WEB = 'WEB';
const CATEGORY_SSH = 'SSH';
const CATEGORY_AMI = 'AMI';
const CATEGORY_CTI = 'CTI';
const CATEGORY_ICMP = 'ICMP';
```

**Relations**:
- belongsTo → `NetworkFilters`

### Fail2BanRules

**Table**: `m_Fail2BanRules`  
**Purpose**: Fail2Ban intrusion prevention rules

**Key Fields**:
- `filter` (string) - Filter name
- `maxretry` (integer) - Max retry attempts
- `bantime` (integer) - Ban duration (seconds)
- `findtime` (integer) - Time window (seconds)
- `whitelist` (string) - Whitelisted IPs

### AsteriskManagerUsers

**Table**: `m_AsteriskManagerUsers`  
**Purpose**: AMI (Asterisk Manager Interface) users

**Key Fields**:
- `username` (string) - AMI username
- `secret` (string) - AMI password
- `call` (integer) - Call permission
- `cdr` (integer) - CDR permission
- `originate` (integer) - Originate permission
- `networkfilterid` (string) - Network filter

**Relations**:
- belongsTo → `NetworkFilters`

## Settings and Data Models

### PbxSettings

**Table**: `m_PbxSettings`  
**Purpose**: Key-value store for system settings

**Key Fields**:
- `key` (string, Primary Key) - Setting key
- `value` (string) - Setting value

**Special Features**:
- Uses Redis caching
- Constants defined in `PbxSettingsConstants.php`
- Default values in `PbxSettingsDefaultValuesTrait.php`

**Usage Example**:
```php
// Get setting
$value = PbxSettings::getValueByKey('PBXVersion');

// Set setting
PbxSettings::setValue('PBXVersion', '2023.1.0');
```

### SoundFiles

**Table**: `m_SoundFiles`  
**Purpose**: System sound files

**Key Fields**:
- `name` (string) - Display name
- `path` (string) - File path
- `category` (string) - File category

**Categories**:
```php
const CATEGORY_MOH = 'moh';      // Music on hold
const CATEGORY_CUSTOM = 'custom'; // Custom sounds
```

**Relations**:
- hasMany → `CallQueues`, `OutWorkTimes`, `IvrMenu`

### CustomFiles

**Table**: `m_CustomFiles`  
**Purpose**: User-modified configuration files

**Key Fields**:
- `filepath` (string) - File path
- `content` (string) - File content
- `mode` (string) - Edit mode
- `changed` (integer) - "1" if modified

**Modes**:
```php
const MODE_NONE = 'none';         // No special handling
const MODE_APPEND = 'append';     // Append to original
const MODE_OVERRIDE = 'override'; // Replace original
const MODE_SCRIPT = 'script';     // Execute as script
```

### Codecs

**Table**: `m_Codecs`  
**Purpose**: Audio/video codec configurations

**Key Fields**:
- `name` (string) - Codec name
- `type` (string) - audio/video
- `priority` (integer) - Codec priority
- `disabled` (string) - "1" if disabled

## CDR and Logging Models

### CallDetailRecords

**Table**: `cdr_general`  
**Purpose**: Permanent call history storage

Inherits all fields from `CallDetailRecordsBase`

**Usage Example**:
```php
// Find calls for extension
$calls = CallDetailRecords::find([
    'conditions' => 'src_num = :num: OR dst_num = :num:',
    'bind' => ['num' => '100'],
    'order' => 'start DESC',
    'limit' => 100
]);
```

### CallDetailRecordsTmp

**Table**: `cdr`  
**Purpose**: Temporary storage for active calls

Inherits all fields from `CallDetailRecordsBase`

## System Models

### Storage

**Table**: `m_Storage`  
**Purpose**: Storage device configurations

**Key Fields**:
- `name` (string) - Storage name
- `path` (string) - Mount path
- `device` (string) - Device path
- `filesystemtype` (string) - Filesystem type
- `media` (string) - Media type

### LanInterfaces

**Table**: `m_LanInterfaces`  
**Purpose**: Network interface configurations

**Key Fields**:
- `name` (string) - Interface name
- `interface` (string) - System interface
- `internet` (integer) - "1" if internet gateway
- `dhcp` (integer) - "1" for DHCP
- `ipaddr` (string) - IP address
- `subnet` (string) - Subnet mask
- `gateway` (string) - Default gateway

### PbxExtensionModules

**Table**: `m_PbxExtensionModules`  
**Purpose**: Installed extension modules

**Key Fields**:
- `uniqid` (string) - Module ID
- `name` (string) - Module name
- `version` (string) - Module version
- `developer` (string) - Developer name
- `enabled` (integer) - "1" if enabled
- `commercial` (integer) - "1" if commercial

### OutWorkTimes

**Table**: `m_OutWorkTimes`  
**Purpose**: Non-working hours configurations

**Key Fields**:
- `date_from` (string) - Start date
- `date_to` (string) - End date
- `weekday_from` (integer) - Start weekday (1-7)
- `weekday_to` (integer) - End weekday (1-7)
- `time_from` (string) - Start time (HH:MM)
- `time_to` (string) - End time (HH:MM)
- `extension` (string) - Destination extension
- `audio_message_id` (string) - Announcement sound

**Relations**:
- belongsTo → `Extensions`, `SoundFiles`
- hasMany → `OutWorkTimesRouts`

### AuthTokens

**Table**: `m_AuthTokens`  
**Purpose**: Authentication tokens

**Key Fields**:
- `tokenHash` (string) - Token hash
- `sessionParams` (string) - Session data (JSON)
- `expiryDate` (string) - Expiration timestamp

### LongPollSubscribe

**Table**: `m_LongPollSubscribe`  
**Purpose**: Long polling subscriptions

**Key Fields**:
- `action` (string) - Action name
- `data` (string) - Subscription data
- `channel` (string) - Channel name
- `timeout` (integer) - Timeout in seconds
- `enable` (string) - "1" if enabled

## Usage Patterns

### Creating Records

```php
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;

// Create extension
$extension = new Extensions();
$extension->number = '100';
$extension->type = Extensions::TYPE_SIP;
$extension->callerid = 'John Doe';
$extension->userid = $userId;

if (!$extension->save()) {
    foreach ($extension->getMessages() as $message) {
        echo $message->getMessage() . PHP_EOL;
    }
}

// Create SIP account
$sip = new Sip();
$sip->extension = $extension->number;
$sip->secret = Sip::generateRandomPassword();
$sip->username = $extension->number;
$sip->save();
```

### Finding Records

```php
// Find by primary key
$extension = Extensions::findFirstByNumber('100');

// Find with conditions
$providers = Providers::find([
    'conditions' => 'type = :type:',
    'bind' => ['type' => 'SIP']
]);

// Find with relations
$queue = CallQueues::findFirst([
    'conditions' => 'uniqid = :id:',
    'bind' => ['id' => $queueId]
]);
$members = $queue->CallQueueMembers;
```

### Working with Relations

```php
// Access related records
$user = Users::findFirstById($userId);
foreach ($user->Extensions as $extension) {
    if ($extension->type === Extensions::TYPE_SIP) {
        $sipAccount = $extension->Sip;
        echo "SIP: {$sipAccount->username}" . PHP_EOL;
    }
}

// Create related records
$provider = new Providers();
$provider->uniqid = uniqid();
$provider->type = 'SIP';
$provider->save();

$sip = new Sip();
$sip->uniqid = $provider->sipuid;
$sip->type = 'friend';
$sip->Providers = $provider;
$sip->save();
```

### Transaction Handling

```php
use Phalcon\Mvc\Model\Transaction\Manager;

$transactionManager = new Manager();
$transaction = $transactionManager->get();

try {
    $extension = new Extensions();
    $extension->setTransaction($transaction);
    // ... set fields
    $extension->save();

    $sip = new Sip();
    $sip->setTransaction($transaction);
    // ... set fields
    $sip->save();

    $transaction->commit();
} catch (\Exception $e) {
    $transaction->rollback();
}
```

## Constants and Enumerations

### Extension Types
- `SIP` - SIP phone/softphone
- `EXTERNAL` - External phone number
- `QUEUE` - Call queue
- `CONFERENCE` - Conference room
- `DIALPLAN APPLICATION` - Custom dialplan app
- `IVR MENU` - Interactive voice menu
- `MODULES` - Module-provided extension
- `SYSTEM` - System extension
- `PARKING` - Call parking

### Incoming Route Actions
- `extension` - Route to extension
- `hangup` - Hang up call
- `busy` - Play busy signal
- `did2user` - DID to user mapping
- `voicemail` - Send to voicemail
- `playback` - Play message and hangup

### Call Queue Strategies
- `ringall` - Ring all members
- `leastrecent` - Least recently called
- `fewestcalls` - Fewest completed calls
- `random` - Random member
- `rrmemory` - Round robin with memory
- `linear` - Linear order

### Firewall Categories
- `SIP` - SIP protocol (5060/5061)
- `WEB` - Web interface (80/443)
- `SSH` - SSH access (22)
- `AMI` - Asterisk Manager (5038)
- `CTI` - CTI applications
- `ICMP` - Ping/ICMP

### CDR Dispositions
- `ANSWERED` - Call was answered
- `NO ANSWER` - No answer, timeout
- `BUSY` - Busy signal
- `FAILED` - Call failed

## Best Practices

1. **Always validate before saving**:
   ```php
   if (!$model->save()) {
       $errors = $model->getMessages();
       // Handle errors
   }
   ```

2. **Use transactions for related operations**:
   ```php
   $transaction = DI::getDefault()->get('db')->beginTransaction();
   // Multiple saves
   $transaction->commit();
   ```

3. **Check model existence before relations**:
   ```php
   if ($extension && $extension->type === Extensions::TYPE_SIP) {
       $sip = $extension->Sip;
   }
   ```

4. **Use constants for types and statuses**:
   ```php
   $extension->type = Extensions::TYPE_SIP; // Not 'SIP'
   ```

5. **Handle cascade deletes carefully**:
   ```php
   // Deleting an Extension will cascade to related Sip, Queue, etc.
   $extension->delete();
   ```

## Common Queries

### Get all SIP extensions
```php
$sipExtensions = Extensions::find([
    'conditions' => 'type = :type:',
    'bind' => ['type' => Extensions::TYPE_SIP]
]);
```

### Find active calls
```php
$activeCalls = CallDetailRecordsTmp::find([
    'conditions' => 'endtime IS NULL OR endtime = ""'
]);
```

### Get user's primary extension
```php
$primaryExt = Extensions::findFirst([
    'conditions' => 'userid = :uid: AND is_general_user_number = "1"',
    'bind' => ['uid' => $userId]
]);
```

### Find routes for provider
```php
$routes = OutgoingRoutingTable::find([
    'conditions' => 'providerid = :pid:',
    'bind' => ['pid' => $providerId],
    'order' => 'priority'
]);
```

## Model Events

Models fire events during their lifecycle:

- `beforeValidation` - Before validation
- `afterValidation` - After validation
- `beforeSave` - Before insert/update
- `afterSave` - After insert/update
- `beforeDelete` - Before deletion
- `afterDelete` - After deletion

Example:
```php
class Extensions extends ModelsBase
{
    public function afterSave()
    {
        // Clear cache
        $this->clearCache('Extensions');
        
        // Fire custom event
        $this->di->get('eventsManager')->fire(
            'extensions:afterSave',
            $this
        );
    }
}
```