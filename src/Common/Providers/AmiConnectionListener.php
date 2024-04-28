<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\Asterisk\AsteriskManager;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Class AmiConnectionListener
 *
 * Service provider for registering the AMI listener service in the DI container.
 *
 * @package MikoPBX\Common\Providers
 */
class AmiConnectionListener  implements ServiceProviderInterface{

    public const SERVICE_NAME = 'amiListener';

    /**
     * Register amiListener service provider
     *
     * @param \Phalcon\Di\DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $port   = PbxSettings::getValueByKey(PbxSettingsConstants::AMI_PORT);
                $am     = new AsteriskManager();
                $am->connect("127.0.0.1:{$port}", null, null, 'on');
                return $am;
            }
        );
    }
}