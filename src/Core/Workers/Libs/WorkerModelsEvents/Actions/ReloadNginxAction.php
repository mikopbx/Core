<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;
use MikoPBX\Core\System\Configs\NginxConf;

class ReloadNginxAction implements ReloadActionInterface
{
    /**
     * Restarts Nginx daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $nginxConf = new NginxConf();
        $nginxConf->generateConf();
        $nginxConf->reStart();
    }
}