<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\SyslogConf;

class ReloadSyslogDAction implements ReloadActionInterface
{
    /**
     * Restarts rsyslog daemon
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
    }
}