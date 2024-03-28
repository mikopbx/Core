<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\PBX;

class ReloadVoicemailAction implements ReloadActionInterface
{
    /**
     * Reloads Asterisk voicemail module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        PBX::voicemailReload();
    }
}