<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\RtpConf;

class ReloadRTPAction implements ReloadActionInterface
{
    /**
     * Update RTP config file.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        RtpConf::reload();
    }
}