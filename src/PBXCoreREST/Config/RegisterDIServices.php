<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\PBXCoreREST\Config;

use MikoPBX\PBXCoreREST\Providers\{DispatcherProvider, RequestProvider, ResponseProvider, RouterProvider, BeanstalkConnectionProvider};
use MikoPBX\Common\Providers\{SessionReadOnlyProvider};
use Phalcon\Di\DiInterface;

class RegisterDIServices
{
    /**
     * Register dispatcher service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public static function init(DiInterface $di):void
    {
        $pbxRestAPIProviders = [
            BeanstalkConnectionProvider::class,
            DispatcherProvider::class,
            RouterProvider::class,
            ResponseProvider::class,
            RequestProvider::class,
            SessionReadOnlyProvider::class
        ];

        foreach ($pbxRestAPIProviders as $provider) {
            $di->register(new $provider());
        }

    }
}