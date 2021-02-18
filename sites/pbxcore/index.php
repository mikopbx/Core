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

namespace MikoPBX\PbxCore;
use MikoPBX\PBXCoreREST\Config\{RegisterDIServices};
use Phalcon\Di\FactoryDefault;
use Throwable;
use MikoPBX\Core\System\{SentryErrorLogger};
use Phalcon\Mvc\Micro;


// Create Dependency injector
$di = new FactoryDefault();

// Auto-loader configuration
require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';

// Attach Sentry error logger
$errorLogger = new SentryErrorLogger('pbx-core-rest');
$errorLogger->init();

// Start application
try {
    $application = new Micro();
    $application->setDI($di);
    $di->setShared('application', $application);
    //Load application services
    RegisterDIServices::init($di);
    $application->handle($_SERVER['REQUEST_URI']);
} catch (Throwable $e) {
    $errorLogger->captureException($e);
    echo $e->getMessage();
}


