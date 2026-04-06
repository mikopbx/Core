<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ManagerConf;

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
        ManagerConf::reload();
    }
}
