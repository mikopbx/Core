<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class ReloadPBXCoreAction implements ReloadActionInterface
{
    /**
     * Reload PBX core.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::sipReload();
        PBX::iaxReload();
        PBX::dialplanReload();
        PBX::coreReload();
    }
}