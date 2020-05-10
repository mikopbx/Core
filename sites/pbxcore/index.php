<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\PbxCore;
use MikoPBX\Common\Config\ClassLoader;
use MikoPBX\PBXCoreREST\Config\{RegisterDIServices};
use Phalcon\Di\FactoryDefault;
use Phalcon\Exception;
use MikoPBX\Core\System\{SentryErrorLogger, Util};
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
} catch (Exception $e) {
    $errorLogger->captureException($e);
    echo $e->getMessage();
    Util::sysLogMsg('pbx_core_api', $e->getMessage() );
}


