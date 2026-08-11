<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\NginxConf;
use RuntimeException;

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
        $nginxConf->generateModulesServerConfigs();
        if (!$nginxConf->reload()) {
            throw new RuntimeException('Unable to apply the generated nginx module configuration');
        }
    }
}
