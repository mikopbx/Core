# Module Recipes Reference

Each recipe adds a set of files and integration points to a module.

## Recipe: base (always included)

**Files generated:**
- `module.json` — module metadata
- `Setup/PbxExtensionSetup.php` — installation/uninstallation
- `Models/{Entity}.php` — at least one settings model
- `Lib/{Feature}Conf.php` — configuration class (extends ConfigClass)
- `Messages/ru.php` — Russian translations (base keys)

**Template references:**
- `templates/module-json.md`
- `templates/setup-class.md`
- `templates/config-class.md`
- `templates/model.md`

**Code examples to read:**
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Setup/PbxExtensionSetup.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Lib/ExampleFormConf.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Models/ModuleExampleForm.php`

---

## Recipe: ui (web interface)

**Files generated:**
- `App/Controllers/Module{Feature}Controller.php` — main controller
- `App/Controllers/{Feature}BaseController.php` — base controller with shared logic
- `App/Forms/Module{Feature}Form.php` — Phalcon form
- `App/Views/Module{Feature}/index.volt` — main view template
- `App/Providers/AssetProvider.php` — JS/CSS registration
- `App/Providers/MenuProvider.php` — sidebar menu item
- `public/assets/js/src/module-{kebab}.js` — ES6+ JavaScript
- `public/assets/css/module-{kebab}.css` — CSS styles

**Hooks added to Conf.php:**
- None directly — menu integration is via Setup class sidebar registration

**Template references:**
- `templates/controller.md`
- `templates/volt-view.md`
- `templates/form.md`
- `templates/asset-provider.md`
- `templates/menu-provider.md`
- `templates/javascript-module.md`

**Code examples to read:**
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Controllers/ModuleExampleFormController.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Views/ModuleExampleForm/index.volt`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Forms/ModuleExampleFormForm.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Providers/AssetProvider.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/public/assets/js/src/module-example-form.js`

**Post-generation:**
- Run babel transpilation via `/babel-compiler` skill

---

## Recipe: rest-api (REST API v3 with auto-discovery)

**Files generated per resource:**
- `Lib/RestAPI/{Resource}/Controller.php` — HTTP interface with PHP 8 attributes
- `Lib/RestAPI/{Resource}/Processor.php` — request router to actions
- `Lib/RestAPI/{Resource}/DataStructure.php` — parameter definitions + OpenAPI schema
- `Lib/RestAPI/{Resource}/Actions/GetListAction.php` — list records
- `Lib/RestAPI/{Resource}/Actions/GetRecordAction.php` — get single record
- `Lib/RestAPI/{Resource}/Actions/SaveRecordAction.php` — create/update record
- `Lib/RestAPI/{Resource}/Actions/DeleteRecordAction.php` — delete record

**Hooks added to Conf.php:**
- None — v3 uses auto-discovery via `ControllerDiscovery::discoverModuleControllers()`

**Key patterns:**
- PHP 8 attributes: `#[ApiResource]`, `#[HttpMapping]`, `#[ApiOperation]`
- 7-phase request processing in Action classes
- DataStructure implements `OpenApiSchemaProvider`
- JWT Bearer token authentication

**Code examples to read:**
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Controller.php`
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Processor.php`
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/DataStructure.php`
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/SaveRecordAction.php`

---

## Recipe: dialplan (Asterisk dialplan hooks)

**Files generated:**
- Methods added to `Lib/{Feature}Conf.php`

**Available hooks (add only what's needed):**

```php
// Create custom contexts
public function extensionGenContexts(): string

// Add rules to [internal] context
public function extensionGenInternal(): string

// Include custom context in [internal]
public function getIncludeInternal(): string

// Modify incoming route before Dial()
public function generateIncomingRoutBeforeDial(string $rout_number): string

// Modify outgoing route after EXTEN is set
public function generateOutRoutContext(array $rout): string

// Add global variables
public function extensionGlobals(): string

// Add BLF hints
public function extensionGenHints(): string

// Add star-codes to featuremap
public function getFeatureMap(): string

// Modify incoming route AFTER Dial()
public function generateIncomingRoutAfterDialContext(string $uniqId): string

// Modify outgoing route AFTER Dial()
public function generateOutRoutAfterDialContext(array $rout): string
```

**Code examples to read:**
- `Extensions/ModuleSmartIVR/Lib/SmartIVRConf.php` — IVR context generation
- `Extensions/ModulePhoneBook/Lib/PhoneBookConf.php` — AGI injection on incoming
- `Extensions/ModuleAutoDialer/Lib/AutoDialerConf.php` — complex multi-context dialplan
- `Extensions/ModuleQualityAssessment/Lib/QualityAssessmentConf.php` — post-call hooks

---

## Recipe: agi (AGI scripts)

**Files generated:**
- `agi-bin/{script-name}.php` — AGI script

**Integration:**
- Called from dialplan via `AGI({script-name}.php)` in a dialplan hook
- Typically paired with `dialplan` recipe
- Symlinked to `/var/lib/asterisk/agi-bin/` on install via `PbxExtensionUtils::createAgiBinSymlinks()`

**Key patterns:**
```php
#!/usr/bin/php
<?php

declare(strict_types=1);

require_once 'Globals.php';

use AGI\AgiClient;
use Phalcon\Di\Di;

$agi = new AgiClient();
// Read channel variables
$callerID = $agi->getVariable('CALLERID(num)', true);
// Set channel variables
$agi->setVariable('MY_RESULT', $value);
// Execute dialplan applications
$agi->exec('Playback', 'silence/1');
```

**Code examples to read:**
- `Extensions/ModuleSmartIVR/agi-bin/SmartIVR_AGI.php`
- `Extensions/ModulePhoneBook/agi-bin/agi_phone_book.php`
- `Extensions/ModuleTelegramProvider/agi-bin/saveSipHeadersInRedis.php`

---

## Recipe: workers (background workers)

**Files generated:**
- `bin/Worker{Feature}{Type}.php` — worker class(es)

**Hooks added to Conf.php:**
```php
public function getModuleWorkers(): array
{
    return [
        [
            'type'   => WorkerSafeScriptsCore::CHECK_BY_BEANSTALK,
            'worker' => Worker{Feature}Main::class,
        ],
    ];
}
```

**Worker types:**

| Type | Constant | Use case |
|------|----------|----------|
| Beanstalk queue | `CHECK_BY_BEANSTALK` | Event processing, task queues |
| AMI events | `CHECK_BY_AMI` | Real-time call event tracking |
| PID monitoring | `CHECK_BY_PID_NOT_ALERT` | Long-running daemons |

**Key patterns:**
```php
class WorkerFeatureMain extends WorkerBase
{
    public function start($argv): void
    {
        $client = new BeanstalkClient(self::class);
        $client->subscribe(self::class, [$this, 'onEvents']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        while ($this->needRestart === false) {
            $client->wait(1);
        }
    }
}
```

**Code examples to read:**
- `Extensions/EXAMPLES/AMI/ModuleExampleAmi/Lib/WorkerExampleAmiAMI.php`
- `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Lib/WorkerExampleFormMain.php`

---

## Recipe: firewall (firewall + fail2ban)

**Files generated:**
- Methods added to `Lib/{Feature}Conf.php`

**Hooks:**

```php
// Define firewall rules opened when module enabled
public function getDefaultFirewallRules(): array
{
    return [
        'Module{Feature}' => [
            'rules' => [
                ['name' => 'ModuleAPIPort', 'protocol' => 'tcp', 'portfrom' => 8080, 'portto' => 8080],
            ],
            'action' => 'allow',
        ],
    ];
}

// Inject custom iptables rules after standard ones
public function onAfterIptablesReload(): void
{
    // Rate limiting example
    $cmd = 'iptables -I INPUT -p tcp --dport 8080 -m state --state NEW -m recent --set';
    Processes::mwExec($cmd);
}

// Add fail2ban jail definitions
public function generateFail2BanJails(): string
{
    return <<<JAIL
    [module-feature]
    enabled  = true
    port     = 8080
    filter   = module-feature
    logpath  = /var/log/module-feature.log
    maxretry = 5
    bantime  = 3600
    JAIL;
}
```

---

## Recipe: acl (access control)

**Files generated:**
- Methods added to `Lib/{Feature}Conf.php`

**Hooks:**

```php
// Add ACL roles and rules
public function onAfterACLPrepared(AclList $aclList): void

// Filter CDR by user role
public function applyACLFiltersToCDRQuery(array &$parameters, array $sessionContext): void

// Define controller permissions
public function onGetControllerPermissions(string $controller, array &$permissions): void

// External authentication (LDAP, OAuth, etc.)
public function authenticateUser(string $login, string $password): array
```

**Code examples to read:**
- `Extensions/ModuleUsersUI/Lib/UsersUIConf.php`
- `Extensions/ModuleUsersGroups/Lib/UsersGroupsConf.php`

---

## Recipe: system (system integration)

**Files generated:**
- Methods added to `Lib/{Feature}Conf.php`

**Hooks:**

```php
// Register cron tasks
public function createCronTasks(array &$tasks): void
{
    $workerPath = $this->moduleDir . '/bin/cleanup.php';
    $phpPath = Util::which('php');
    $tasks[] = "0 1 * * * {$phpPath} -f {$workerPath} > /dev/null 2>&1\n";
}

// Add nginx location blocks
public function createNginxLocations(): string
{
    return <<<NGINX
    location /pbxcore/api/module-feature/webhook {
        proxy_pass http://127.0.0.1:8080;
    }
    NGINX;
}

// Add nginx server blocks (custom port)
public function createNginxServers(): string

// Actions after PBX fully started
public function onAfterPbxStarted(): void

// Actions after network configured
public function onAfterNetworkConfigured(): void
```

---

## Recipe Combinations

Common recipe combinations for typical modules:

| Module type | Recipes |
|-------------|---------|
| Simple settings page | base + ui |
| REST API service | base + rest-api |
| Call processing | base + ui + dialplan + agi |
| CRM integration | base + ui + rest-api + workers + dialplan |
| Security module | base + ui + firewall + dialplan |
| Full-featured module | base + ui + rest-api + dialplan + agi + workers + system |
