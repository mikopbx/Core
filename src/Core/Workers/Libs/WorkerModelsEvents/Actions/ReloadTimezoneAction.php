<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\System;

class ReloadTimezoneAction implements ReloadActionInterface
{
    /**
     *
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        System::timezoneConfigure();
    }
}