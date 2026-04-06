<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;

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
        VoiceMailConf::reload();
    }
}