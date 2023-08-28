<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Common\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di;
use Phalcon\Loader;
use function MikoPBX\Common\Config\appPath;

class ClassLoader
{
    /**
     * Initialize the application.
     */
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

        $modulesDir = $di->getShared('config')->path('core.modulesDir');
        $nameSpaces = [
            'Modules' => $modulesDir,
        ];

        $loader = new Loader();
        $loader->registerFiles($libraryFiles);

        $loader->registerNamespaces($nameSpaces);
        $loader->register();
    }

}

ClassLoader::init();