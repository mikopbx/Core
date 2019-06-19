<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Phalcon\Config;
use Phalcon\Mvc\Application;
use Utilities\Debug\PhpError;

/**
 * Read the configuration
 */
if (file_exists('/cf/conf/mikopbx.db')) {
	$file    = require 'phalcon_settings.php';
	require_once 'SentryErrorLogger.php';
} else {
	// Fallback to some default
	$file    = require '../../config/Config.php';
	require_once '../../../pbxcore/inc/SentryErrorLogger.php';
}
$config = new Config($file);

/**
 * Auto-loader configuration
 */
require_once '../app/config/loader.php';

// Подключим регистрацию ошибок в облако
$errorLogger = new SentryErrorLogger('admin-cabinet');
$errorLogger->init();

require_once '../../back-end/library/utilities/debug/PhpError.php';
register_shutdown_function(['\Utilities\Debug\PhpError','runtimeShutdown']);
set_error_handler(['\Utilities\Debug\PhpError','errorHandler']);

/**
 * Load application services
 */
require_once '../app/config/services.php';
try {
	$application = new Application($di);
	echo $application->handle()->getContent();
} catch (Exception $e) {
	$errorLogger->captureException($e);
	PhpError::exceptionHandler($e);
	echo $e->getMessage();
}