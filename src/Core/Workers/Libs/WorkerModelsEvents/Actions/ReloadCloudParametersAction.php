<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\CloudProvisioning;

class ReloadCloudParametersAction implements ReloadActionInterface
{
    /**
     *
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Check if it needs to get additional settings from the cloud
        CloudProvisioning::start();
    }
}