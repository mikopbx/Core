<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * CDR database connection is created based in the parameters defined in the configuration file
 */
class CDRDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'dbCDR';

    /**
     * Register dbCDR service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared('config')->get('cdrDatabase')->toArray();
        $this->registerDBService(self::SERVICE_NAME, $di, $dbConfig);
    }
}