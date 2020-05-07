<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);

namespace MikoPBX\Core\Config;

use Phalcon\Loader;
use function MikoPBX\Common\Config\appPath;

class ClassLoader
{
    public static function init():void
    {
        require __DIR__ . '/../../Common/Config/functions.php';
        require appPath('vendor/autoload.php');

        // $libraryFiles = [
        //     // Sentry - cloud error logger
        //     // PHPMailer
        //     // Nats client
        //     // CLI menu php-school
        //     // Pheanstalk queue client
        //     // MikoPBX
        //     '/usr/www/vendor/autoload.php',
        // ];
        //
        // $m_loader = new Loader();
        // $m_loader->registerFiles($libraryFiles);
        // $m_loader->register();
    }

}