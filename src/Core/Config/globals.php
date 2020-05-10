<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
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

// Setup timezone //TODO:: Это надо один раз при загрузке системы?
// if(is_file('/etc/localtime')){
//      System::phpTimeZoneConfigure();
// }

