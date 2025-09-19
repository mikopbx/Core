<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ModulesConf;

class ReloadModulesConfAction implements ReloadActionInterface
{
    /**
     * Update modules.conf file.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        ModulesConf::reload();
    }
}