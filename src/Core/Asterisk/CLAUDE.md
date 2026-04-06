# CLAUDE.md - MikoPBX Asterisk Integration

Dynamic configuration generation, AMI control, AGI scripts, and CDR management for Asterisk PBX.

## File Inventory

```
Asterisk/
├── AsteriskManager.php            # AMI client (65KB) - commands, events, channels, PJSIP
├── AGI.php                        # AGI interface - answer, verbose, database, exec
├── AGIBase.php                    # AGI base - request parsing, response evaluation
├── AstDB.php                      # Asterisk database (astdb) - get/set/del keys
├── CdrDb.php                      # CDR database - path, integrity check, recording paths
│
├── Configs/
│   ├── AsteriskConfigClass.php    # Base class for all generators (hookModulesMethod, saveConfig)
│   ├── AsteriskConfigInterface.php # 25+ hook constants for module extension
│   │
│   │   # Main Config Generators (46 classes)
│   ├── AclConf.php                # ACL rules
│   ├── AriConf.php                # Asterisk REST Interface
│   ├── AsteriskConf.php           # Main asterisk.conf
│   ├── CcssConf.php               # Call Completion Supplementary Service
│   ├── CdrConf.php                # CDR configuration
│   ├── CdrManagerConf.php         # CDR manager backend
│   ├── CdrSqlite3CustomConf.php   # CDR SQLite3 custom fields
│   ├── CelBeanstalkdConf.php      # CEL Beanstalkd backend
│   ├── CelConf.php                # Channel Event Logging
│   ├── CelSqlite3CustomConf.php   # CEL SQLite3 custom fields
│   ├── ChanDahdiConf.php          # DAHDI channels
│   ├── ChanDongle.php             # 3G/4G modem channels
│   ├── CodecsConf.php             # Codec configuration
│   ├── ConferenceConf.php         # Conference/meetme
│   ├── DialplanApplicationConf.php # Custom dialplan apps
│   ├── ExtensionsAnnounceRecording.php # Recording announcement paths
│   ├── ExtensionsConf.php         # Main dialplan (extensions.conf)
│   ├── ExtensionsInterception.php # Call interception/monitoring
│   ├── ExtensionsOutWorkTimeConf.php # After-hours extensions
│   ├── ExternalPhonesConf.php     # External endpoints
│   ├── FeaturesConf.php           # Call features (transfer, parking)
│   ├── H323Conf.php               # H.323 protocol
│   ├── HepConf.php                # Homer Encapsulation Protocol
│   ├── HttpConf.php               # HTTP server
│   ├── IAXConf.php                # IAX protocol
│   ├── IAXProvConf.php            # IAX providers
│   ├── IndicationConf.php         # Indication tones
│   ├── IVRConf.php                # IVR menus
│   ├── LoggerConf.php             # Asterisk logger/syslog
│   ├── ManagerConf.php            # AMI configuration
│   ├── ModulesConf.php            # Module loading
│   ├── MusicOnHoldConf.php        # Music on hold
│   ├── PjprojectConf.php          # PJPROJECT library
│   ├── PjSipNotifyConf.php        # PJSIP NOTIFY messages
│   ├── QueueConf.php              # Call queues
│   ├── QueueRulesConf.php         # Queue routing rules
│   ├── ResParkingConf.php         # Call parking
│   ├── RtpConf.php                # RTP configuration
│   ├── SayConf.php                # Text-to-speech
│   ├── SIPConf.php                # PJSIP configuration (generates pjsip.conf)
│   ├── SorceryConf.php            # Sorcery object mapping
│   ├── UdptlConf.php              # UDPTL (T.38 FAX)
│   └── VoiceMailConf.php          # Voicemail
│
│   ├── Generators/
│   │   ├── CodecSync.php          # Sync codec DB with Asterisk available codecs
│   │   └── Extensions/
│   │       ├── CallerIdDidProcessor.php  # CallerID/DID extraction from SIP headers
│   │       ├── IncomingContexts.php      # Inbound call routing contexts
│   │       ├── InternalContexts.php      # Internal extension contexts
│   │       └── OutgoingContext.php        # Outbound call routing contexts
│   │
│   ├── lua/
│   │   ├── extensions.lua         # Lua dialplan implementation
│   │   └── JSON.lua               # JSON parser utility
│   │
│   └── Samples/
│       └── indications.conf.sample # Sample indication tones
│
└── agi-bin/
    ├── cdr_connector.php          # CDR event processing
    ├── check_redirect.php         # Call forwarding verification
    ├── get_park_info.php          # Parking information
    └── phpagi.php                 # AGI base framework
```

## AsteriskConfigInterface — Hook Constants (25+)

```php
// Extension generation
EXTENSION_GEN_HINTS = 'extensionGenHints'
EXTENSION_GEN_INTERNAL = 'extensionGenInternal'
EXTENSION_GEN_INTERNAL_USERS_PRE_DIAL = 'extensionGenInternalUsersPreDial'
EXTENSION_GEN_ALL_PEERS_CONTEXT = 'extensionGenAllPeersContext'
EXTENSION_GEN_INTERNAL_TRANSFER = 'extensionGenInternalTransfer'
EXTENSION_GEN_CREATE_CHANNEL_DIALPLAN = 'extensionGenCreateChannelDialplan'
EXTENSION_GEN_CONTEXTS = 'extensionGenContexts'
EXTENSION_GLOBALS = 'extensionGlobals'

// Include hooks
GET_INCLUDE_INTERNAL = 'getIncludeInternal'
GET_INCLUDE_INTERNAL_TRANSFER = 'getIncludeInternalTransfer'

// Context generation
GENERATE_PUBLIC_CONTEXT = 'generatePublicContext'
GENERATE_INCOMING_ROUT_BEFORE_DIAL_PRE_SYSTEM = 'generateIncomingRoutBeforeDialPreSystem'
GENERATE_INCOMING_ROUT_BEFORE_DIAL = 'generateIncomingRoutBeforeDial'
GENERATE_INCOMING_ROUT_BEFORE_DIAL_SYSTEM = 'generateIncomingRoutBeforeDialSystem'
GENERATE_INCOMING_ROUT_AFTER_DIAL_CONTEXT = 'generateIncomingRoutAfterDialContext'

// Outgoing routes
GENERATE_OUT_ROUT_CONTEXT = 'generateOutRoutContext'
GENERATE_OUT_ROUT_AFTER_DIAL_CONTEXT = 'generateOutRoutAfterDialContext'

// PJSIP
GENERATE_PEERS_PJ = 'generatePeersPj'
GENERATE_PEER_PJ_ADDITIONAL_OPTIONS = 'generatePeerPjAdditionalOptions'
OVERRIDE_PJSIP_OPTIONS = 'overridePJSIPOptions'
OVERRIDE_PROVIDER_PJSIP_OPTIONS = 'overrideProviderPJSIPOptions'

// Configuration
GENERATE_MODULES_CONF = 'generateModulesConf'
GENERATE_MANAGER_CONF = 'generateManagerConf'
GENERATE_ARI_CONF = 'generateAriConf'
GET_FEATURE_MAP = 'getFeatureMap'
GET_DEPENDENCE_MODELS = 'getDependenceModels'
GET_SETTINGS = 'getSettings'
GENERATE_CONFIG = 'generateConfig'
```

## AsteriskConfigClass (Base)

```php
class AsteriskConfigClass extends Injectable implements AsteriskConfigInterface
{
    protected int $priority = 1000;
    protected string $description;     // Config filename

    public function generateConfig(): void     // Main entry point
    protected function generateConfigProtected(): void  // Override in subclasses
    protected function saveConfig(string $config, string $filename): void
    public function hookModulesMethod(string $methodName, array $arguments = []): string
    public function getMethodPriority(string $methodName = ''): int
}
```

## SIPConf — Generates pjsip.conf

Generates modern PJSIP configuration (not legacy chan_sip):
- Transport sections: UDP, TCP, TLS
- Endpoint definitions for peers and providers
- Dual-stack IPv6 support with bracket notation `[2001:db8::1]:5060`
- Codec configuration per peer/provider
- NAT traversal (OPTIONS keepalive)

```php
const int QUALIFY_FREQUENCY = 60;
const int MAX_CONTACTS_PEER = 5;
const int MAX_CONTACTS_PROVIDER = 1;
const int RTP_TIMEOUT = 120;
const int RTP_TIMEOUT_HOLD = 600;

private function isDualStackInterface(array $if_data): bool
public function needAsteriskRestart(): bool  // Topology hash comparison
```

## CallerIdDidProcessor

Generates dialplan context for CallerID/DID extraction from SIP headers.

Supported sources: `Sip::CALLERID_SOURCE_FROM`, `_RPID` (Remote-Party-ID), `_PAI` (P-Asserted-Identity), `_CUSTOM`, `_DEFAULT`. Debug mode via `cid_did_debug` setting.

## CodecSync

Syncs codec database with Asterisk available codecs. Default priorities: alaw(1), ulaw(2), opus(3), g722(4), g729(5). Video: h264(1), h263(2), vp8(4), vp9(5).

## AsteriskManager — AMI Client

### Connection
```php
connect(?string $server, ?string $username, ?string $secret, string $events): bool
disconnect(): void
loggedIn(): bool
```

### Commands
```php
Command(string $command): array
sendRequest(string $action, array $parameters): array
sendRequestTimeout(string $action, array $parameters): array
```

### PJSIP
```php
getPjSipPeers(): array    // Returns [['id'=>'201','state'=>'OK','detailed-state'=>'Not in use']]
getPjSipRegistry(): array // Outbound registration status
```

### Channels & Calls
```php
GetChannels(bool $group): array           // Channels grouped by Linkedid
Originate(...): array                      // Initiate outbound call
Hangup(string $channel): array
Redirect(string $channel, ...): array
ExtensionState(string $exten, string $context): array
```

### Queues
```php
QueueAdd(string $queue, string $interface, int $penalty): array
QueueRemove(string $queue, string $interface): array
QueueStatus(): array
```

Common AGI scripts:
- **meetme_dial.php** - Conference room CDR event (uses AMI)
- **unpark_call.php** - Unpark call CDR event (uses AMI)
- **check_redirect.php** - Call forwarding
- **get_park_info.php** - Parking information

### Recording
```php
MixMonitor(string $channel, string $file, string $options): array
StopMixMonitor(string $channel): array
Monitor(string $channel, ?string $file): array
```

### Events
```php
add_event_handler(string $event, callable $handler): void
waitResponse(bool $allow_timeout): array
Events(string $eventMask): array
```

## CdrDb

```php
static getPathToDB(): string                        // CDR database path
static checkDb(): void                              // Fix "broken" CDR records
static MeetMeSetRecFilename(string $file_name): string // Recording file path
```

## Development Patterns

### Creating a Config Generator
```php
class MyConf extends AsteriskConfigClass
{
    protected string $description = 'myfeature.conf';
    protected int $priority = 500;

    protected function generateConfigProtected(): void
    {
        $conf = "[section]\noption=value\n";
        $conf .= $this->hookModulesMethod('generateMyFeatureConf');
        $this->saveConfig($conf, $this->description);
    }
}
```

### Adding Dialplan Extensions (Module Hook)
```php
public function extensionGenInternal(): string
{
    return "exten => *99,1,NoOp(My Feature)\n" .
           "\tsame => n,Answer()\n" .
           "\tsame => n,Hangup()\n\n";
}
```

### Overriding PJSIP Options (Module Hook)
```php
public function overridePJSIPOptions(string $extension, array $options): array
{
    $options['endpoint']['allow'] = 'opus,g722,alaw,ulaw';
    return $options;
}
```

## Debugging

```bash
asterisk -rvvv
CLI> dialplan show internal
CLI> pjsip show endpoints
CLI> dialplan show 200@internal
```
