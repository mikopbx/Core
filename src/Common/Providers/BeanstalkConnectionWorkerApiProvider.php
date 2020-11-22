<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 *  We register the beansTalk connection to process the REST API commands
 */
class BeanstalkConnectionWorkerApiProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'beanstalkConnectionWorkerAPI';

    /**
     * Register beanstalkConnectionWorkerAPI service provider
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