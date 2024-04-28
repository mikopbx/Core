<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class ReloadRecordSavePeriodAction implements ReloadActionInterface
{
    /**
     * Update record save period
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::updateSavePeriod();
    }
}