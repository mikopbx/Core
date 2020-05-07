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


use MikoPBX\AdminCabinet\Library\Elements;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Register a user component
 */
class ElementsProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di):void
    {
        $di->setShared('elements', function () {
            return new Elements();
        });
    }
}