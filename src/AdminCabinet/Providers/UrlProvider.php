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


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Url;

/**
 * The URL component is used to generate all kind of urls in the application
 */
class UrlProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $baseUri = $di->getShared('config')->adminApplication->baseUri;
        $di->setShared(
            'url',
            function () use ($baseUri) {
                $url = new Url();
                $url->setBaseUri($baseUri);

                return $url;
            }
        );
    }
}