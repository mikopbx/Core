<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\SSHConf;

class ReloadSSHAction implements ReloadActionInterface
{
    /**
     * Configures SSH settings
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $sshConf = new SSHConf();
        $sshConf->configure();
    }
}