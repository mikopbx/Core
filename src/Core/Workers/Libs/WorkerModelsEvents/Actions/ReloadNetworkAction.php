<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\System;
use MikoPBX\Core\Workers\WorkerModelsEvents;

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
        //  Refreshes networks configs and restarts network daemon.
        System::networkReload();

        //  Refreshes cloud provision after all other tasks
        WorkerModelsEvents::invokeAction(WorkerModelsEvents::R_CLOUD_PROVISION, [],1000);
    }
}