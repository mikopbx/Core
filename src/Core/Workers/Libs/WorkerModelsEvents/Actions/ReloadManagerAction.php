<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class ReloadManagerAction implements ReloadActionInterface
{
    /**
     * Reloads Asterisk manager interface module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::managerReload();
    }
}