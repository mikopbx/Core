<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Workers\WorkerCallEvents;

class ReloadRecordingSettingsAction implements ReloadActionInterface
{
    /**
     * Reset a cache key to rebuild recording settings for WorkerCallEvents
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        WorkerCallEvents::afterChangeRecordingsSettings();
    }
}