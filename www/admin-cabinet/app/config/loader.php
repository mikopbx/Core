<?php

use Phalcon\Loader;

$loader = new Loader();


/**
 * We're a registering a set of directories taken from the configuration file
 */

$arNameSpaces = [
	 'Models'  => $config->application->modelsDir,
	 'Modules' => [
	     $config->application->modulesDir,
         $config->application->modulesBaseDir
     ],
];

$arDirs = [
	$config->application->controllersDir,
	$config->application->pluginsDir,
	$config->application->libraryDir,
	$config->application->modelsDir,
	$config->application->formsDir,
];

$results = glob( $config->application->modulesDir . '*/*/{controllers,forms}', GLOB_BRACE );
foreach ( $results as $path ) {
	$arDirs[] = $path;
}

$results = glob( $config->application->modulesDir . '*/{setup}', GLOB_BRACE );
foreach ( $results as $path ) {
    $arDirs[] = $path;
}

// $arrFiles[] = '/etc/inc/Nats/autoloader.php';

$arrFiles[] = $config->application->backendDir.'library/vendor/autoload.php';
$loader->registerFiles($arrFiles);
$loader->registerNamespaces($arNameSpaces);
$loader->registerDirs( $arDirs );
$loader->register();