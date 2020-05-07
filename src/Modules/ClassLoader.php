<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
namespace MikoPBX\Modules;

use Phalcon\Di;
use Phalcon\Loader;

class ClassLoader
{
    public static function init() :void
    {
        $config = Di::getDefault()->getConfig();
        $loader = new Loader();
        $arDirs = [];
        /**
         * We're a registering a set of directories taken from the configuration file
         */

        $arNameSpaces = [
            'Modules' => [
                $config->path('core.modulesDir'),
            ],
        ];

        $results = glob($config->path('core.modulesDir') . '*/*/{controllers,forms}', GLOB_BRACE);
        foreach ($results as $path) {
            $arDirs[] = $path;
        }

        $results = glob($config->path('core.modulesDir') . '*/{setup}', GLOB_BRACE);
        foreach ($results as $path) {
            $arDirs[] = $path;
        }
        $loader->registerNamespaces($arNameSpaces, true);
        $loader->registerDirs($arDirs, true);
        $loader->register();
    }
}