<?php

use Phalcon\Loader;

$loader = new Loader();


/**
 * We're a registering a set of directories taken from the configuration file
 */
 
 $loader->registerNamespaces(array(
	 'Models'  => $config->application->modelsDir,
	 'Modules' => $config->application->modulesDir,
 ));

$arDirs = [
	$config->application->controllersDir,
	$config->application->pluginsDir,
	$config->application->libraryDir,
	$config->application->modelsDir,
	$config->application->formsDir,
];

$results = glob( $config->application->modulesDir
                 . "*/*/{controllers,forms}", GLOB_BRACE );
foreach ( $results as $path ) {
	$arDirs[] = $path;
};

$loader->registerDirs( $arDirs );
$loader->registerFiles([$config->application->backendDir.'library/vendor/autoload.php']);
$loader->register();