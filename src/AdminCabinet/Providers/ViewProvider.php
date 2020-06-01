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
use Phalcon\Mvc\View;
use function MikoPBX\Common\Config\appPath;

/**
 * The URL component is used to generate all kind of urls in the application
 */
class ViewProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'view',
            function () {
                $viewsDir = appPath('src/AdminCabinet/Views');
                $view = new View();
                $view->setViewsDir($viewsDir);
                $view->registerEngines(
                    [
                        '.volt' => 'volt',
                    ]
                );

                return $view;
            }
        );
    }
}