<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\QueueConf;

class ReloadQueuesAction implements ReloadActionInterface
{
    /**
     * Generates queue.conf and restart asterisk queue module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        QueueConf::queueReload();
    }
}