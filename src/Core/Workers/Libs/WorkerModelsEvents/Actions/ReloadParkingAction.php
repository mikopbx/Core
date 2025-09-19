<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ResParkingConf;

class ReloadParkingAction implements ReloadActionInterface
{
    /**
     * Reloads res_parking
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        ResParkingConf::reload();
    }
}