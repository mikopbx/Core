<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ReloadWorkerCallEventsAction implements ReloadActionInterface
{
    /**
     * Reloads WorkerCallEvents worker
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        Processes::processPHPWorker(WorkerCallEvents::class);
    }
}