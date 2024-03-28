<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ResParkingConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;

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
        $parkingConf = new ResParkingConf();
        $parkingConf->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("$asteriskPath -rx 'module reload res_parking'", $arr_out);
    }
}