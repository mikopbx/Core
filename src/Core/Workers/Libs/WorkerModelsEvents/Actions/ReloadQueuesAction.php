<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\QueueConf;
use MikoPBX\Core\Asterisk\Configs\QueueRulesConf;

class ReloadQueuesAction implements ReloadActionInterface
{
    /**
     * Generates queue.conf and restart asterisk queue module
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Regenerate queuerules.conf for completeness — currently it stays
        // empty (linear_progressive does ramp-up via dialplan Wait() rather
        // than penaltychange rules; see QueueConf::extensionGenInternal and
        // InternalContexts::generateInternalUsers). Kept in case future
        // strategies reintroduce penalty rules.
        (new QueueRulesConf())->generateConfig();
        QueueConf::reload();
    }
}
