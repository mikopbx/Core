<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Modules\DiServicesInstall;
use Modules\LicenseWorker;
use Phalcon\Cache\Backend\File;
use Phalcon\Cache\Frontend\Data as FrontendData;
use Phalcon\Cache\Frontend\Output;
use Phalcon\DI\FactoryDefault;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Flash\Session as DirectSession;
use Phalcon\Logger;
use Phalcon\Logger\Adapter\File as FileLogger;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\Model\Metadata\Memory;
use Phalcon\Mvc\Model\MetaData\Strategy\Annotations as StrategyAnnotations;
use Phalcon\Mvc\Url as UrlProvider;
use Phalcon\Mvc\View;
use Phalcon\Mvc\View\Engine\Volt as VoltEngine;
use Phalcon\Queue\Beanstalk;
use Phalcon\Session\Adapter\Files as SessionAdapter;
use Phalcon\Translate\Adapter\NativeArray;

/**
 * The FactoryDefault Dependency Injector automatically register the right services providing a full stack framework
 */
$di = new FactoryDefault();


/**
 * Register config
 */
$di->setShared('config', function () use ($config) {
    return $config;
});


/**
 * We register the events manager
 */
$di->setShared('dispatcher', function () use ($config) {
    $eventsManager = new EventsManager;

    /**
     * Camelize Controller name
     */
    $eventsManager->attach('dispatch:beforeDispatch', new NormalizeControllerNamePlugin);
    $eventsManager->attach('dispatch:afterDispatchLoop', new NormalizeControllerNamePlugin);

    /**
     * Check if the user is allowed to access certain action using the SecurityPlugin
     */
    $eventsManager->attach('dispatch:beforeDispatch', new SecurityPlugin);

    /**
     * Handle exceptions and not-found exceptions using NotFoundPlugin
     */
    if ( ! $config->application->debugMode) {
        $eventsManager->attach('dispatch:beforeException',
            new NotFoundPlugin);
    }
    $dispatcher = new Dispatcher;
    $dispatcher->setEventsManager($eventsManager);

    return $dispatcher;
});
/**
 * The URL component is used to generate all kind of urls in the application
 */
$di->set('url', function () use ($config) {
    $url = new UrlProvider();
    $url->setBaseUri('/admin-cabinet/');

    return $url;
});

$di->set('view', function () use ($config) {
    $view = new View();
    $view->setViewsDir($config->application->viewsDir);
    $view->registerEngines([
        '.volt' => 'volt',
    ]);

    return $view;
});
/**
 * Setting up volt
 */
$di->set('volt', function ($view, $di) use ($config) {
    $volt = new VoltEngine($view, $di);
    $volt->setOptions([
        'compiledPath' => $config->application->cacheDir,
    ]);
    $compiler = $volt->getCompiler();
    $compiler->addFunction('in_array', 'in_array');

    if ($config->application->debugMode === true) {
        array_map('unlink',
            glob($config->application->cacheDir . 'volt/*.php'));
        $volt->setOptions([
            'compileAlways' => true,
        ]);
    }

    return $volt;
}, true);


$di->set(
    'viewCache', function () use ($config) {

    //Cache for one day
    $frontCache = new Output([
        'lifetime' => $config->application->debugMode ? 1 : 86400,
    ]);

    //Set file cache
    $cache = new File($frontCache, [
        'cacheDir' => $config->application->cacheDir,
    ]);

    return $cache;
}
);
/**
 * Кеш для контроллеров
 */
$di->set(
    'managedCache', function () use ($config) {

    //Cache for one day
    $frontCache = new FrontendData([
        'lifetime' => 3600,
    ]);

    //Set file cache
    $cache = new File($frontCache, [
        'cacheDir' => $config->application->cacheDir,
    ]);

    return $cache;
}
);


/**
 * If the configuration specify the use of metadata adapter use it or use memory otherwise
 */

$di->set('modelsMetadata', function () {
    $metaData = new Memory([
        'lifetime' => 86400,
        'prefix'   => 'metacache_key',
    ]);
    $metaData->setStrategy(
        new StrategyAnnotations()
    );

    return $metaData;
});


// Set the models cache service
$di->set('modelsCache', function () use ($config) {

    // Cache data for one day by default
    $frontCache = new FrontendData(
        [
            'lifetime' => 86400,
        ]
    );

    //Set file cache
    $cache = new File($frontCache, [
        'cacheDir' => $config->application->modelscacheDir,
    ]);

    return $cache;
});


/**
 * Database connection is created based in the parameters defined in the configuration file
 */
$di->set('db', function () use ($config) {

    $dbclass    = 'Phalcon\Db\Adapter\Pdo\\' . $config->database->adapter;
    $connection = new $dbclass([
        'dbname' => $config->database->dbfile,
    ]);
    $connection->setNestedTransactionsWithSavepoints(true);
    if ($config->application->debugMode) {
        $logpath = $config->application->logDir . 'query-debug.log';

        $logger = new FileLogger($logpath);

        $eventsManager = new EventsManager();
        // Слушаем все события базы данных
        $eventsManager->attach('db', function ($event, $connection) use ($logger) {
            if ($event->getType() === 'beforeQuery') {
                $statement = $connection->getSQLStatement();
                $variables = $connection->getSqlVariables();
                if (is_array($variables)) {
                    foreach ($variables as $variable => $value) {
                        if (is_array($value)) {
                            $value = '(' . implode(', ', $value) . ')';
                        }
                        $variable  = str_replace(':', '', $variable);
                        $statement = str_replace(":$variable", "'$value'", $statement);
                    }
                }
                $logger->log($statement, Logger::SPECIAL);
            }
        });

        // Назначаем EventsManager экземпляру адаптера базы данных
        $connection->setEventsManager($eventsManager);
    }

    return $connection;
});

/**
 * Asterisk CDR Database connection
 */
$di->set('dbCDR', function () use ($config) {


    $dbclass    = 'Phalcon\Db\Adapter\Pdo\\' . $config->cdrdatabase->adapter;
    $connection = new $dbclass([
        'dbname' => $config->cdrdatabase->dbfile,
    ]);

    if ($config->application->debugMode) {
        $logpath = $config->application->logDir . 'query-debug-cdr.log';

        $logger = new FileLogger($logpath);

        $eventsManager = new EventsManager();
        // Слушаем все события базы данных
        $eventsManager->attach('db',
            function ($event, $connection) use ($logger) {
                if ($event->getType() === 'beforeQuery') {
                    $statement = $connection->getSQLStatement();
                    $variables = $connection->getSqlVariables();
                    if (is_array($variables)) {
                        foreach ($variables as $variable => $value) {
                            if (is_array($value)) {
                                $value = '(' . implode(', ', $value) . ')';
                            }
                            $variable  = str_replace(':', '', $variable);
                            $statement = str_replace(":$variable", "'$value'", $statement);
                        }
                    }
                    $logger->log($statement, Logger::SPECIAL);
                }
            });

        // Назначаем EventsManager экземпляру адаптера базы данных
        $connection->setEventsManager($eventsManager);
    }

    return $connection;
});


/**
 * Register Benstalk
 */
$di->setShared('queueModelsEvents', function () use ($config) {
    $tube  = 'models_events';
    $queue = new Beanstalk(
        [
            'host' => $config->beanstalk->host,
            'port' => $config->beanstalk->port,
            'tube' => $tube,
        ]
    );
    $queue->connect();
    $queue->ignore('default');
    $queue->choose($tube);

    return $queue;
});


/**
 * Start the session the first time some component request the session service
 */
$di->setShared('session', function () {
    $session = new SessionAdapter();
    $session->start();

    return $session;
});

/**
 * Read only session for AJAX requests
 */
$di->setShared('sessionRO', function () {
    if ( ! is_array($_COOKIE) || ! array_key_exists(session_name(), $_COOKIE)) {
        return null;
    }
    $session_name = preg_replace('/[^\da-z]/i', '', $_COOKIE[session_name()]);
    $session_file = session_save_path() . '/sess_' . $session_name;
    if ( ! file_exists($session_file)) {
        return null;
    }

    $session_data = file_get_contents($session_file);

    $return_data = [];
    $offset      = 0;
    while ($offset < strlen($session_data)) {
        if (false === strpos(substr($session_data, $offset), '|')) {
            break;
        }
        $pos                   = strpos($session_data, '|', $offset);
        $num                   = $pos - $offset;
        $varname               = substr($session_data, $offset, $num);
        $offset                += $num + 1;
        $data                  = unserialize(substr($session_data, $offset), ['allowed_classes' => false]);
        $return_data[$varname] = $data;
        $offset                += strlen(serialize($data));
    }
    $_SESSION = $return_data;

    return $return_data;
});

/**
 * Register the flash service with custom CSS classes
 */
$di->setShared('flash', function () {
    $flash = new DirectSession([
        'error'   => 'ui negative message',
        'warning' => 'ui warning message',
        'success' => 'ui positive message',
        'notice'  => 'ui info message',
    ]);

    $flash->setAutoescape(false);

    return $flash;
});

/**
 * Register the translation service
 */
$di->setShared('translation', function () use ($di) {
    // Return a translation object
    return new NativeArray(
        [
            'content' => $di->getMessages(),
        ]
    );
});

/**
 * Register current language difinition
 */
$di->setShared('language', function () {
    $roSession = $this->get('sessionRO');
    if ($roSession !== null && array_key_exists('auth', $roSession)) {
        $language = $roSession['auth']['lang'];
    } elseif (array_key_exists('HTTP_ACCEPT_LANGUAGE', $_SERVER)) {
        $lang       = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
        $acceptLang = ['ru', 'en', 'de'];
        $language   = in_array($lang, $acceptLang) ? $lang : 'en';
    } else {
        $language = 'en';
    }

    return $language;
});

/**
 * Register the translation service
 */
$di->setShared('messages', function () use ($config, $di) {
    $language = $di->getLanguage();
    $messages = [];
    // Заглянем сначала в кеш переводов
    $session  = $this->get('session');
    $cacheKey = false;
    if ($session !== null && $session->has('versionHash')) {
        $cacheKey = 'LocalisationArray' . $session->get('versionHash') . $language . '.php';
    }
    if ($cacheKey) {
        $translates = $this->get('managedCache')->get($cacheKey, 3600);
        if ( ! empty($translates)) {
            return $translates;
        }
    }

    $translates = [];
    // Возьмем английский интерфейс
    $enFilePath = "{$config->application->backendDir}messages/en.php";
    if (file_exists($enFilePath)) {
        $translates = require $enFilePath;
    }


    if ($language !== 'en') {
        $additionalTranslates = [];
        // Check if we have a translation file for that lang
        $langFile = "{$config->application->backendDir}messages/{$language}.php";
        if (file_exists($langFile)) {
            $additionalTranslates = require $langFile;
        }
        // Заменим английские переводы на выбранный админом язык
        if ($additionalTranslates !== [[]]) {
            $translates = array_merge($translates, $additionalTranslates);
        }
    }

    // Возьмем английский перевод расширений
    $extensionsTranslates = [[]];
    $results              = glob($config->application->modulesDir . '*/{messages}/en.php', GLOB_BRACE);
    foreach ($results as $path) {
        $langArr = require $path;
        if (is_array($langArr)) {
            $extensionsTranslates[] = $langArr;
        } else {
            $extensionsTranslates[] = $messages; // Поддержка старых модулей
        }
    }
    if ($extensionsTranslates !== [[]]) {
        $translates = array_merge($translates, ...$extensionsTranslates);
    }
    if ($language !== 'en') {
        $additionalTranslates = [[]];
        $results              = glob($config->application->modulesDir . "*/{messages}/{$language}.php", GLOB_BRACE);
        foreach ($results as $path) {
            $langArr = require $path;
            if (is_array($langArr)) {
                $additionalTranslates[] = $langArr;
            } else {
                $additionalTranslates[] = $messages; // Поддержка старых модулей
            }
        }
        if ($additionalTranslates !== [[]]) {
            $translates = array_merge($translates, ...$additionalTranslates);
        }
    }
    if ($cacheKey) {
        $this->get('managedCache')->save($cacheKey, $translates);
    }

    // Return a translation object
    return $translates;
});


/**
 * Register a user component
 */
$di->setShared('elements', function () {
    return new Elements();
});

/**
 * Регистрация папки для хранения файлов записи
 */
$di->setShared('mediaFolder', function () use ($config) {
    return $config->application->mediaDir;
});

/**
 * Регистрация папки для хранения модулей
 */
$di->setShared('modulesDir', function () use ($config) {
    return $config->application->modulesDir;
});

/**
 * Сервис работы с лицензированием
 */
$di->setShared('licenseWorker', function () use ($config) {
    if ($config->application->debugMode) {
        $serverUrl = 'http://172.16.32.72:8223';
    } else {
        $serverUrl = 'http://127.0.0.1:8223';
    }

    return new LicenseWorker($serverUrl);
});

AdditionalAssets::Register($di);
DiServicesInstall::Register($di);