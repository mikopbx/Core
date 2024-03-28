<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\PHPConf;

class ReloadPHPFPMAction implements ReloadActionInterface
{
    /**
     * Restarts PHP-FPM daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PHPConf::reStart();
    }
}