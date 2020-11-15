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
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 *  We register the beansTalk connection for send models changes to backend application
 */
class BeanstalkConnectionModelsProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'beanstalkConnectionModels';
    /**
     * Register beanstalkConnectionModels service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                while (true) {
                    $pid = Util::getPidOfProcess('beanstalkd');
                    if (empty($pid)) {
                        Util::echoWithSyslog(' - Wait for start beanstalkd deamon ...' . PHP_EOL);
                        sleep(2);
                    } else {
                        $queue = new BeanstalkClient(WorkerModelsEvents::class);
                        break;
                    }
                }
                return $queue;
            }
        );
    }
}