<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Core\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use MikoPBX\Common\Providers\DatabaseProviderBase;

/**
* Events log database connection is created based in the parameters defined in the configuration file
*/
class EventsLogDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    /**
     * Register db service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared('config')->get('eventsLogDatabase');
        $this->registerDBService('dbEventsLog', $di, $dbConfig);
    }
}