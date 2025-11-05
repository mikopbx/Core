# CLAUDE.md - MikoPBX Module Development

This file provides guidance to Claude Code (claude.ai/code) for module development in MikoPBX.

## Module Development Overview

MikoPBX uses a modular architecture that allows developers to extend the system's functionality without modifying the core code. Modules can hook into various system processes, modify Asterisk configurations, add web interface elements, and more.

## Getting Started

1. Start with the module template repository: https://github.com/mikopbx/ModuleTemplate
2. Create two main classes:
   - **Module Class** (extends `PbxExtensionBase`): Handles configuration and system hooks
   - **Setup Class** (extends `PbxExtensionSetupBase`): Manages installation/uninstallation
3. Follow the naming convention: `ModuleNameConf` for the configuration class
4. Modules are installed to `/storage/usbdisk1/mikopbx/custom_modules/` directory on deployed systems

## Module Class Implementation

The module class is the primary configuration and interaction point between your module and the PBX core system. The class name should follow the pattern `ModuleNameConf` and extend `ConfigClass` from the core.

### Real-World Examples

Based on actual MikoPBX modules, here are the most commonly used integration patterns:

#### 1. Authentication Integration (from ModuleUsersUI)

```php
public function authenticateUser(string $login, string $password): array
{
    // Check LDAP authentication if enabled
    if ($this->ldapEnabled) {
        $ldapAuth = new UsersUILdapAuth();
        return $ldapAuth->authenticate($login, $password);
    }
    
    // Check local database
    $user = UsersCredentials::findFirst([
        'conditions' => 'login = :login:',
        'bind' => ['login' => $login]
    ]);
    
    if ($user && password_verify($password, $user->password_hash)) {
        return [
            'result' => true,
            'userId' => $user->user_id,
            'role' => $user->role
        ];
    }
    
    return ['result' => false];
}
```

#### 2. ACL System Integration (from ModuleUsersUI)

```php
public function onAfterACLPrepared(): void
{
    $acl = $this->di->get('acl');
    
    // Create custom roles
    $acl->addRole(new Role('ModuleUsersUI_Administrator'));
    $acl->addRole(new Role('ModuleUsersUI_Operator'));
    
    // Define resources and permissions
    $acl->addResource(new Resource('extensions'), ['modify', 'delete']);
    
    // Allow access based on role
    $acl->allow('ModuleUsersUI_Administrator', 'extensions', '*');
    $acl->allow('ModuleUsersUI_Operator', 'extensions', 'read');
}
```

### Key Interfaces to Implement

- `ConfigInterface` - For system configuration hooks
- `AsteriskConfInterface` - For Asterisk config generation
- `CoreAPIInterface` - For REST API endpoints
- `SystemManagementInterface` - For system service management

### Configuration Generation Methods

#### Basic Method Signatures

```php
// Generate module-specific config files
public function generateConfig(): void

// Add parameters to Asterisk [globals] section
public function extensionGlobals(): string

// Create custom dialplan contexts
public function extensionGenContexts(): string

// Add PJSIP peer configurations
public function generatePeersPj(): string

// Customize PJSIP endpoint settings
public function overridePJSIPOptions(array $options): array
```

#### Real Implementation Examples

**Asterisk Dialplan Generation (from ModuleUsersGroups):**

```php
public function extensionGenContexts(): string
{
    $conf = "";
    
    // Create isolation contexts for each group
    $groups = UsersGroups::find(['isolate = "1"']);
    foreach ($groups as $group) {
        $conf .= "[group-isolation-{$group->id}]\n";
        $conf .= "exten => _.!,1,NoOp(Isolated group call)\n";
        $conf .= " same => n,Set(GROUP_ID={$group->id})\n";
        $conf .= " same => n,GotoIf($[\"\${DB(GR/{$group->id}/\${EXTEN})}\" = \"\"]?hangup)\n";
        $conf .= " same => n,Dial(PJSIP/\${EXTEN},30)\n";
        $conf .= " same => n(hangup),Hangup()\n\n";
    }
    
    return $conf;
}
```

**PJSIP Configuration Override (from ModuleUsersGroups):**

```php
public function overridePJSIPOptions(array $options): array
{
    $extension = $options['extension'] ?? '';
    $groupMember = GroupMembers::findFirst([
        'conditions' => 'extension = :ext:',
        'bind' => ['ext' => $extension]
    ]);
    
    if ($groupMember && $groupMember->group->isolate) {
        // Use named groups instead of numeric
        $options['call_group'] = "group_{$groupMember->group_id}";
        $options['pickup_group'] = "group_{$groupMember->group_id}";
        
        // Remove standard numeric groups
        unset($options['callgroup']);
        unset($options['pickupgroup']);
    }
    
    return $options;
}
```

### System Event Hooks

```php
// Execute after PBX initialization
public function onAfterPbxStarted(): void

// Module lifecycle management
public function onBeforeModuleEnable(): bool
public function onBeforeModuleDisable(): bool

// Handle data modification events
public function modelsEventChangeData(array $data): void
```

### WebUI Manipulation Methods

#### Method Signatures

```php
// Modify sidebar menu
public function onBeforeHeaderMenuShow(array &$menuItems): void

// Customize form behaviors
public function onBeforeFormInitialize(string $formClassName, Form $form): void

// Custom authentication logic
public function authenticateUser(string $login, string $password): array

// Add content to existing pages
public function onVoltBlockCompile(string $controller, string $blockName): string
```

#### Real Implementation Examples

**Form Field Injection (from ModuleUsersGroups):**

```php
public function onVoltBlockCompile(string $controller, string $blockName): string
{
    $result = '';
    
    if ($controller === 'Extensions' && $blockName === 'tabBellowForm') {
        // Add group selection to extension form
        $result = "{{ partial('Modules/ModuleUsersGroups/hookVoltBlock',
                    ['controller': controller, 
                     'blockName': blockName,
                     'extension': extensionData]) }}";
    }
    
    return $result;
}
```

**REST API Interception (from ModuleUsersGroups):**

```php
public function onAfterExecuteRestAPIRoute(array $request, array &$response): void
{
    if ($request['action'] === 'extensions/save' && 
        isset($request['data']['user_group_id'])) {
        
        // Update group membership
        $extension = $request['data']['number'];
        $groupId = $request['data']['user_group_id'];
        
        GroupMembers::assign($extension, $groupId);
        
        // Clear cache
        $this->di->get('cache')->delete('groups_members');
    }
}
```

### Priority System

Modules use a priority system for hook ordering:
- Lower numbers = higher priority
- Default priority is 1000
- Core system typically uses priorities 0-500

## Worker Implementation

Many modules need background processing. MikoPBX provides a worker system based on Beanstalkd.

### Creating a Background Worker (from ModuleLdapSync)

```php
class WorkerLdapSync extends WorkerBase
{
    protected int $maxProc = 1;
    protected int $lastSyncTime = 0;
    protected int $syncInterval = 3600; // 1 hour default
    
    public function start(array $argv): void
    {
        $this->lastSyncTime = $this->getCache('lastSyncTime', 0);
        
        // Add random delay on first run
        if ($this->lastSyncTime === 0) {
            sleep(random_int(1, 300));
        }
        
        parent::start($argv);
    }
    
    public function process(): void
    {
        $currentTime = time();
        
        if (($currentTime - $this->lastSyncTime) >= $this->syncInterval) {
            // Perform sync
            $result = LdapSyncMain::syncAllUsers();
            
            // Adjust sync frequency based on changes
            if ($result['changes'] > 0) {
                $this->syncInterval = 300; // 5 minutes if changes detected
            } else {
                $this->syncInterval = 3600; // Back to 1 hour
            }
            
            $this->lastSyncTime = $currentTime;
            $this->saveCache('lastSyncTime', $currentTime);
        }
        
        // Sleep before next check
        sleep(30);
    }
}
```

## Module Setup Class

The setup class handles module installation, uninstallation, and database management.

### Installation Lifecycle

```php
public function installModule(): bool
{
    // 1. Check compatibility
    $this->checkCompatibility();
    
    // 2. Activate license (for commercial modules)
    $this->activateLicense();
    
    // 3. Install files
    $this->installFiles();
    
    // 4. Install database
    $this->installDB();
    
    // 5. Fix file permissions
    $this->fixFilesRights();
}
```

### Key Setup Methods

```php
// Verify PBX version requirements
protected function checkCompatibility(): bool

// Handle commercial module licensing
protected function activateLicense(): bool

// Copy files and create symlinks
protected function installFiles(): bool

// Create database tables and register module
protected function installDB(): bool

// Set proper file permissions
protected function fixFilesRights(): void

// Handle module removal
public function uninstallModule(bool $keepSettings): bool
```

### Database Management

- Use Phalcon model annotations for schema definition
- Tables are created automatically via `createSettingsTableByModelsAnnotations()`
- Module registration happens through `registerNewModule()`
- Menu items are added with `addToSidebar()`

Example model with annotations:
```php
/**
 * @Table(name="module_table_name")
 * @Indexes(
 *     @Index(columns={"column1", "column2"}, name="unique_index", type="UNIQUE")
 * )
 */
class ModuleModel extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public ?int $id = null;
    
    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $name = null;
}
```

## Module Capabilities

Modules can:
- Modify any Asterisk configuration file
- Add custom dialplan contexts and applications
- Override PJSIP endpoint parameters
- Add AMI (Asterisk Manager Interface) accounts
- Add AGI (Asterisk Gateway Interface) scripts
- Configure and manage system services
- Create custom database tables
- Add web interface pages and forms
- Implement custom authentication
- Handle system events and data changes
- Provide REST API endpoints
- Add custom CSS/JS to the web interface

## File Structure

### Basic Module Structure
```
ModuleName/
├── App/
│   ├── Controllers/       # Web controllers
│   ├── Forms/            # Phalcon forms
│   └── Views/            # Volt templates
├── Lib/                  # Module libraries
├── Messages/             # Translations (en.php, ru.php, etc.)
├── Models/               # Database models
├── Setup/                # Setup class
├── agi-bin/              # AGI scripts
├── bin/                  # Executable scripts
├── db/                   # Database files
├── public/               # Web assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── img/
├── sounds/               # Sound files (OPTIONAL, see Sound Files section)
│   ├── en/              # English sound files
│   │   ├── hello.wav
│   │   ├── goodbye.wav
│   │   └── digits/      # Subdirectories supported
│   │       ├── 0.wav
│   │       └── 1.wav
│   ├── ru/              # Russian sound files
│   │   ├── hello.wav
│   │   └── goodbye.wav
│   └── de/              # German sound files (add new languages!)
│       ├── hello.wav
│       └── goodbye.wav
├── module.json           # Module metadata
└── ModuleNameConf.php    # Main module class
```

### Complex Module Structure (ModuleUsersUI Example)
```
ModuleUsersUI/
├── App/
│   ├── Controllers/
│   │   ├── ModuleUsersUIController.php
│   │   ├── AccessGroupsController.php
│   │   ├── LdapConfigController.php
│   │   └── UsersCredentialsController.php
│   ├── Forms/
│   │   ├── AccessGroupsEditForm.php
│   │   ├── LdapConfigEditForm.php
│   │   └── UsersCredentialsEditForm.php
│   ├── Module.php        # Phalcon module definition
│   ├── Providers/        # Service providers
│   └── Views/
│       └── index.volt    # Main view template
├── Lib/
│   ├── ACL/              # Module-specific ACL classes
│   │   ├── ModuleAmoCrmACL.php
│   │   ├── ModuleCTIClientACL.php
│   │   └── ... (one per integrated module)
│   ├── UsersUIAuth.php
│   ├── UsersUILdapAuth.php
│   └── UsersUICacheManager.php
├── Messages/             # 26 language files
├── Models/               # 5 database models
├── Setup/
├── db/
├── public/
│   └── assets/
│       ├── css/
│       ├── js/
│       │   ├── module-users-ui-index.js
│       │   ├── access-groups-modify.js
│       │   └── ldap-config-modify.js
│       └── img/
├── vendor/               # Composer dependencies (LDAP library)
├── composer.json
├── module.json
└── UsersUIConf.php
```

## Module Metadata (module.json)

### Basic Structure
```json
{
  "name": "Module display name",
  "uniqid": "ModuleUniqueID",
  "developer": "Developer name",
  "version": "1.0.0",
  "min_pbx_version": "2024.1.0",
  "description": "Module description",
  "lic_product_id": "12345",    // For commercial modules
  "lic_feature_id": "67890"      // For commercial modules
}
```

### Real Example (ModuleUsersGroups)
```json
{
  "name": {
    "en": "User groups",
    "ru": "Группы пользователей"
  },
  "uniqid": "ModuleUsersGroups",
  "developer": "MIKO",
  "version": "1.1.1",
  "min_pbx_version": "2024.1.0",
  "description": {
    "en": "Pickup permissions and outbound routing control",
    "ru": "Права на перехват и исходящую маршрутизацию"
  },
  "lic_product_id": "14",
  "lic_feature_id": "31"
}
```

## Integration Patterns

### 1. UI Asset Injection (from ModuleUsersUI)

```php
public function onAfterAssetsPrepared(PBXCoreREST $request, array &$assets): void
{
    // Add CSS/JS to specific pages
    if ($request->getController() === 'extensions' && 
        $request->getMethod() === 'modify') {
        
        $assets['js'][] = '/modules/ModuleUsersUI/js/extensions-modify.js';
        $assets['css'][] = '/modules/ModuleUsersUI/css/extensions.css';
    }
}
```

### 2. Event-Driven Cache Management (from ModuleUsersGroups)

```php
public function modelsEventChangeData(array $data): void
{
    // Clear cache when group data changes
    if (in_array($data['model'], ['UsersGroups', 'GroupMembers'])) {
        $cache = $this->di->get('cache');
        $cache->delete('groups_config');
        $cache->delete('groups_members');
        
        // Trigger Asterisk reload for dialplan changes
        if ($data['model'] === 'UsersGroups') {
            PBXConfModulesSync::reloadDialplan();
        }
    }
}
```

### 3. REST API Integration (from ModuleLdapSync)

```php
private function createUserViaPBXAPI(array $userData): bool
{
    $pbxApi = new PBXApiResult();
    $pbxApi->processor = 'extensions';
    $pbxApi->action = 'save';
    $pbxApi->data = [
        'number' => $userData['extension'],
        'username' => $userData['name'],
        'email' => $userData['email'],
        'mobile' => $userData['mobile'],
        'avatar' => base64_encode($userData['photo'])
    ];
    
    $response = PBXCoreREST::executeProcessor($pbxApi);
    return $response->success;
}
```

## Best Practices

1. **Naming Conventions**:
   - Module class: `ModuleNameConf`
   - Setup class: `PbxExtensionSetup` (in Setup directory)
   - Database table prefix: `m_ModuleName_`
   - JavaScript namespace: `ModuleName`

2. **Error Handling**:
   - Return appropriate values from hook methods
   - Use the `$messages` array in setup class for error reporting
   - Log errors using `Util::sysLogMsg()`
   - Handle exceptions gracefully in workers

3. **Performance**:
   - Cache frequently accessed data
   - Use database transactions for bulk operations
   - Implement smart sync intervals (like LdapSync)
   - Clear only affected cache keys, not entire cache

4. **Security**:
   - Validate all user inputs
   - Use password_hash() for storing passwords
   - Implement CSRF protection in forms
   - Check user permissions before operations

5. **Compatibility**:
   - Always implement `checkCompatibility()`
   - Use feature detection over version checking
   - Provide migration paths for database changes
   - Document minimum PBX version requirements

## Development Resources

- Module template: https://github.com/mikopbx/ModuleTemplate
- Development docs: https://github.com/mikopbx/DevelopementDocs
- Specific guides:
  - `module-developement/module-class.md` - Detailed module class implementation
  - `module-developement/module-installer.md` - Setup class implementation
  - `admin-interface.md` - Web interface integration
  - `api/rest-api.md` - REST API implementation

## Common Implementation Patterns

### 1. Multi-Language Support

```php
// In Messages/en.php
return [
    'mo_ModuleName' => 'Module Name',
    'mo_Description' => 'Module description',
    'mo_SettingsLabel' => 'Settings',
];

// Usage in views
{{ t._('mo_SettingsLabel') }}
```

### 2. JavaScript Module Pattern

```javascript
// public/js/module-name.js
const ModuleName = {
    $formObj: $('#module-form'),
    
    initialize() {
        ModuleName.initializeForm();
        ModuleName.bindEvents();
    },
    
    bindEvents() {
        ModuleName.$formObj.on('submit', (e) => {
            e.preventDefault();
            ModuleName.submitForm();
        });
    },
    
    submitForm() {
        $.api({
            url: '/modules/ModuleName/save',
            method: 'POST',
            data: ModuleName.$formObj.form('get values'),
            onSuccess(response) {
                // Handle success
            }
        });
    }
};

$(document).ready(() => {
    ModuleName.initialize();
});
```

### 3. Database Relationships

```php
// Define relationships in models
class GroupMembers extends ModelsBase
{
    public function initialize(): void
    {
        $this->belongsTo(
            'group_id',
            UsersGroups::class,
            'id',
            ['alias' => 'group']
        );
        
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            ['alias' => 'extensionData']
        );
    }
}
```

## Sound Files Integration

### Overview

MikoPBX supports two types of modules for sound file management:

1. **Language Pack Modules**: Add complete language support (thousands of system sounds)
2. **Feature Modules**: Add custom sounds for specific functionality

Both types are automatically installed and become globally accessible through standard `Playback()` dialplan commands.

### Module Types

#### 1. Language Pack Modules

**Purpose**: Add complete language support for Asterisk (e.g., German, Japanese, French)

**Characteristics**:
- Sound files installed **WITHOUT prefix** (replace/extend system sounds)
- Contains ONLY ONE language per module
- Full language pack (digits, letters, phonetic, phrases, etc.)
- Only ONE Language Pack per language allowed (conflict prevention)

**Example modules**: `ModuleLanguagePackGerman`, `ModuleLanguagePackJapanese`, `ModuleLanguagePackFrench`

#### 2. Feature Modules

**Purpose**: Add custom sounds for module-specific functionality

**Characteristics**:
- Sound files installed **WITH prefix** (`modulename-sound.wav`)
- Can support multiple languages
- Module-specific sounds (greetings, prompts, notifications)
- No installation conflicts

**Example modules**: `ModuleCallRecording`, `ModuleIVR`, `ModuleVoicemail`

### How It Works

1. **System Initialization**: On first boot, MikoPBX copies base language sounds from `/offload/asterisk/sounds/` (read-only) to `/mountpoint/mikopbx/media/sounds/` (writable)
2. **Module Type Detection**: System checks `module.json` for `module_type` field
3. **Conflict Check**: For Language Pack modules, checks if another Language Pack for the same language is already installed
4. **File Installation**:
   - Language Pack: Files copied WITHOUT prefix (direct replacement)
   - Feature module: Files copied WITH prefix (`modulename-`)
5. **Global Access**: All sounds become available through Asterisk's standard sound resolution mechanism
6. **Automatic Updates**: Module updates automatically refresh sound files

### File Structure

#### Language Pack Module Structure

```
ModuleLanguagePackGerman/
├── module.json
│   {
│     "module_type": "languagepack",
│     "language_code": "de-de"
│   }
└── sounds/
    └── de-de/                   # MUST match language_code
        ├── hello.wav            # → hello.wav (NO prefix!)
        ├── goodbye.wav          # → goodbye.wav
        ├── vm-intro.wav         # → vm-intro.wav
        ├── digits/
        │   ├── 0.wav           # → 0.wav
        │   ├── 1.wav           # → 1.wav
        │   └── ...
        ├── letters/
        │   ├── a.wav
        │   └── ...
        └── phonetic/
            ├── alpha_1.wav
            └── ...
```

#### Feature Module Structure

```
ModuleCallRecording/
├── module.json
│   {
│     "module_type": "feature"    # Optional (default)
│   }
└── sounds/
    ├── en-en/
    │   ├── recording-started.wav    # → modulecallrecording-recording-started.wav
    │   ├── recording-stopped.wav    # → modulecallrecording-recording-stopped.wav
    │   └── recording-paused.wav     # → modulecallrecording-recording-paused.wav
    ├── ru-ru/
    │   ├── recording-started.wav
    │   ├── recording-stopped.wav
    │   └── recording-paused.wav
    └── de-de/
        ├── recording-started.wav
        └── recording-stopped.wav
```

### Supported Audio Formats

- **Recommended**: WAV (PCM, 8000Hz, 16-bit, mono)
- **Supported**: ulaw, alaw, gsm, g722, sln

### File Naming Convention

#### Language Pack Modules (NO prefix)

```
Original:     sounds/de-de/hello.wav
Installed as: /mountpoint/mikopbx/media/sounds/de-de/hello.wav

Original:     sounds/de-de/digits/0.wav
Installed as: /mountpoint/mikopbx/media/sounds/de-de/digits/0.wav
```

#### Feature Modules (WITH prefix)

```
Original:     sounds/en-en/greeting.wav
Installed as: /mountpoint/mikopbx/media/sounds/en-en/modulecallrecording-greeting.wav

Original:     sounds/en-en/digits/0.wav
Installed as: /mountpoint/mikopbx/media/sounds/en-en/modulecallrecording-0.wav
```

### Usage in Dialplan

#### Language Pack Module Usage

Language Pack modules provide system sounds WITHOUT prefix:

```php
// ModuleLanguagePackGerman
public function extensionGenContexts(): string
{
    return "[german-demo]\n" .
           "exten => *88,1,Answer()\n" .
           "\tsame => n,Set(CHANNEL(language)=de-de)\n" .  // Use German language
           "\tsame => n,Playback(hello)\n" .                // System sound from Language Pack
           "\tsame => n,Playback(digits/5)\n" .             // German "5"
           "\tsame => n,Playback(goodbye)\n" .              // System sound
           "\tsame => n,Hangup()\n\n";
}
```

#### Feature Module Usage

Feature modules provide custom sounds WITH prefix:

```php
// ModuleCallRecording
public function extensionGenInternal(): string
{
    return "exten => *99,1,Answer()\n" .
           "\tsame => n,Playback(modulecallrecording-recording-started)\n" .  // Custom sound
           "\tsame => n,MixMonitor(/tmp/recording.wav)\n" .
           "\tsame => n,Hangup()\n\n";
}
```

#### Combined Usage (Language Pack + Feature Module)

```php
public function extensionGenContexts(): string
{
    return "[combined-demo]\n" .
           "exten => s,1,Answer()\n" .
           "\tsame => n,Set(CHANNEL(language)=de-de)\n" .          // Use German from Language Pack
           "\tsame => n,Playback(hello)\n" .                       // System sound (German)
           "\tsame => n,Playback(modulecallrecording-started)\n" . // Feature module sound
           "\tsame => n,Playback(goodbye)\n" .                     // System sound (German)
           "\tsame => n,Hangup()\n\n";
}
```

#### Using Subdirectories (digits, letters, etc.)

```php
public function extensionGenInternal(): string
{
    return "exten => _*88X,1,Answer()\n" .
           "\tsame => n,Set(DIGIT=\${EXTEN:3})\n" .
           "\tsame => n,Playback(modulename-digits/\${DIGIT})\n" .  // modulename-0.wav from digits/
           "\tsame => n,Hangup()\n\n";
}
```

### Creating Language Pack Module

#### Step 1: module.json Configuration

```json
{
  "module_id": "ModuleLanguagePackJapanese",
  "name": "Japanese Language Pack",
  "module_type": "languagepack",
  "language_code": "ja-ja",
  "version": "1.0.0",
  "min_pbx_version": "2024.1.0",
  "description": {
    "en": "Complete Japanese language pack for MikoPBX",
    "ru": "Полный языковой пакет для японского языка"
  }
}
```

**Required fields for Language Pack**:
- `module_type`: Must be `"languagepack"`
- `language_code`: Language-country code (e.g., `"ja-ja"`, `"de-de"`, `"fr-fr"`, `"en-en"`)

**Supported language codes**:
Use `SoundFilesConf::getSupportedLanguages()` to get the full list or `isValidLanguageCode()` for validation.

Asterisk uses `xx-xx` format (language-country):
- `en-en` - English (US)
- `en-gb` - English (UK)
- `ru-ru` - Russian
- `de-de` - German
- `ja-jp` - Japanese
- `fr-ca` - French (Canada)
- And 10+ more supported languages...

#### Step 2: Sound Files Structure

```
ModuleLanguagePackJapanese/
├── module.json
└── sounds/
    └── ja-ja/                # MUST match language_code in module.json
        ├── hello.wav         # → hello.wav (replaces system sound)
        ├── goodbye.wav       # → goodbye.wav
        ├── vm-intro.wav      # → vm-intro.wav
        ├── digits/
        │   ├── 0.wav        # → digits/0.wav
        │   ├── 1.wav
        │   └── ...
        ├── letters/
        │   ├── a.wav
        │   └── ...
        └── phonetic/
            └── ...
```

#### Step 3: Installation

When installed:
1. System checks for existing Japanese Language Pack
2. If found, installation fails with error message
3. If not found, all files copied **without prefix** to `/mountpoint/mikopbx/media/sounds/ja-ja/`
4. Japanese becomes available system-wide

### Real-World Use Case: Multilingual IVR

```php
public function extensionGenContexts(): string
{
    return "[module-ivr-multilang]\n" .
           "exten => s,1,NoOp(Multilingual IVR)\n" .
           "\tsame => n,Answer()\n" .
           "\tsame => n,Wait(1)\n" .
           "\tsame => n,Set(CHANNEL(language)=\${CALLERID(language)})\n" .  // Auto-detect language
           "\tsame => n(menu),Background(modulename-ivr-menu)\n" .  // Play menu in caller's language
           "\tsame => n,WaitExten(5)\n" .
           "\n" .
           "exten => 1,1,Playback(modulename-option1-selected)\n" .
           "\tsame => n,Goto(sales,s,1)\n" .
           "\n" .
           "exten => 2,1,Playback(modulename-option2-selected)\n" .
           "\tsame => n,Goto(support,s,1)\n" .
           "\n" .
           "exten => i,1,Playback(modulename-invalid-option)\n" .  // Invalid option
           "\tsame => n,Goto(s,menu)\n" .
           "\n" .
           "exten => t,1,Playback(modulename-timeout)\n" .  // Timeout
           "\tsame => n,Hangup()\n\n";
}
```

### Best Practices

#### For Language Pack Modules

1. **Single Language Only**: Each Language Pack must contain ONLY ONE language
2. **Complete Language Coverage**: Provide comprehensive sound set (digits, letters, phonetic, phrases)
3. **Use Standard Filenames**: Match Asterisk's default sound file naming (hello.wav, goodbye.wav, etc.)
4. **Set language_code**: Always specify `language_code` in module.json
5. **Test Thoroughly**: Verify all system sounds work correctly in target language
6. **Document Coverage**: List which sounds are included vs. missing
7. **One Per Language**: Remember - only one Language Pack per language can be installed

#### For Feature Modules

1. **Always Provide English**: English (`en-en/`) is the fallback language
2. **Descriptive Names**: Use clear filenames (e.g., `recording-started.wav` not `sound1.wav`)
3. **Multilingual Support**: Provide sounds in multiple languages if module is widely used
4. **Prefix Awareness**: Remember files will be prefixed with module name
5. **Test in Context**: Verify sounds work with intended dialplan logic
6. **Keep Sounds Focused**: Only include sounds specific to module functionality

#### General Best Practices (Both Types)

1. **Audio Quality**: Use 8000Hz, 16-bit, mono WAV files for best compatibility
2. **File Size**: Keep files small (under 1MB each) for faster loading
3. **Subdirectory Structure**: Use standard Asterisk subdirectories:
   - `digits/` - Number pronunciation
   - `letters/` - Letter pronunciation
   - `phonetic/` - Phonetic alphabet
4. **Version Control**: Update sounds when updating module version if needed
5. **Testing**: Test with `Set(CHANNEL(language)=xx)` before deploying

### Automatic Management

Sound files are automatically:
- ✅ **Installed** when module is installed (`installFiles()`)
- ✅ **Updated** when module is upgraded
- ✅ **Removed** when module is uninstalled (`unInstallFiles()`)

No additional code needed in your module!

### Technical Details

**System Configuration**:
- Base sounds: `/offload/asterisk/sounds/` (read-only, system sounds)
- Module sounds: `/mountpoint/mikopbx/media/sounds/` (writable, includes all module sounds)
- Asterisk config: `astsoundsdir => /mountpoint/mikopbx/media/sounds` in `asterisk.conf`

**Module Type Detection**:
1. Check `module.json` for `"module_type": "languagepack"`
2. If not set or not `"languagepack"` → Feature module (default)

**File Resolution Order**:
1. Asterisk looks in `/mountpoint/mikopbx/media/sounds/{language}/filename`
2. If not found, falls back to `/mountpoint/mikopbx/media/sounds/en-en/filename`
3. Feature module files use prefix: `modulename-filename.wav`
4. Language Pack files use original name: `filename.wav`

**Storage Location Example**:
```
/mountpoint/mikopbx/media/sounds/
├── en-en/                           # English (base + modules)
│   ├── hello.wav                    # System sound
│   ├── goodbye.wav                  # System sound
│   ├── modulecallrecording-started.wav    # Feature module
│   └── digits/
│       ├── 0.wav                    # System sound
│       └── modulecallrecording-0.wav      # Feature module
├── ru-ru/                           # Russian (base + modules)
│   ├── hello.wav
│   └── modulecallrecording-started.wav
└── ja-ja/                           # Japanese (from Language Pack)
    ├── hello.wav                    # Language Pack (NO prefix)
    ├── goodbye.wav                  # Language Pack (NO prefix)
    └── digits/
        ├── 0.wav                    # Language Pack
        └── modulecallrecording-0.wav      # Feature module can add too
```

**Conflict Prevention**:
- Language Pack modules: One per language (enforced)
- Feature modules: No conflicts (prefix ensures uniqueness)

### Troubleshooting

#### Language Pack Issues

**Language Pack installation fails**:
```bash
# Check for existing Language Pack for the same language
ls /mountpoint/mikopbx/media/sounds/ja-ja/

# Check system logs for conflict messages
grep "Language Pack" /var/log/mikopbx/system.log
```

**Language sounds not playing**:
```bash
# Verify language directory exists
ls /mountpoint/mikopbx/media/sounds/ja-ja/

# Check sound files (NO prefix expected)
ls /mountpoint/mikopbx/media/sounds/ja-ja/hello.wav

# Verify language is set in dialplan
asterisk -rx "dialplan show german-demo"

# Test playback
asterisk -rx "console dial *88@german-demo"
```

**Wrong Language Pack installed**:
```bash
# Uninstall the incorrect Language Pack from admin UI
# Then install the correct one
```

#### Feature Module Issues

**Feature module sounds not playing**:
```bash
# Check files exist WITH prefix
ls /mountpoint/mikopbx/media/sounds/en-en/modulecallrecording-*

# Verify format
file /mountpoint/mikopbx/media/sounds/en-en/modulecallrecording-started.wav

# Check Asterisk can read files
asterisk -rx "core show file formats"

# Test playback with correct prefix
asterisk -rx "console dial 100@test"
# Then: Playback(modulecallrecording-started)
```

**Sound files not removed after uninstall**:
```bash
# Feature modules: Check for orphaned prefixed files
find /mountpoint/mikopbx/media/sounds -name "modulecallrecording-*"

# Language Packs: Check if language directory still exists
ls /mountpoint/mikopbx/media/sounds/ja-ja/
```

#### General Issues

**Language fallback not working**:
```bash
# Verify English fallback exists
ls /mountpoint/mikopbx/media/sounds/en-en/

# Check CHANNEL(language) setting
asterisk -rx "dialplan show your-context"
```

**Module type not detected correctly**:
```bash
# Check module.json
cat /var/www/mikopbx/ModuleLanguagePackGerman/module.json | grep module_type

# Verify in logs
grep "Language Pack\|Feature" /var/log/mikopbx/system.log
```

## Testing Modules

1. Test installation on clean system
2. Verify database tables creation
3. Check Asterisk configuration generation:
   ```bash
   asterisk -rx "dialplan show [context-name]"
   asterisk -rx "pjsip show endpoint [extension]"
   ```
4. Test UI elements injection
5. Verify worker execution (if applicable)
6. Test uninstallation and cleanup
7. Check compatibility with core updates

## Module Distribution

Modules can be distributed through:
1. MikoPBX Marketplace (commercial or free)
2. Direct installation from ZIP files
3. Git repositories for development