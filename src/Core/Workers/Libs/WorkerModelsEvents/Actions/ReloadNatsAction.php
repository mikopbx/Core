<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;
use MikoPBX\Core\System\Configs\NatsConf;

class ReloadNatsAction implements ReloadActionInterface
{
    /**
     * Restarts gnats queue server daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $natsConf = new NatsConf();
        $natsConf->reStart();
    }
}