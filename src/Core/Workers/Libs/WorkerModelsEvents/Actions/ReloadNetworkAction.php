<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Network;

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
        Network::networkReload();
    }
}