<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Workers\WorkerPrepareAdvice;

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
        WorkerPrepareAdvice::afterChangePBXSettings();
    }
}