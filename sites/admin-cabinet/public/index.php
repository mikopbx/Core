<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet;
use MikoPBX\AdminCabinet\Config\RegisterDIServices;
use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Application;
use MikoPBX\Core\System\SentryErrorLogger;
use Phalcon\Exception;
use MikoPBX\AdminCabinet\Utilities\Debug\PhpError;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;

$di = new FactoryDefault();

/**
 * Auto-loader configuration
 */
require_once __DIR__ . '/../../../src/Common/Config/ClassLoader.php';

/**
 * Load application services
 *
 */
RegisterDIServices::init($di);

// Подключим регистрацию ошибок в облако
$errorLogger = new SentryErrorLogger('admin-cabinet');
$errorLogger->init();

register_shutdown_function([PhpError::class,'runtimeShutdown']);
set_error_handler([PhpError::class,'errorHandler']);

if (class_exists(PrettyPageHandler::class)){
    $whoops = new Run();
    $whoops->pushHandler(new PrettyPageHandler());
    $whoops->register();
}

try {
    $application = new Application($di);
	echo $application->handle($_SERVER['REQUEST_URI'])->getContent();
} catch (Exception $e) {
	$errorLogger->captureException($e);
	PhpError::exceptionHandler($e);
	echo $e->getMessage();
}