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
use Phalcon\Mvc\View\Engine\Volt as VoltEngine;

class VoltProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $view      = $di->getShared('view');
        $appConfig = $di->getShared('config')->adminApplication;
        $di->setShared(
            'volt',
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

                return $volt;
            }
        );
    }
}