<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\AdminCabinet\Providers;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 *  We register the beansTalk connection for send models changes to backend application
 */
class BeanstalkConnectionProvider implements ServiceProviderInterface
{
    /**
     * Register db service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared('beanstalkConnection', function () {
            return new BeanstalkClient(WorkerModelsEvents::class);
        });
    }
}