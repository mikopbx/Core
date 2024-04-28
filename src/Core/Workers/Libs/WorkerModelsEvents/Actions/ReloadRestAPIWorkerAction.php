<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Processes;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;

class ReloadRestAPIWorkerAction implements ReloadActionInterface
{
    /**
     * Reloads WorkerApiCommands worker
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        Processes::processPHPWorker(WorkerApiCommands::class);
    }
}