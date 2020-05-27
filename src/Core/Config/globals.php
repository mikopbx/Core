<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2020
 */

use MikoPBX\Core\Config\RegisterDIServices;
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

// Setup timezone
//if(file_exists('/etc/localtime')){
//    // TODO Это нужно выполнять при запуске скрипта php.
//    // В идеале, в php-ini прописать таймзону - тогда с тайм зоной проблемы не будет и вызывать не потребуется.
//    MikoPBX\Core\System\System::phpTimeZoneConfigure();
//}

