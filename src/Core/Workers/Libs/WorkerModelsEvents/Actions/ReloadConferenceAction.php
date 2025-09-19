<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\ConferenceConf;

class ReloadConferenceAction implements ReloadActionInterface
{
    /**
     * Reloads MOH file list in Asterisk.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        ConferenceConf::reload();
    }
}