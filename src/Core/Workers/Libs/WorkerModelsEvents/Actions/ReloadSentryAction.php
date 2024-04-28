<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\SentryConf;

class ReloadSentryAction implements ReloadActionInterface
{
    /**
     * Configure the sentry error logger
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $sentryConf = new SentryConf();
        $sentryConf->configure();
    }
}