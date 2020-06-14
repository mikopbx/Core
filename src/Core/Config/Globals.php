<?php
declare(strict_types=1);
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2020
 */
namespace MikoPBX\Core\Config;

use MikoPBX\Core\System\SentryErrorLogger;
use Phalcon\Di\FactoryDefault\Cli;


// Initialize dependency injector
$di = new Cli();

// Register classes, namespaces, additional libraries with lazzy load
require_once __DIR__ . '/../../../src/Common/Config/ClassLoader.php';

// Initialize sentry error logger
$errorLogger = new SentryErrorLogger('pbx-core-workers');
$errorLogger->init();

RegisterDIServices::init();

