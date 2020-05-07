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
use Phalcon\Flash\Session as FlashSession;

/**
 * Register the flash service with custom CSS classes
 */
class FlashProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $di->setShared('flash', function () {
            $cssClasses = [
                'error'   => 'ui negative message',
                'success' => 'ui positive message',
                'notice'  => 'ui info message',
                'warning' => 'ui warning message',
            ];

            $flash = new FlashSession();
            $flash->setCssClasses($cssClasses);
            $flash->setAutoescape(false);

            return $flash;
        });
    }
}