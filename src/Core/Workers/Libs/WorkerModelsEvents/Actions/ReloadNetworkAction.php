<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\SystemMessages;

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
        // Log when network reload is triggered by model change
        SystemMessages::sysLogMsg(
            'ReloadNetworkAction',
            'WORKER triggered network reload due to LanInterfaces change, params=' . json_encode($parameters),
            LOG_WARNING
        );

        //  Refreshes networks configs and restarts network daemon.
        Network::networkReload();
    }
}
