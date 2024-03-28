<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\System;

class ReloadCustomFilesAction implements ReloadActionInterface
{
    /**
     * Updates custom changes in config files
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        System::updateCustomFiles();
    }
}