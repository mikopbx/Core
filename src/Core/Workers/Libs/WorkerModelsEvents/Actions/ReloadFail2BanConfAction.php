<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\Fail2BanConf;

class ReloadFail2BanConfAction implements ReloadActionInterface
{
    /**
     * Restarts Fail2Ban daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        Fail2BanConf::reloadFail2ban();
    }
}