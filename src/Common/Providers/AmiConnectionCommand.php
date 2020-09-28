<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\AsteriskManager;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class AmiConnectionCommand implements ServiceProviderInterface{

    public const SERVICE_NAME = 'amiCommander';
    /**
     * Register amiCommander service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $port   = PbxSettings::getValueByKey('AMIPort');
                $am     = new AsteriskManager();
                $am->connect("127.0.0.1:{$port}", null, null, 'off');
                return $am;
            }
        );
    }
}