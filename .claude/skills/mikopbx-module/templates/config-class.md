# Template: Lib/{Feature}Conf.php

Read the canonical examples before generating:
- Basic: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Lib/ExampleFormConf.php`
- AMI: `Extensions/EXAMPLES/AMI/ModuleExampleAmi/Lib/ExampleAmiConf.php`
- REST API v3: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/ExampleRestAPIv3Conf.php`

## Key Structure

```php
<?php

declare(strict_types=1);

namespace Modules\Module{Feature}\Lib;

use MikoPBX\Modules\Config\ConfigClass;
use Modules\Module{Feature}\Models\{Entity};

class {Feature}Conf extends ConfigClass
{
    /**
     * Called when a database model record is changed.
     *
     * React to changes in your module's models or core models.
     */
    public function modelsEventChangeData(array $data): void
    {
        // Example: reload dialplan when module settings change
        if ($data['model'] === {Entity}::class) {
            PBX::dialplanReload();
        }
    }

    /**
     * Called after module is enabled.
     */
    public function onAfterModuleEnable(): void
    {
        PBX::dialplanReload();
    }

    /**
     * Called after module is disabled.
     */
    public function onAfterModuleDisable(): void
    {
        PBX::dialplanReload();
    }

    // Add recipe-specific hooks below.
    // See hook-reference.md for complete list.
}
```

## Adding Recipe Hooks

Add only the methods needed. ConfigClass has safe empty defaults for all hooks.

### Dialplan hooks
See `reference/hook-reference.md` → AsteriskConfigInterface section

### Worker registration
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

### Firewall rules
```php
public function getDefaultFirewallRules(): array
{
    return [
        'Module{Feature}' => [
            'rules' => [
                ['name' => '{Feature}Port', 'protocol' => 'tcp', 'portfrom' => 8080, 'portto' => 8080],
            ],
            'action' => 'allow',
        ],
    ];
}
```
