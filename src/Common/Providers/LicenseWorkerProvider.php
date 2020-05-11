<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\Service\LicenseWorker;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class LicenseWorkerProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $debugMode = $di->getShared('config')->adminApplication->debugMode;
        $di->setShared(
            'licenseWorker',
            function () use ($debugMode) {
                if ($debugMode) {
                    $serverUrl = 'http://172.16.32.72:8223';
                } else {
                    $serverUrl = 'http://127.0.0.1:8223';
                }

                return new LicenseWorker($serverUrl);
            }
        );
    }
}