<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Workers\WorkerPrepareAdvices;

class ReloadAdviceAction implements ReloadActionInterface
{
    /**
     * Cleanup advice cache
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        WorkerPrepareAdvices::afterChangePBXSettings();
    }
}