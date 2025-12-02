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

## Network Models

### LanInterfaces
**Table**: `m_LanInterfaces` - Network interface configuration with dual-stack IPv4/IPv6 support

```php
// Topology constants
const TOPOLOGY_PUBLIC = 'public';
const TOPOLOGY_PRIVATE = 'private';

// IPv4 fields
interface          // System interface name (eth0, eth1, etc.)
vlanid            // VLAN ID (0 = no VLAN)
ipaddr            // IPv4 address
subnet            // IPv4 subnet mask
gateway           // IPv4 gateway
dhcp              // "1" = DHCP enabled, "0" = static
internet          // "1" = internet connection present

// IPv6 fields (NEW in IPv6 support)
ipv6_mode         // "0" = Off, "1" = Auto (SLAAC/DHCPv6), "2" = Manual (static)
ipv6addr          // IPv6 address (e.g., "2001:db8::1")
ipv6_subnet       // IPv6 prefix length (1-128, typically 64)
ipv6_gateway      // IPv6 gateway address
primarydns6       // Primary IPv6 DNS server
secondarydns6     // Secondary IPv6 DNS server

// DNS (dual-stack)
primarydns        // Primary IPv4 DNS server
secondarydns      // Secondary IPv4 DNS server

// Topology
topology          // 'public' or 'private'
extipaddr         // External IP address
exthostname       // External hostname

// Usage - IPv4 configuration
$lan = LanInterfaces::findFirst();
$lan->ipaddr = '192.168.1.1';
$lan->subnet = '255.255.255.0';
$lan->gateway = '192.168.1.254';
$lan->dhcp = '0'; // Static IP

// Usage - IPv6 configuration (Manual)
$lan->ipv6_mode = '2'; // Manual/Static
$lan->ipv6addr = '2001:db8::1';
$lan->ipv6_subnet = '64';
$lan->ipv6_gateway = '2001:db8::254';
$lan->save();

// Usage - IPv6 configuration (Auto)
$lan->ipv6_mode = '1'; // SLAAC/DHCPv6
$lan->save(); // Address auto-configured by network

// Validation uses IpAddressHelper for dual-stack validation
```

### NetworkStaticRoutes
**Table**: `m_NetworkStaticRoutes` - Static routing table with IPv4 and IPv6 support

```php
// Fields
network           // Network address (IPv4 or IPv6)
subnet            // Subnet mask for IPv4 (e.g., "24") or prefix for IPv6 (1-128)
gateway           // Gateway address (must match network IP version)

// IPv4 example
$route = new NetworkStaticRoutes();
$route->network = '10.0.0.0';
$route->subnet = '24';
$route->gateway = '192.168.1.1';

// IPv6 example (NEW in IPv6 support)
$route = new NetworkStaticRoutes();
$route->network = '2001:db8:1::/64';
$route->subnet = '64';
$route->gateway = '2001:db8::1';
```

## Settings & Data

### PbxSettings
**Table**: `m_PbxSettings` - Key-value store with Redis caching

```php
$value = PbxSettings::getValueByKey('PBXVersion');
PbxSettings::setValueByKey('PBXVersion', '2024.1.0');
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

### Working with IP Addresses (IPv4 and IPv6)
```php
use MikoPBX\Core\Utilities\IpAddressHelper;

// Detect IP version
$version = IpAddressHelper::getIpVersion('192.168.1.1');        // 4
$version = IpAddressHelper::getIpVersion('2001:db8::1');        // 6
$version = IpAddressHelper::getIpVersion('invalid');            // false

// Check IP type
if (IpAddressHelper::isIpv6($address)) {
    // Handle IPv6
}

// Parse CIDR notation
$cidr = IpAddressHelper::normalizeCidr('2001:db8::/64');
// Returns: ['ip' => '2001:db8::', 'prefix' => 64, 'version' => 6]

// Check if IP is in network
$inNetwork = IpAddressHelper::isIpInCidr('2001:db8::100', '2001:db8::/64'); // true

// Validate before saving
$lan = new LanInterfaces();
if (IpAddressHelper::isIpv6($ipAddress)) {
    $lan->ipv6addr = $ipAddress;
    $lan->ipv6_subnet = '64';
    $lan->ipv6_mode = '2'; // Manual
} else {
    $lan->ipaddr = $ipAddress;
    $lan->subnet = '255.255.255.0';
}
$lan->save();
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