<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */
use MikoPBX\Core\Config\{
    ClassLoader,
    RegisterDIServices
};
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\SentryErrorLogger;
use MikoPBX\Modules\ClassLoader as ModulesClassLoader;
use Phalcon\Di\FactoryDefault\Cli;

// We will not use globals for something instead of Cli or Core services
if( 'cli' !== php_sapi_name()){
    return;
}
    // Initialize dependency injector
    $di 	= new Cli();

    // Register classes, namespaces, additional libraries
    require_once 'ClassLoader.php';
    ClassLoader::init();

    $di->register(new ConfigProvider());

    // Register classes, namespaces, additional libraries from custom modules
    ModulesClassLoader::init();


    // Initialize sentry error logger
    $errorLogger = new SentryErrorLogger('pbx-core-workers');
    $errorLogger->init();

    RegisterDIServices::init();

    // Setup timezone
    // if(is_file('/etc/localtime')){
    //      System::phpTimeZoneConfigure(); //TODO:: Это надо один раз при загрузке системы?
    // }

