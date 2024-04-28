<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\NTPConf;

class ReloadNTPAction implements ReloadActionInterface
{
    /**
     * Restarts NTP daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        NTPConf::configure();
    }
}