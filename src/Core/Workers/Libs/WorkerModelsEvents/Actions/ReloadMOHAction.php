<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class ReloadMOHAction implements ReloadActionInterface
{
    /**
     * Reloads MOH file list in Asterisk.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::musicOnHoldReload();
    }
}