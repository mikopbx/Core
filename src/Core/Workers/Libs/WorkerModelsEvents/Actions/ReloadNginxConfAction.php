<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\NginxConf;

class ReloadNginxConfAction implements ReloadActionInterface
{
    /**
     *
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $nginxConf = new NginxConf();
        $nginxConf->generateModulesConfigs();
        $nginxConf->reStart();
    }
}