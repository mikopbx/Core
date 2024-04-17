<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class RestartPBXCoreAction implements ReloadActionInterface
{
    /**
     * Restart PBX core.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::coreRestart();
    }
}