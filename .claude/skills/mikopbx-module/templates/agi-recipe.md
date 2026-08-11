# Template: AGI Script Recipe

## Before generating, READ these canonical examples:

- Phone lookup: `Extensions/ModulePhoneBook/agi-bin/agi_phone_book.php`
- Redis caching: `Extensions/ModuleTelegramProvider/agi-bin/saveSipHeadersInRedis.php`

## File

`agi-bin/{script-name}.php`

## Template

```php
#!/usr/bin/php
<?php

declare(strict_types=1);

require_once 'Globals.php';

use MikoPBX\Core\Asterisk\AGI;
use Phalcon\Di\Di;

// The AGI client is MikoPBX\Core\Asterisk\AGI (Core/src/Core/Asterisk/AGI.php).
// Its accessors are snake_case: get_variable() / set_variable().
$agi = new AGI();

// Read channel variables (second arg true returns the bare value)
$callerID = $agi->get_variable('CALLERID(num)', true);
$exten    = $agi->get_variable('EXTEN', true);
$linkedId = $agi->get_variable('CHANNEL(linkedid)', true);

// Your business logic here
// Example: lookup in module database
$di = Di::getDefault();
// $record = MyModel::findFirst(["conditions" => "phone = :phone:", "bind" => ["phone" => $callerID]]);

// Set result variable for dialplan
$agi->set_variable('MY_RESULT', $result);

// Optional: execute dialplan application
// $agi->exec('Playback', 'silence/1');
```

## Calling from Dialplan

In your Conf.php `extensionGenContexts()` or `generateIncomingRoutBeforeDial()`:

```php
public function generateIncomingRoutBeforeDial(string $rout_number): string
{
    return 'same => n,AGI({script-name}.php)' . PHP_EOL;
}
```

## Security

- Always use `escapeshellarg()` for shell commands
- Validate input from channel variables
- Use parameterized queries for database access
- Keep AGI scripts short — delegate to Main class for complex logic
