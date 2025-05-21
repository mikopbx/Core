<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Processes;

class ReloadAllSystemWorkersAction implements ReloadActionInterface
{
    /**
     * Reload all system workers.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        Processes::restartAllWorkers(true);
    }
}