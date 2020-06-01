<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);

namespace MikoPBX\Common\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di;
use Phalcon\Loader;
use function MikoPBX\Common\Config\appPath;

class ClassLoader
{
    public static function init(): void
    {
        require __DIR__ . '/functions.php';
        require appPath('vendor/autoload.php');

        $di = Di::getDefault();
        if ($di !== null) {
            $di->register(new ConfigProvider());
        }

        $libraryFiles = [
            // Sentry - cloud error logger
            // PHPMailer
            // Nats client
            // CLI menu php-school
            // Pheanstalk queue client
            // MikoPBX
            appPath('vendor/autoload.php'),
        ];

        $modulesDir = $di->getConfig()->path('core.modulesDir');
        $nameSpaces = [
            'Modules' => $modulesDir,
        ];

        $loader = new Loader();
        $loader->registerFiles($libraryFiles);
        $loader->registerNamespaces($nameSpaces);
        $loader->register();


        // $loader = new Loader();
        // $arDirs = [];
        // /**
        //  * We're a registering a set of directories taken from the configuration file
        //  */
        //
        // $arNameSpaces = [
        //     'Modules' => [
        //         $config->path('core.modulesDir'),
        //     ],
        // ];
        //
        // $results = glob($config->path('core.modulesDir') . '/*/*/{controllers,forms}', GLOB_BRACE);
        // foreach ($results as $path) {
        //     $arDirs[] = $path;
        // }
        //
        // $results = glob($config->path('core.modulesDir') . '/*/{setup}', GLOB_BRACE);
        // foreach ($results as $path) {
        //     $arDirs[] = $path;
        // }
        // $loader->registerNamespaces($arNameSpaces, true);
        // $loader->registerDirs($arDirs, true);
        // $loader->register();

    }

}

ClassLoader::init();