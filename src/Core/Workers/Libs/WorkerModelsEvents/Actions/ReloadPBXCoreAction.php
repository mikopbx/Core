<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Asterisk\Configs\AsteriskConf;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\FeaturesConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\IndicationConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;

class ReloadPBXCoreAction implements ReloadActionInterface
{
    /**
     * Reload PBX core.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        SIPConf::reload();
        IAXConf::reload();
        ExtensionsConf::reload();

        // Core reload includes Features, Asterisk and Indication configs
        FeaturesConf::reload();
        AsteriskConf::reload();
        IndicationConf::reload();
    }
}