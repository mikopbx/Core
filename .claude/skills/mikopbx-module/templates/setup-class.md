# Template: Setup/PbxExtensionSetup.php

Read the canonical example before generating:
`Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Setup/PbxExtensionSetup.php`

## Key Structure

```php
<?php

declare(strict_types=1);

namespace Modules\Module{Feature}\Setup;

use MikoPBX\Modules\Setup\PbxExtensionSetupBase;

class PbxExtensionSetup extends PbxExtensionSetupBase
{
    // No additional methods needed for basic modules.
    // Base class handles:
    //   - createSettingsTableByModelsAnnotations()
    //   - registerNewModule()
    //   - addToSidebar()
    //   - createAssetsSymlinks()
    //   - createAgiBinSymlinks()
    //   - createViewSymlinks()
}
```

## When to Override

Override `installDB()` if you need to:
- Insert default data after table creation
- Allocate an extension number
- Perform data migration from older version

```php
public function installDB(): bool
{
    $result = parent::installDB();

    if ($result) {
        // Insert default settings row if empty
        $settings = Module{Feature}Settings::findFirst();
        if ($settings === null) {
            $settings = new Module{Feature}Settings();
            $settings->enabled = '0';
            $result = $settings->save();
        }
    }

    return $result;
}
```
