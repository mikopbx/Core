# CLAUDE.md - MikoPBX Asterisk Integration

This file provides guidance to Claude Code (claude.ai/code) for Asterisk integration development in MikoPBX.

## Asterisk Integration Architecture

MikoPBX integrates deeply with Asterisk to provide PBX functionality. The integration includes:
- **Dynamic Configuration Generation** - Database-driven config files
- **AMI Integration** - Real-time control and monitoring
- **AGI Scripts** - Call flow processing
- **CDR Management** - Call detail recording
- **Module Hook System** - Extensible configuration

## Directory Structure

```
src/Core/Asterisk/
├── Configs/                    # Configuration generators
│   ├── Generators/            # Specialized dialplan generators
│   │   └── Extensions/        # Extension context generators
│   ├── lua/                   # Lua scripts for dialplan
│   ├── Samples/              # Sample configuration files
│   ├── AsteriskConfigClass.php     # Base class for all configs
│   ├── AsteriskConfigInterface.php # Interface with hook constants
│   └── [Various]Conf.php     # Individual config generators
├── agi-bin/                   # AGI scripts for call processing
├── AGI.php                   # AGI interface implementation
├── AGIBase.php              # Base AGI functionality
├── AstDB.php                # Asterisk database interface
├── AsteriskManager.php      # AMI client implementation
└── CdrDb.php               # CDR database management
```

## Core Components

### 1. Configuration Generator System

All configuration generators extend `AsteriskConfigClass`:

```php
class MyConf extends AsteriskConfigClass
{
    protected string $description = 'my.conf';
    protected int $priority = 1000;
    
    protected function generateConfigProtected(): void
    {
        $conf = "[section]\n";
        $conf .= "option=value\n";
        
        // Hook for modules to add content
        $conf .= $this->hookModulesMethod('myMethodName');
        
        $this->saveConfig($conf, $this->description);
    }
}
```

#### Key Configuration Files:

- **ExtensionsConf.php** - Main dialplan (extensions.conf)
- **SIPConf.php** - Legacy SIP configuration
- **PjSipConf.php** - Modern PJSIP configuration
- **QueueConf.php** - Call queue configuration
- **ManagerConf.php** - AMI configuration
- **FeaturesConf.php** - Call features (transfer, parking)

### 2. Hook System

The interface `AsteriskConfigInterface` defines hook points:

```php
// Context generation hooks
const EXTENSION_GEN_INTERNAL = 'extensionGenInternal';
const EXTENSION_GEN_HINTS = 'extensionGenHints';
const GET_INCLUDE_INTERNAL = 'getIncludeInternal';

// Route processing hooks
const GENERATE_INCOMING_ROUT_BEFORE_DIAL = 'generateIncomingRoutBeforeDial';
const GENERATE_OUT_ROUT_CONTEXT = 'generateOutRoutContext';

// Configuration hooks
const GENERATE_PEERS_PJ = 'generatePeersPj';
const OVERRIDE_PJSIP_OPTIONS = 'overridePJSIPOptions';
```

Modules can implement these methods with priorities:

```php
public function getMethodPriority(string $methodName): int
{
    return match ($methodName) {
        AsteriskConfigInterface::EXTENSION_GEN_INTERNAL => 100,
        default => 1000,
    };
}
```

### 3. Dialplan Generation

#### Context Structure:

```php
// Internal calls context
[internal]
include => internal-users
include => internal-hints
include => modules-internal

// User extensions
[internal-users]
exten => _XXX,1,NoOp(Calling ${EXTEN})
same => n,Gosub(dial-user,${EXTEN},1)

// Incoming calls
[public-direct-dial]
include => incoming-routes
```

#### Specialized Generators:

- **InternalContexts.php** - Internal call routing
- **IncomingContexts.php** - Inbound call handling  
- **OutgoingContext.php** - Outbound call routing

### 4. AMI Integration

```php
use MikoPBX\Core\Asterisk\AsteriskManager;

$am = new AsteriskManager();
$am->connect();

// Execute command
$result = $am->Command('sip show peers');

// Originate call
$am->Originate([
    'Channel' => 'PJSIP/201',
    'Context' => 'internal',
    'Exten' => '202',
    'Priority' => 1,
]);

// Listen for events
$am->add_event_handler('Dial', function($event) {
    // Handle dial event
});
```

### 5. AGI Scripts

AGI scripts handle real-time call processing:

```php
class MyAGI extends AGI
{
    public function main(): void
    {
        // Answer the call
        $this->answer();
        
        // Get channel variables
        $exten = $this->get_variable('EXTEN');
        
        // Play sound file
        $this->stream_file('hello-world');
        
        // Set CDR field
        $this->exec('Set', 'CDR(userfield)=processed');
    }
}
```

Common AGI scripts:
- **cdr_connector.php** - CDR processing
- **check_redirect.php** - Call forwarding
- **get_park_info.php** - Parking information

### 6. CDR Management

```php
use MikoPBX\Core\Asterisk\CdrDb;

$cdr = new CdrDb();

// Get recent calls
$calls = $cdr->getCalls([
    'start' => time() - 3600,
    'end' => time(),
]);

// Update CDR record
$cdr->updateCdr($uniqueid, [
    'userfield' => 'updated',
    'accountcode' => '12345'
]);
```

## Development Patterns

### 1. Creating a Configuration Generator

```php
namespace MikoPBX\Core\Asterisk\Configs;

class MyFeatureConf extends AsteriskConfigClass
{
    protected string $description = 'myfeature.conf';
    protected int $priority = 500;
    
    protected function generateConfigProtected(): void
    {
        $conf = $this->generateHeader();
        $conf .= $this->generateSections();
        $conf .= $this->hookModulesMethod('generateMyFeatureConf');
        
        $this->saveConfig($conf, $this->description);
    }
    
    private function generateHeader(): string
    {
        return ";==================\n" .
               "; MyFeature Config\n" .
               ";==================\n\n";
    }
}
```

### 2. Adding Dialplan Extensions

```php
public function extensionGenInternal(): string
{
    return "exten => *99,1,NoOp(My Feature)\n" .
           "\tsame => n,Answer()\n" .
           "\tsame => n,Playback(feature-activated)\n" .
           "\tsame => n,Hangup()\n\n";
}
```

### 3. Hooking into Incoming Routes

```php
public function generateIncomingRoutBeforeDial(string $rout_number): string
{
    return "\tsame => n,ExecIf(\$[\"\${FROM_DID}\" == \"$rout_number\"]?" .
           "Set(FEATURE_ENABLED=1))\n";
}
```

### 4. Overriding PJSIP Options

```php
public function overridePJSIPOptions(string $extension, array $options): array
{
    // Add custom headers
    $options['endpoint']['set_var'] = 'PJSIP_HEADER(add,X-Custom)=Value';
    
    // Modify codecs
    $options['endpoint']['allow'] = 'opus,g722,alaw,ulaw';
    
    return $options;
}
```

### 5. Working with Asterisk Database

```php
use MikoPBX\Core\Asterisk\AstDB;

// Set value
AstDB::setKey('family', 'key', 'value');

// Get value
$value = AstDB::getKey('family', 'key');

// Delete key
AstDB::delKey('family', 'key');

// Get all keys in family
$keys = AstDB::getKeys('family');
```

## Module Integration

Modules can extend Asterisk functionality by:

### 1. Implementing Config Hooks

```php
class MyModule extends PbxExtensionBase implements AsteriskConfigInterface
{
    public function extensionGenInternal(): string
    {
        return "exten => 777,1,NoOp(Module Feature)\n" .
               "\tsame => n,Goto(my-module-context,s,1)\n\n";
    }
    
    public function extensionGenContexts(): string
    {
        return "[my-module-context]\n" .
               "exten => s,1,Answer()\n" .
               "\tsame => n,Playback(my-module-sound)\n" .
               "\tsame => n,Hangup()\n\n";
    }
}
```

### 2. Adding Manager Users

```php
public function generateManagerConf(): string
{
    return "[mymodule]\n" .
           "secret = " . md5(time()) . "\n" .
           "deny=0.0.0.0/0.0.0.0\n" .
           "permit=127.0.0.1/255.255.255.0\n" .
           "read = system,call,agent\n" .
           "write = system,call,agent\n\n";
}
```

### 3. Custom AGI Scripts

Place AGI scripts in module directory:
```
Modules/MyModule/agi-bin/my-script.php
```

Reference in dialplan:
```php
"same => n,AGI(/usr/www/mikopbx/MyModule/agi-bin/my-script.php)\n"
```

## Best Practices

### 1. Configuration Generation

- Use stage-based generation (pre/generate/post)
- Always use `hookModulesMethod()` for extensibility
- Save configs with `saveConfig()` method
- Add descriptive comments in generated files

### 2. Dialplan Development

- Use meaningful context names
- Follow naming conventions (_XXX for patterns)
- Always include error handling (i, t, h extensions)
- Use Gosub instead of Goto for reusable logic

### 3. Performance

- Cache database queries in config generation
- Use Asterisk database for runtime data
- Minimize AGI script execution time
- Use async AMI for non-blocking operations

### 4. Security

- Validate all user input in dialplan
- Use secure contexts for external calls
- Implement proper authentication
- Log security events

### 5. Error Handling

```php
try {
    $result = $this->generateComplexConfig();
} catch (\Throwable $e) {
    $this->messages[] = ['type' => 'error', 'message' => $e->getMessage()];
    SystemMessages::sysLogMsg(__CLASS__, $e->getMessage());
}
```

## Common Tasks

### 1. Add New Extension Feature

```php
// In your config class
public function extensionGenInternal(): string
{
    $users = Extensions::find(['conditions' => 'type = :type:', 
                              'bind' => ['type' => 'SIP']]);
    
    $conf = '';
    foreach ($users as $user) {
        $conf .= "exten => *98{$user->number},1,VoiceMailMain({$user->number}@default)\n";
    }
    
    return $conf;
}
```

### 2. Process CDR in Real-time

```php
// AGI script
$linkedid = $this->get_variable('CDR(linkedid)');
$duration = $this->get_variable('CDR(billsec)');

// Update external system
$api->updateCallDuration($linkedid, $duration);
```

### 3. Dynamic Route Selection

```php
public function generateOutRoutContext(array $rout): string
{
    return "\tsame => n,ExecIf(\$[\"\${DB(ROUTE/{$rout['id']}/active)}\" != \"1\"]?" .
           "Hangup(21))\n";
}
```

## Debugging

### 1. Enable Verbose Logging

```php
$this->verbose("Debug: Processing extension $extension", 3);
```

### 2. Asterisk Console

```bash
asterisk -rvvv
CLI> dialplan show internal
CLI> pjsip show endpoints
```

### 3. Test Dialplan

```bash
asterisk -rx "dialplan show 200@internal"
asterisk -rx "channel originate Local/200@internal application Echo"
```

### 4. AGI Debugging

```php
// In AGI script
$this->verbose("Variable: " . print_r($this->request, true));
$this->exec('NoOp', 'Debug checkpoint reached');
```

## Resources

- [Asterisk Wiki](https://wiki.asterisk.org/)
- [AMI Documentation](https://wiki.asterisk.org/wiki/display/AST/AMI)
- [AGI Documentation](https://wiki.asterisk.org/wiki/display/AST/AGI)
- [Dialplan Documentation](https://wiki.asterisk.org/wiki/display/AST/Dialplan)