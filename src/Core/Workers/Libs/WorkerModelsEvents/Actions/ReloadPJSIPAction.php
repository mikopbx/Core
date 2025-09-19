<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\SIPConf;

class ReloadPJSIPAction implements ReloadActionInterface
{
    /**
     * Refreshes SIP configs and reload PJSIP module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        SIPConf::reload();
    }
}
