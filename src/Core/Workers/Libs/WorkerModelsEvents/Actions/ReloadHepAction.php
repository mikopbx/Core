<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\HepConf;

class ReloadHepAction implements ReloadActionInterface
{
    /**
     * Update hep config file.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        HepConf::reload();
    }
}