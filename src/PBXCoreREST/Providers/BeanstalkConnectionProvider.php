<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Providers;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class BeanstalkConnectionProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'beanstalkConnection';

    /**
     * Register beanstalkConnection service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                return new BeanstalkClient(WorkerApiCommands::class);
            }
        );
    }
}