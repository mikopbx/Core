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
use MikoPBX\AdminCabinet\Config\ClassLoader;

$di = new FactoryDefault();

/**
 * Auto-loader configuration
 */
require_once __DIR__ . '/../../../src/AdminCabinet/Config/ClassLoader.php';
ClassLoader::init($di);

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
try {
    $application = new Application($di);
    $uri = str_replace($_SERVER['SCRIPT_NAME'], '', $_SERVER['REQUEST_URI']);
	echo $application->handle($_SERVER['REQUEST_URI'])->getContent();
} catch (Exception $e) {
	$errorLogger->captureException($e);
	PhpError::exceptionHandler($e);
	echo $e->getMessage();
}