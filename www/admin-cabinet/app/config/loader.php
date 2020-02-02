<?php

use Phalcon\Loader;
use Modules\ClassLoader as ModulesClassLoader;

$loader = new Loader();

/**
 * We're a registering a set of directories taken from the configuration file
 */

$arNameSpaces = [
	 'Models'  => $config->application->modelsDir,
];

$arDirs = [
	$config->application->controllersDir,
	$config->application->pluginsDir,
	$config->application->libraryDir,
	$config->application->modelsDir,
	$config->application->formsDir,
];

$arrFiles[] = $config->application->backendDir.'modules/ClassLoader.php';
$arrFiles[] = $config->application->backendDir.'library/vendor/autoload.php';
$loader->registerFiles($arrFiles);
$loader->registerNamespaces($arNameSpaces);
$loader->registerDirs( $arDirs );
$loader->register();

// Зарегаем классы модулей
$modulesClasses = new ModulesClassLoader($config);

