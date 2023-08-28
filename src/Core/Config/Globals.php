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

/**
 * This script is used for CLI only.
 */

declare(strict_types=1);
namespace MikoPBX\Core\Config;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use Phalcon\Di\FactoryDefault\Cli;

if (PHP_SAPI !== "cli") {
    // This script is only for CLI.
    return;
}


// Initialize dependency injector
$di = new Cli();

// Register classes, namespaces, additional libraries with lazy load
require_once __DIR__ . '/../../../src/Common/Config/ClassLoader.php';

RegisterDIServices::init();
