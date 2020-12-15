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
namespace MikoPBX\Core\Config;

use MikoPBX\Core\System\SentryErrorLogger;
use Phalcon\Di\FactoryDefault\Cli;

if(PHP_SAPI !== "cli"){
    // Этот скрипт только для CLI.
    return;
}
// Initialize dependency injector
$di = new Cli();

// Register classes, namespaces, additional libraries with lazzy load
require_once __DIR__ . '/../../../src/Common/Config/ClassLoader.php';

// Initialize sentry error logger
$errorLogger = new SentryErrorLogger('pbx-core-workers');
$errorLogger->init();

RegisterDIServices::init();

