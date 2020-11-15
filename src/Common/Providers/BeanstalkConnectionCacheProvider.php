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


use MikoPBX\AdminCabinet\Plugins\CacheCleanerPlugin;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 *  We register the beansTalk connection for send cache clean events from backend to frontend
 */
class BeanstalkConnectionCacheProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'beanstalkConnectionCache';

    /**
     * Register beanstalkConnectionCache service provider
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
                        $queue = new BeanstalkClient(CacheCleanerPlugin::class);
                        break;
                    }
                }
                return $queue;
            }
        );
    }
}