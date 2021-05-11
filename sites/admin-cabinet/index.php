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

namespace MikoPBX\AdminCabinet;

use MikoPBX\AdminCabinet\Config\RegisterDIServices;
use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Application;
use MikoPBX\Core\System\SentryErrorLogger;
use MikoPBX\AdminCabinet\Utilities\Debug\PhpError;
use Throwable;
use Whoops\Handler\JsonResponseHandler;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;

$di = new FactoryDefault();

/**
 * Auto-loader configuration
 */
require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';

/**
 * Load application services
 *
 */
RegisterDIServices::init($di);

// Attach Sentry error logger
$errorLogger = new SentryErrorLogger('admin-cabinet');
$errorLogger->init();

// Enable Whoops error pretty print
$is_ajax = 'xmlhttprequest' == strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
if ($is_ajax) {
    $whoopsClass = JsonResponseHandler::class;
} else {
    $whoopsClass = PrettyPageHandler::class;
}

if (class_exists($whoopsClass)) {
    $whoops = new Run();
    $whoops->pushHandler(new $whoopsClass());
    $whoops->register();
}

try {
    $application = new Application($di);
    echo $application->handle($_SERVER['REQUEST_URI'])->getContent();
} catch (Throwable $e) {
    $errorLogger->captureException($e);
    PhpError::exceptionHandler($e);

    if (class_exists($whoopsClass)) {
        $whoops->handleException($e);
    } else {
        echo $e->getMessage();
    }
}