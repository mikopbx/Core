# Template: Worker Recipe Files

## Before generating, READ these canonical examples:

- Beanstalk Worker: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/Lib/WorkerExampleFormMain.php`
- AMI Worker: `Extensions/EXAMPLES/AMI/ModuleExampleAmi/Lib/WorkerExampleAmiAMI.php`

## File Inventory

1. `bin/Worker{Feature}{Type}.php` — Worker class(es)

## Beanstalk Worker Template

```php
<?php

declare(strict_types=1);

namespace Modules\Module{Feature}\Lib;

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\BeanstalkClient;

class Worker{Feature}Main extends WorkerBase
{
    public function start(array $argv): void
    {
        $client = new BeanstalkClient(self::class);
        $client->subscribe(self::class, [$this, 'onEvents']);
        $client->subscribe(
            $this->makePingTubeName(self::class),
            [$this, 'pingCallBack']
        );

        while ($this->needRestart === false) {
            $client->wait(1);
        }
    }

    /**
     * Process incoming events from the queue.
     */
    public function onEvents(BeanstalkClient $tube): void
    {
        $data = json_decode($tube->getBody(), true, 512, JSON_THROW_ON_ERROR);

        // Process event
        match($data['action'] ?? '') {
            'process' => $this->processItem($data),
            default => null,
        };
    }

    private function processItem(array $data): void
    {
        // Business logic here
    }
}
```

## AMI Worker Template

```php
<?php

declare(strict_types=1);

namespace Modules\Module{Feature}\Lib;

use MikoPBX\Core\Workers\WorkerBase;

class Worker{Feature}AMI extends WorkerBase
{
    public function start(array $argv): void
    {
        $this->am = new \MikoPBX\Core\Asterisk\AsteriskManager();
        $this->am->connect('127.0.0.1:5038');

        $this->am->addEventHandler('userevent', [$this, 'callback']);

        while ($this->needRestart === false) {
            $this->am->waitUserEvent(true);
            if (!$this->am->connected()) {
                usleep(500000);
                $this->am->connect('127.0.0.1:5038');
            }
        }
    }

    /**
     * Handle AMI UserEvent messages.
     */
    public function callback(array $parameters): void
    {
        $eventName = $parameters['UserEvent'] ?? '';

        match($eventName) {
            'CdrConnector' => $this->handleCdrEvent($parameters),
            default => null,
        };
    }

    private function handleCdrEvent(array $params): void
    {
        // Process CDR event
    }
}
```

## Registration in Conf.php

```php
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;

public function getModuleWorkers(): array
{
    return [
        [
            'type'   => WorkerSafeScriptsCore::CHECK_BY_BEANSTALK,
            'worker' => Worker{Feature}Main::class,
        ],
        [
            'type'   => WorkerSafeScriptsCore::CHECK_BY_AMI,
            'worker' => Worker{Feature}AMI::class,
        ],
    ];
}
```
