<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;

class ReloadDialplanAction implements ReloadActionInterface
{
    /**
     * Reloads Asterisk dialplan
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        ExtensionsConf::reload();
    }
}