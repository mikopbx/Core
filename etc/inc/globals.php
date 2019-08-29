<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2018
 */

/*
	Различные глобальные переменные. 
*/

use Phalcon\Cache\Backend\File;
use Phalcon\Cache\Frontend\Data;
use Phalcon\Events\Manager;
use Phalcon\Loader;
use \Phalcon\Logger;
use \Phalcon\Logger\Adapter\File as FileLogger;
use \Phalcon\Translate\Adapter\NativeArray;

$g = array(
	"cf_path" 			=> "/cf",
	"pt1c_db_path" 		=> "/cf/conf/mikopbx.db",
	"pt1c_pbx_name" 	=> "mikopbx",
	"pt1c_pbx_name_kind"=> "MIKO PBX",
	"pt1c_run_path" 	=> "/var/run",
	"pt1c_etc_path" 	=> "/etc",
	"pt1c_inc_path" 	=> "/etc/inc",
	"pt1c_cdr_db_path" 	=> "/tmp/cdr.db",
	"debug" 			=> FALSE,
	"varetc_path" 		=> "/var/etc",
	"vardb_path"  		=> "/var/db",
	"varlog_path" 		=> "/var/log",
	"tmp_path" 			=> "/tmp",
	"conf_path" 		=> "/conf",
	"www_path" 			=> "/usr/www",
	"platform" 			=> "Generic (x64)",
	"booting"			=> FALSE
);

// Подключаем дополнительные модули.
require_once("system.php");
require_once("util.php");
require_once("network.php");
require_once("verify.php");
require_once("storage.php");
require_once("config.php");
require_once("pbx.php");
require_once("firewall.php");
require_once("extensions.php");
require_once("cdr.php");
require_once("astdb.php");
require_once("notifications.php");
require_once("Backup.php");
require_once("SentryErrorLogger.php");


// Инициализация для консольного приложения.
if( 'cli' == php_sapi_name() || defined('ISPBXCORESERVICES')){
    /**
     * @param \Phalcon\Di\FactoryDefault $m_di
     * @param array $config
     */
    function init_db(&$m_di, $config){
        $m_di->remove('db');
        $m_di->remove('dbCDR');
        $m_di->remove('dbLog');

        $m_di->set('db', function() use ($config) {
            $db_class = '\Phalcon\Db\Adapter\Pdo\\'.$config['database']['adapter'];
            $connection= new $db_class(array("dbname" => $config['database']['dbfile']));
            return $connection;
        });
        // Asterisk CDR Database connection.
        $m_di->set('dbCDR', function() use ($config){
            $dbclass = 'Phalcon\Db\Adapter\Pdo\\'.$config['cdrdatabase']['adapter'];

            /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
            $connection = new $dbclass(array(
                "dbname" => $config['cdrdatabase']['dbfile']
            ));
            if (is_file('/tmp/debug')) {
                $logpath = Cdr::getPathtoLog();
                $logger  = new FileLogger($logpath);
                $eventsManager = new Manager();
                // Слушаем все события базы данных
                $eventsManager->attach('db', function ($event, $connection) use ($logger) {
                    if ($event->getType() == 'beforeQuery') {
                        $logger->log($connection->getSQLStatement(), Logger::SPECIAL);
                    }
                });

                // Назначаем EventsManager экземпляру адаптера базы данных
                $connection->setEventsManager($eventsManager);
            }
            return $connection;
        });
        $m_di->set('dbLog', function() use ($config){
            $dbclass = 'Phalcon\Db\Adapter\Pdo\\'.$config['logdatabase']['adapter'];
            $connection= new $dbclass(array(
                "dbname" => $config['logdatabase']['dbfile']
            ));
            return $connection;
        });
    }
    function init_loader(&$g, $config){
        $dirScripts = [
            $config['application']['modelsDir'],    // Модели, для работы с настройками.
            $g['pt1c_inc_path'].'/std_modules',     // Генератор конфигов.
            // $g['pt1c_inc_path'].'/custom_modules',  // Генератор конфигов.
            $g['pt1c_inc_path'],
        ];

        $nameSpaces     = [
            'Models'  => $config['application']['modelsDir'],
            'Modules' => [
                $config['application']['modulesDir'],
                $config['application']['modulesBaseDir']
            ],
        ];
        $libraryFiles = [
            $config['application']['backendDir'].'library/vendor/autoload.php' // Sentry - cloud error logger
        ];
        $m_loader = new Loader();
        $m_loader->registerNamespaces($nameSpaces);
        $m_loader->registerDirs($dirScripts);
		$m_loader->registerFiles($libraryFiles);
        $m_loader->register();
        $g['m_loader'] = $m_loader;
    }
    /// ************************************************************************************
    // Параметры для. Phalcon. // Start
    /// ************
    // подключение файла phalcon_settings.php обнуляет $m_loader и $m_di
    $phalcon_settings     = include 'phalcon_settings.php';
    init_loader($g, $phalcon_settings);

    // Регистрируем автозагрузчик, и скажем ему, чтобы зарегистрировал каталог задач
    $m_di 	= new Phalcon\DI\FactoryDefault();
    $m_di->set('config', new \Phalcon\Config($phalcon_settings));
    // Настройки подключения к базе данных.
    init_db($m_di, $phalcon_settings);

    /**
     * Register the translation service
     */
    $m_di->setShared('translation', function() use ($phalcon_settings,$m_di){
        return new NativeArray(
            array(
                'content' => $m_di->getMessages()
            )
        );
    });

    /**
     * Кеш для контроллеров.
     */
    $m_di->set('managedCache', function () use ($phalcon_settings) {
        $frontCache = new Data( ['lifetime' => 3600]);
        $cache = new File( $frontCache, [
                'cacheDir' => $phalcon_settings['application']['cacheDir'],
            ]
        );
        return $cache;
    }
    );

    /**
     * Register the translation service
     */
    $m_di->setShared('messages', function() use ($phalcon_settings, $g){
        $messages=[];
        $language='en-en';
        if(file_exists($g['pt1c_db_path'])){
            try{
                $conf = new Config();
                $language = $conf->get_general_settings('PBXLanguage');
            }catch (Exception $e){
            }
        }
        if (file_exists("/etc/inc/messages/{$language}.php")) {
            require "/etc/inc/messages/{$language}.php";
        } else {
            require "/etc/inc/messages/en-en.php";
        }
        return  $messages;
    });

    if(!defined('ISPBXCORESERVICES')){
        $cli_translation = $m_di->getTranslation();
        $g['cli_translation']    = $cli_translation;
        $g['pt1c_pbx_name_kind'] = Util::translate("MIKO_PBX");
    }
    $g['m_di'] = &$m_di;
    $g['phalcon_settings'] = &$phalcon_settings;
    /// ************
    // Параметры для. Phalcon. // End
    /// ************************************************************************************

    if(is_file('/etc/localtime')){
        System::php_timezone_configure();
    }

    /**
	 * Логирование ошибок в облако
	 */
	if(defined('ISPBXCORESERVICES')){
		$errorLogger = new SentryErrorLogger('pbx-core-api');
	} else {
		$errorLogger = new SentryErrorLogger('pbx-core-workers');
	}
	$errorLogger->init();
	$g['error_logger']=&$errorLogger;

}