# MikoPBX Module Hook Reference

Complete list of all hooks available to modules via ConfigClass.

## Interfaces

Hooks are grouped by interface:

| Interface | Hooks | Purpose |
|-----------|-------|---------|
| SystemConfigInterface | 14 | Module lifecycle, workers, firewall, cron, nginx |
| RestAPIConfigInterface | 4 | REST API routes and callbacks |
| WebUIConfigInterface | 11 | Admin UI customization |
| CDRConfigInterface | 1 | CDR filtering |
| AsteriskConfigInterface | 25+ | Asterisk dialplan and config generation |

---

## SystemConfigInterface (14 hooks)

### Module Lifecycle

```php
/**
 * Called before module is enabled. Return false to prevent.
 */
public function onBeforeModuleEnable(): bool { return true; }

/**
 * Called after module is enabled.
 * Common: restart cron, reload dialplan/SIP.
 */
public function onAfterModuleEnable(): void {}

/**
 * Called before module is disabled. Return false to prevent.
 * Use to serialize related objects before removal.
 */
public function onBeforeModuleDisable(): bool { return true; }

/**
 * Called after module is disabled.
 * Common: reload dialplan, clean up.
 */
public function onAfterModuleDisable(): void {}
```

### Model Events

```php
/**
 * Called when any database model is changed.
 * $data keys: 'model' (class), 'recordId', 'changedFields'
 */
public function modelsEventChangeData(array $data): void {}

/**
 * Called after model changes are batched and ready for reload.
 * $plannedReloadActions contains list of actions to perform.
 */
public function modelsEventNeedReload(array $plannedReloadActions): void {}
```

### Worker Management

```php
/**
 * Return array of workers for WorkerSafeScriptsCore to supervise.
 *
 * Worker types:
 *   WorkerSafeScriptsCore::CHECK_BY_BEANSTALK - Beanstalk queue listener
 *   WorkerSafeScriptsCore::CHECK_BY_AMI - AMI event listener
 *   WorkerSafeScriptsCore::CHECK_BY_PID_NOT_ALERT - PID monitoring
 */
public function getModuleWorkers(): array { return []; }
```

### Firewall & Network

```php
/**
 * Define firewall rules auto-enabled with module.
 * Return: ['CategoryName' => ['rules' => [...], 'action' => 'allow']]
 */
public function getDefaultFirewallRules(): array { return []; }

/**
 * Called after iptables rules are reloaded.
 * Use to inject custom iptables rules (rate limiting, etc.).
 */
public function onAfterIptablesReload(): void {}

/**
 * Called after network interfaces are configured.
 * Use for VPN, overlay networks, etc.
 */
public function onAfterNetworkConfigured(): void {}
```

### Background Tasks

```php
/**
 * Register cron tasks.
 * Each task is a string: "*/5 * * * * /path/to/script > /dev/null 2>&1\n"
 */
public function createCronTasks(array &$tasks): void {}
```

### Web Server

```php
/**
 * Add nginx location blocks to main server.
 * Return raw nginx config string.
 */
public function createNginxLocations(): string { return ''; }

/**
 * Add nginx server blocks (custom ports/vhosts).
 * Return raw nginx config string.
 */
public function createNginxServers(): string { return ''; }
```

### Security

```php
/**
 * Add fail2ban jail definitions.
 * Return raw fail2ban jail config string.
 */
public function generateFail2BanJails(): string { return ''; }
```

### Startup

```php
/**
 * Called after PBX initialization is complete.
 * All services (Asterisk, Redis, Nginx, etc.) are running.
 */
public function onAfterPbxStarted(): void {}
```

---

## RestAPIConfigInterface (4 hooks)

```php
/**
 * Register custom REST API routes.
 * Return array of: [ControllerClass, 'actionMethod', '/path/{id}', 'GET', '/', false]
 * Last param: true = no auth required, false = auth required
 */
public function getPBXCoreRESTAdditionalRoutes(): array { return []; }

/**
 * Handle API callback requests (legacy pattern, prefer v3 controllers).
 * Called for module-specific API actions.
 */
public function moduleRestAPICallback(array $request): PBXApiResult { return new PBXApiResult(); }

/**
 * Pre-request middleware. Called before every REST API route execution.
 */
public function onBeforeExecuteRestAPIRoute(Micro $app): void {}

/**
 * Post-request middleware. Called after every REST API route execution.
 */
public function onAfterExecuteRestAPIRoute(Micro $app): void {}
```

---

## WebUIConfigInterface (11 hooks)

### Authentication & Authorization

```php
/**
 * External authentication provider.
 * Return session data array if auth succeeds, empty array if not handled.
 */
public function authenticateUser(string $login, string $password): array { return []; }

/**
 * Add ACL roles and rules after core ACL is prepared.
 */
public function onAfterACLPrepared(AclList $aclList): void {}

/**
 * Define custom controller permissions.
 */
public function onGetControllerPermissions(string $controller, array &$permissions): void {}
```

### Menu & Navigation

```php
/**
 * Modify sidebar menu items before rendering.
 * $menuItems passed by reference — add, remove, or reorder.
 */
public function onBeforeHeaderMenuShow(array &$menuItems): void {}
```

### Routing & Assets

```php
/**
 * Register custom web routes after core routes are prepared.
 */
public function onAfterRoutesPrepared(Router $router): void {}

/**
 * Add JS/CSS assets globally or per controller.
 */
public function onAfterAssetsPrepared(Manager $assets, Dispatcher $dispatcher): void {}
```

### Template Customization

```php
/**
 * Override volt template blocks at compile time.
 * Return path to partial template that replaces the block.
 */
public function onVoltBlockCompile(string $controller, string $blockName, View $view): string { return ''; }

/**
 * Modify Phalcon form before rendering.
 * Add/remove/modify form elements.
 */
public function onBeforeFormInitialize(Form $form, $entity, array $options): void {}
```

### Request/Response

```php
/**
 * Pre-route execution for admin controllers.
 */
public function onBeforeExecuteRoute(Dispatcher $dispatcher): void {}

/**
 * Post-route execution for admin controllers.
 */
public function onAfterExecuteRoute(Dispatcher $dispatcher): void {}
```

---

## CDRConfigInterface (1 hook)

```php
/**
 * Filter CDR records based on user role/permissions.
 * Modify $parameters to add WHERE conditions.
 * $sessionContext: ['role', 'user_name', 'session_id'] (from API) or [] (from UI).
 */
public function applyACLFiltersToCDRQuery(array &$parameters, array $sessionContext): void {}
```

---

## AsteriskConfigInterface (25+ hooks)

### Dialplan Generation

```php
// Add hints to [internal-hints] for BLF
public function extensionGenHints(): string { return ''; }

// Add rules to [internal] context
public function extensionGenInternal(): string { return ''; }

// Add pre-dial rules to [internal-users]
public function extensionGenInternalUsersPreDial(): string { return ''; }

// Add to [all_peers] context
public function extensionGenAllPeersContext(): string { return ''; }

// Add to [internal-transfer] context
public function extensionGenInternalTransfer(): string { return ''; }

// Add to [dial_create_chan] context (channel creation)
public function extensionGenCreateChannelDialplan(): string { return ''; }

// Create custom contexts (most common hook)
public function extensionGenContexts(): string { return ''; }

// Add global variables to [globals]
public function extensionGlobals(): string { return ''; }
```

### Context Includes

```php
// Include contexts in [internal]
public function getIncludeInternal(): string { return ''; }

// Include contexts in [internal-transfer]
public function getIncludeInternalTransfer(): string { return ''; }
```

### Incoming Route Hooks

```php
// Add to [public-direct-dial] context
public function generatePublicContext(): string { return ''; }

// Pre-system rules (before module hooks)
public function generateIncomingRoutBeforeDialPreSystem(string $routNumber): string { return ''; }

// Pre-dial rules for incoming route (most common)
public function generateIncomingRoutBeforeDial(string $routNumber): string { return ''; }

// System rules (before other modules)
public function generateIncomingRoutBeforeDialSystem(string $routNumber): string { return ''; }

// Post-dial rules for incoming route
public function generateIncomingRoutAfterDialContext(string $uniqId): string { return ''; }
```

### Outgoing Route Hooks

```php
// Pre-dial rules for outgoing route (EXTEN is set)
public function generateOutRoutContext(array $rout): string { return ''; }

// Post-dial rules for outgoing route
public function generateOutRoutAfterDialContext(array $rout): string { return ''; }
```

### PJSIP Configuration

```php
// Add custom SIP peers/endpoints to pjsip.conf
public function generatePeersPj(): string { return ''; }

// Add options to each peer's endpoint section
public function generatePeerPjAdditionalOptions(array $peer): string { return ''; }

// Override peer PJSIP options (return modified array)
public function overridePJSIPOptions(string $extension, array $options): array { return $options; }

// Override provider PJSIP options
public function overrideProviderPJSIPOptions(string $uniqid, array $options): array { return $options; }
```

### Configuration Files

```php
// Generate modules.conf entries
public function generateModulesConf(): string { return ''; }

// Add AMI users to manager.conf
public function generateManagerConf(): string { return ''; }

// Add ARI configuration
public function generateAriConf(): string { return ''; }

// Add star-codes to [featuremap] in features.conf
public function getFeatureMap(): string { return ''; }
```

### Priority System

```php
/**
 * Control execution order of hooks.
 * Lower value = higher priority.
 * Default: 10000
 *
 * Override globally via $this->priority or per-method:
 */
public function getMethodPriority(string $methodName = ''): int
{
    return match($methodName) {
        'generateIncomingRoutBeforeDial' => 100,  // Run early
        default => parent::getMethodPriority($methodName),
    };
}
```
