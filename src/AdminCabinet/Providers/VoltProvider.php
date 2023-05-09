<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\View\Engine\Volt as VoltEngine;

class VoltProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'volt';

    /**
     * Register volt service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $view      = $di->getShared('view');
        $appConfig = $di->getShared('config')->adminApplication;
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($view, $di, $appConfig) {
                $voltCacheDir = $appConfig->voltCacheDir . '/';
                $volt         = new VoltEngine($view, $di);
                $volt->setOptions(
                    [
                        'path' => $voltCacheDir,
                    ]
                );

                $compiler = $volt->getCompiler();
                $compiler->addFunction('in_array', 'in_array');

                if ($appConfig->debugMode === true) {
                    $cacheFiles = glob($appConfig->voltCacheDir . '/*.php');
                    if ($cacheFiles!==false){
                        array_map(
                            'unlink',
                            $cacheFiles
                        );
                    }
                    $volt->setOptions(
                        [
                            'compileAlways' => true,
                        ]
                    );
                }

                // Allows use isAllowed within volt templates
                $compiler->addFunction(
                    'isAllowed',
                    function ($action, $controller='') use ($view) {
                        if (empty($controller)){
                            $controller = $view->getControllerName();
                        }
                        return '$this->di->get("'.SecurityPluginProvider::SERVICE_NAME.'",["' . $controller . '",' . $action . '])';
                    }
                );

                return $volt;
            }
        );
    }
}