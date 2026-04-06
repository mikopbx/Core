<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\FeaturesConf;

class ReloadFeaturesAction implements ReloadActionInterface
{
    /**
     * Refreshes features configs and reload features module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        FeaturesConf::reload();
    }
}
