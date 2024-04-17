<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\H323Conf;

class ReloadH323Action implements ReloadActionInterface
{
    /**
     * Update H323 config file.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        H323Conf::reload();
    }
}