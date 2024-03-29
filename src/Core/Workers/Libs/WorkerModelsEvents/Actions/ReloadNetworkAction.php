<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\System;

class ReloadNetworkAction implements ReloadActionInterface
{
    /**
     * Refreshes networks configs and restarts network daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        System::networkReload();
    }
}