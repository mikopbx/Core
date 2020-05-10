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

/**
 * The URL component is used to generate all kind of urls in the application
 */
class ViewProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $viewsDir = $di->getShared('config')->path('adminApplication.viewsDir');
        $di->setShared(
            'view',
            function () use ($viewsDir) {
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