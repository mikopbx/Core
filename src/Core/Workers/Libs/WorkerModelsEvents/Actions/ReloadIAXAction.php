<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\IAXConf;

class ReloadIAXAction implements ReloadActionInterface
{
    /**
     * Refreshes IAX configs and reload iax2 module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        IAXConf::reload();
    }
}
