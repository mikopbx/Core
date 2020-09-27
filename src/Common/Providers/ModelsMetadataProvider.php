<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
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


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Model\MetaData\Memory;
use Phalcon\Mvc\Model\MetaData\Strategy\Annotations as StrategyAnnotations;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class ModelsMetadataProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'modelsMetadata';

    /**
     * Register Models metadata service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $metaData = new Memory(
                    [
                        'lifetime' => 600,
                        'prefix'   => 'metacache_key',
                    ]
                );
                $metaData->setStrategy(
                    new StrategyAnnotations()
                );

                return $metaData;
            }
        );
    }
}