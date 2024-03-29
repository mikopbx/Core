<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\CloudProvisioning;
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
        // Create Network object and configure settings
        $network = new Network();
        $network->hostnameConfigure();
        $network->resolvConfGenerate();
        $network->loConfigure();
        $network->lanConfigure();
        $network->configureLanInDocker();

        // Check if it needs to get additional settings from the cloud
        CloudProvisioning::start();
    }
}