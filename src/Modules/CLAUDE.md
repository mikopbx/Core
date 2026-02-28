# CLAUDE.md - MikoPBX Module System

Extensible plugin architecture for MikoPBX with 4 config interfaces, lifecycle management, and isolated databases.

## File Inventory (14 files)

```
Modules/
├── PbxExtensionBase.php               # Base class for module config (Injectable)
├── PbxExtensionState.php              # Module enable/disable state manager
├── PbxExtensionUtils.php              # Static utilities (symlinks, validation, registration)
├── Logger.php                         # Module-specific file logger
│
├── Config/
│   ├── ConfigClass.php                # Abstract base - implements ALL 4 interfaces + AsteriskConfigInterface
│   ├── SystemConfigInterface.php      # 14 constants - workers, cron, nginx, fail2ban, firewall
│   ├── RestAPIConfigInterface.php     # 4 constants - routes, callbacks, request hooks
│   ├── WebUIConfigInterface.php       # 11 constants - auth, ACL, menu, routes, assets, forms
│   └── CDRConfigInterface.php         # 1 constant - CDR query filtering
│
├── Cache/
│   └── ModulesStateCache.php          # Redis cache for module state hash (24h TTL)
│
├── Models/
│   └── ModulesModelsBase.php          # Base for module models (auto DB connection)
│
└── Setup/
    ├── PbxExtensionSetupBase.php      # Install/uninstall base class
    ├── PbxExtensionSetupInterface.php # Setup contract
    └── PbxExtensionSetupFailure.php   # Fallback for missing modules
```

## Config Interfaces

### SystemConfigInterface (14 constants)
```php
MODELS_EVENT_NEED_RELOAD = 'modelsEventNeedReload'
MODELS_EVENT_CHANGE_DATA = 'modelsEventChangeData'
CREATE_CRON_TASKS = 'createCronTasks'
CREATE_NGINX_LOCATIONS = 'createNginxLocations'
CREATE_NGINX_SERVERS = 'createNginxServers'
GENERATE_FAIL2BAN_JAILS = 'generateFail2BanJails'
GENERATE_FAIL2BAN_FILTERS = 'generateFail2BanFilters'
ON_AFTER_MODULE_DISABLE = 'onAfterModuleDisable'
ON_AFTER_MODULE_ENABLE = 'onAfterModuleEnable'
GET_MODULE_WORKERS = 'getModuleWorkers'
GET_DEFAULT_FIREWALL_RULES = 'getDefaultFirewallRules'
ON_AFTER_PBX_STARTED = 'onAfterPbxStarted'
ON_BEFORE_MODULE_DISABLE = 'onBeforeModuleDisable'
ON_BEFORE_MODULE_ENABLE = 'onBeforeModuleEnable'
```

### RestAPIConfigInterface (4 constants)
```php
MODULE_RESTAPI_CALLBACK = 'moduleRestAPICallback'
GET_PBXCORE_REST_ADDITIONAL_ROUTES = 'getPBXCoreRESTAdditionalRoutes'
ON_BEFORE_EXECUTE_RESTAPI_ROUTE = 'onBeforeExecuteRestAPIRoute'
ON_AFTER_EXECUTE_RESTAPI_ROUTE = 'onAfterExecuteRestAPIRoute'
```

### WebUIConfigInterface (11 constants)
```php
AUTHENTICATE_USER = 'authenticateUser'
GET_PASSKEY_SESSION_DATA = 'getPasskeySessionData'
ON_AFTER_ACL_LIST_PREPARED = 'onAfterACLPrepared'
ON_BEFORE_HEADER_MENU_SHOW = 'onBeforeHeaderMenuShow'
ON_AFTER_ROUTES_PREPARED = 'onAfterRoutesPrepared'
ON_AFTER_ASSETS_PREPARED = 'onAfterAssetsPrepared'
ON_VOLT_BLOCK_COMPILE = 'onVoltBlockCompile'
ON_BEFORE_FORM_INITIALIZE = 'onBeforeFormInitialize'
ON_BEFORE_EXECUTE_ROUTE = 'onBeforeExecuteRoute'
ON_AFTER_EXECUTE_ROUTE = 'onAfterExecuteRoute'
ON_GET_CONTROLLER_PERMISSIONS = 'onGetControllerPermissions'
```

### CDRConfigInterface (1 constant)
```php
APPLY_ACL_FILTERS_TO_CDR_QUERY = 'applyACLFiltersToCDRQuery'
```
Called from AdminCabinet (empty `$sessionContext`) and REST API (with JWT context: role, user_name, session_id).

## ConfigClass (Abstract Base)

Implements all 4 interfaces + `AsteriskConfigInterface`. All methods have default stubs (empty string/array/void/true).

```php
abstract class ConfigClass extends PbxExtensionBase
{
    public int $priority = 10000;     // Lower = higher priority
    public string $moduleUniqueId;
    public string $moduleDir;

    // All interface methods are implemented with safe defaults
    // Modules override only the methods they need
    public function getMethodPriority(string $methodName = ''): int;
}
```

## Module Lifecycle

```
Install: installFiles → installDB → checkCompatibility → activateLicense → fixFilesRights
Enable:  onBeforeModuleEnable → enableFirewallSettings → installSounds → onAfterModuleEnable
Disable: onBeforeModuleDisable → disableFirewallSettings → removeSounds → killWorkers → onAfterModuleDisable
Uninstall: unInstallDB → unInstallFiles
```

## PbxExtensionState

Manages enable/disable with license checking and firewall.

```php
public const string DISABLED_BY_EXCEPTION = 'DisabledByException';
public const string DISABLED_BY_USER = 'DisabledByUser';
public const string DISABLED_BY_LICENSE = 'DisabledByLicense';

public function enableModule(): bool    // License check, firewall, hooks, sounds
public function disableModule(string $reason, string $reasonText): bool
```

## PbxExtensionUtils

Static utilities for module management:

```php
static isEnabled(string $moduleUniqueID): bool           // Redis-cached
static createAssetsSymlinks(string $moduleUniqueID): void // JS/CSS/IMG symlinks
static createAgiBinSymlinks(string $moduleUniqueID): void // AGI script symlinks
static createViewSymlinks(string $moduleUniqueID): void   // Volt template symlinks
static disableOldModules(): void                          // Version check, auto-disable
static registerEnabledModulesInApp(Application &$app): void
static registerEnabledModulesInRouter(Router &$router): void
static validateEnabledModules(): void                     // Separate process (catches Fatal)
static isLanguagePackModule(string $moduleUniqueID): bool
static getLanguagePackCode(string $moduleUniqueID): ?string
static checkLanguagePackConflict(string $moduleUniqueID, string $languageCode): ?string
```

## ModulesModelsBase

Base for module models. Auto-detects module ID from namespace, uses module-specific DB connection.

```php
class ModulesModelsBase extends ModelsBase
{
    public function initialize(): void  // Sets connection: {moduleUniqueId}_module_db
    public function getRepresent(bool $needLink = false): string
    public static function getConnectionServiceName(string $moduleUniqueId): string
}
```

## ModulesStateCache

Tracks module state changes via MD5 hash in Redis (`modules:state:hash`, 24h TTL). Used to detect when worker restart is needed.

## Module Naming Conventions

```
Namespace:   Modules\{ModuleUniqueID}\...
Config:      Modules\{ModuleUniqueID}\Lib\{ModuleName}Conf
Setup:       Modules\{ModuleUniqueID}\Setup\PbxExtensionSetup
DB Service:  {moduleUniqueId}_module_db
Directory:   /var/www/mikopbx/{ModuleUniqueID}/
```

## Adding REST API Routes (Module)

```php
public function getPBXCoreRESTAdditionalRoutes(): array
{
    return [
        [MyController::class, 'getData', '/pbxcore/api/v3/mymodule/{id}', 'GET', '/pbxcore/api/v3/mymodule', false],
    ];
    // [Controller, Action, Template, HttpMethod, RootUrl, NoAuth]
}
```

## Adding Menu Items (Module)

```php
public function onBeforeHeaderMenuShow(array &$menuItems): void
{
    $menuItems[] = [
        'caption' => 'My Module',
        'iconClass' => 'puzzle piece',
        'group' => 'modules',
        'href' => '/mymodule/',
    ];
}
```
