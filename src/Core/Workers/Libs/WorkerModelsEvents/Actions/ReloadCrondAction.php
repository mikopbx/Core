<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\CronConf;

class ReloadCrondAction implements ReloadActionInterface
{
    /**
     * Restarts CROND daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $cron = new CronConf();
        $cron->reStart();
    }
}