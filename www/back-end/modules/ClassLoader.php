<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
namespace Modules;

use Phalcon\Loader;

class ClassLoader
{
    public function __construct($config)
    {
        $loader = new Loader();
        $arDirs = [];
        /**
         * We're a registering a set of directories taken from the configuration file
         */

        $arNameSpaces = [
            'Modules' => [
                $config->application->modulesDir,
                $config->application->modulesBaseDir
            ],
        ];

        $results = glob( $config->application->modulesDir . '*/*/{controllers,forms}', GLOB_BRACE );
        foreach ( $results as $path ) {
            $arDirs[] = $path;
        }

        $results = glob( $config->application->modulesDir . '*/{setup}', GLOB_BRACE );
        foreach ( $results as $path ) {
            $arDirs[] = $path;
        }
        $arrFiles[] = $config->application->backendDir.'modules/DiServicesInstall.php';
        $loader->registerFiles($arrFiles, true);
        $loader->registerNamespaces($arNameSpaces,true);
        $loader->registerDirs( $arDirs,true );
        $loader->register();
    }
}