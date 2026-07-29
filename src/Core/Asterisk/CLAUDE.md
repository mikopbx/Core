# CLAUDE.md — MikoPBX Asterisk Integration

Dynamic configuration generation, AMI control, AGI scripts, and CDR management for Asterisk.
(Project-wide context lives in the root CLAUDE.md; this file covers `src/Core/Asterisk/` only.)

## Directory Map

```
Asterisk/
├── AsteriskManager.php   # AMI client — commands, events, channels, PJSIP, queues
├── AGI.php / AGIBase.php # AGI interface + base (request parsing, response eval)
├── AstDB.php             # Asterisk database (astdb) — get/set/del keys
├── CdrDb.php             # CDR database — path, integrity check, recording paths
├── Configs/              # Config generators (one *.Conf.php per Asterisk .conf)
│   ├── AsteriskConfigClass.php      # Base class for all generators
│   ├── AsteriskConfigInterface.php  # Module hook constants (see below)
│   ├── Generators/
│   │   ├── CodecSync.php            # Sync codec DB with Asterisk's available codecs
│   │   └── Extensions/             # CallerIdDidProcessor + Incoming/Internal/Outgoing contexts
│   ├── lua/              # extensions.lua dialplan + JSON.lua
│   └── Samples/          # indications.conf.sample
└── agi-bin/              # meetme_dial.php, unpark_call.php, check_redirect.php,
                          # get_park_info.php, phpagi.php
```

Each generator under `Configs/` is named after the file it produces (`SIPConf.php` →
pjsip.conf, `ExtensionsConf.php` → extensions.conf, `QueueConf.php` → queues.conf,
`ManagerConf.php` → manager.conf, …). To find a config's generator, match the filename.
Modules extend output via the hook constants below.

## AsteriskConfigClass (base for all generators)

```php
class AsteriskConfigClass extends Injectable implements AsteriskConfigInterface
{
    protected int $priority = 1000;
    protected string $description;     // target config filename

    public function generateConfig(): void               // main entry point
    protected function generateConfigProtected(): void   // override in subclasses
    protected function saveConfig(string $config, string $filename): void
    public function hookModulesMethod(string $methodName, array $arguments = []): string
    public function getMethodPriority(string $methodName = ''): int
}
```

Flow: `generateConfig()` → `generateConfigProtected()` (subclass body) → `saveConfig()`.
`hookModulesMethod()` collects contributions from every module implementing the matching
hook method, ordered by `getMethodPriority()`.

## Module Hook Constants (AsteriskConfigInterface)

Each constant names the method a module implements to inject content into a config section.

```php
// Extension / dialplan generation
EXTENSION_GEN_HINTS, EXTENSION_GEN_INTERNAL, EXTENSION_GEN_INTERNAL_USERS_PRE_DIAL,
EXTENSION_GEN_ALL_PEERS_CONTEXT, EXTENSION_GEN_INTERNAL_TRANSFER,
EXTENSIONS_GEN_CREATE_CHANNEL_DIALPLAN, EXTENSION_GEN_CONTEXTS, EXTENSION_GLOBALS

// Include hooks
GET_INCLUDE_INTERNAL, GET_INCLUDE_INTERNAL_TRANSFER

// Context generation
GENERATE_PUBLIC_CONTEXT,
GENERATE_INCOMING_ROUT_BEFORE_DIAL_PRE_SYSTEM, GENERATE_INCOMING_ROUT_BEFORE_DIAL,
GENERATE_INCOMING_ROUT_BEFORE_DIAL_SYSTEM, GENERATE_INCOMING_ROUT_AFTER_DIAL_CONTEXT

// Outgoing routes
GENERATE_OUT_ROUT_CONTEXT, GENERATE_OUT_ROUT_AFTER_DIAL_CONTEXT

// PJSIP
GENERATE_PEERS_PJ, GENERATE_PEER_PJ_ADDITIONAL_OPTIONS,
OVERRIDE_PJSIP_OPTIONS, OVERRIDE_PROVIDER_PJSIP_OPTIONS

// Other config
GENERATE_MODULES_CONF, GENERATE_MANAGER_CONF, GENERATE_ARI_CONF,
GET_FEATURE_MAP, GET_DEPENDENCE_MODELS, GET_SETTINGS, GENERATE_CONFIG
```

## SIPConf — generates pjsip.conf

Modern PJSIP (not legacy chan_sip): UDP/TCP/TLS transports, endpoint definitions for
peers and providers, per-peer codec config, NAT traversal via OPTIONS keepalive.
Dual-stack IPv6 with bracket notation `[2001:db8::1]:5060`.

```php
private const int QUALIFY_FREQUENCY = 60;
private const int MAX_CONTACTS_PEER = 5;
private const int MAX_CONTACTS_PROVIDER = 1;
private const int RTP_TIMEOUT = 120;        // peer;     PROVIDER_RTP_TIMEOUT = 60
private const int RTP_TIMEOUT_HOLD = 600;   // peer;     PROVIDER_RTP_TIMEOUT_HOLD = 300

private function isDualStackInterface(array $if_data): bool
public function needAsteriskRestart(): bool   // topology hash comparison
```

## CallerIdDidProcessor

Generates dialplan for CallerID/DID extraction from SIP headers. Sources:
`Sip::CALLERID_SOURCE_FROM`, `Sip::CALLERID_SOURCE_RPID` (Remote-Party-ID),
`Sip::CALLERID_SOURCE_PAI` (P-Asserted-Identity), `Sip::CALLERID_SOURCE_CUSTOM`,
`Sip::CALLERID_SOURCE_DEFAULT`. Debug via `cid_did_debug` setting.

## CodecSync

Syncs the codec DB with Asterisk's available codecs. Default audio priorities:
opus(1), g722(2), alaw(3), ulaw(4), g729(5). Video: h265(1), h264(2), vp9(3),
vp8(4). New codecs are added enabled; IGNORED_CODECS/unsupported are deleted;
existing enable/disable flags are preserved; gsm is force-enabled.

## AsteriskManager — AMI client

```php
// Connection
connect(?string $server, ?string $username, ?string $secret, string $events): bool
disconnect(): void
loggedIn(): bool
// Commands
Command(string $command): array
sendRequest(string $action, array $parameters): array
sendRequestTimeout(string $action, array $parameters): array
// PJSIP
getPjSipPeers(): array     // [['id'=>'201','state'=>'OK','detailed-state'=>'Not in use']]
getPjSipRegistry(): array  // outbound registration status
// Channels & calls
GetChannels(bool $group): array   // grouped by Linkedid
Originate(...): array
Hangup(string $channel): array
Redirect(string $channel, ...): array
ExtensionState(string $exten, string $context): array
// Queues
QueueAdd(string $queue, string $interface, int $penalty): array
QueueRemove(string $queue, string $interface): array
QueueStatus(): array
// Recording
MixMonitor(string $channel, string $file, string $options): array
StopMixMonitor(string $channel): array
Monitor(string $channel, ?string $file, ?string $format, ?bool $mix): array
ChangeMonitor(string $channel, string $file): array
StopMonitor(string $channel): array
// Events
add_event_handler(string $event, callable $handler): void
waitResponse(bool $allow_timeout): array
Events(string $eventMask): array
```

agi-bin scripts: `meetme_dial.php` (conference CDR event, AMI), `unpark_call.php`
(unpark CDR event, AMI), `check_redirect.php` (call forwarding), `get_park_info.php`
(parking info); `phpagi.php` is the AGI framework.

## CdrDb

```php
static getPathToDB(): string                            // CDR database path
static checkDb(): void                                  // fix "broken" CDR records
static MeetMeSetRecFilename(string $file_name): string  // recording file path
```

## Development Patterns

Create a config generator:
```php
class MyConf extends AsteriskConfigClass
{
    protected string $description = 'myfeature.conf';
    protected int $priority = 500;

    protected function generateConfigProtected(): void
    {
        $conf  = "[section]\noption=value\n";
        $conf .= $this->hookModulesMethod('generateMyFeatureConf');
        $this->saveConfig($conf, $this->description);
    }
}
```

Add dialplan extensions from a module:
```php
public function extensionGenInternal(): string
{
    return "exten => *99,1,NoOp(My Feature)\n\tsame => n,Answer()\n\tsame => n,Hangup()\n\n";
}
```

Override PJSIP options from a module:
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
CLI> dialplan show 200@internal
CLI> pjsip show endpoints
```

Skills: use **`asterisk-validator`** to validate config files and analyze logs after a
generator runs, and **`asterisk-tester`** to test dialplan/call-flow scenarios via Local
channels.
