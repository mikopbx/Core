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
├── bin/                  # Executable scripts
├── db/                   # Database files
├── public/               # Web assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── img/
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