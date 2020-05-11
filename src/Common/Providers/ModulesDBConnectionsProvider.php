<?php

declare(strict_types=1);
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */
namespace MikoPBX\Common\Providers;


use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager;
use Phalcon\Text;


/**
 * Class ModulesDBConnectionsProvider
 * Add to DI modules DB as sqlite3 connections
 *
 * @package Modules
 */
class ModulesDBConnectionsProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    /**
     * DiServicesInstall constructor
     *
     * @param $di - link to app dependency injector
     */
    public function register(DiInterface $di): void
    {
        $registeredDBServices = [];
        $config               = $di->getShared('config');
        // Зарегистрируем сервисы базы данных для модулей расширений
        $results = glob($config->path('core.modulesDir') . '/*/db/*.db', GLOB_NOSORT);
        foreach ($results as $file) {
            $moduleName = self::findModuleIdByDbPath($file, $config->path('core.modulesDir'));
            $service_name  = self::makeServiceName($file, $moduleName);

            $registeredDBServices[] = $service_name;
            if ($di->has($service_name)){
                $di->remove($service_name);
            }
            $config= ["debugMode"    => $config->path('core.debugMode'),
                      "adapter"      => "Sqlite",
                      "dbfile"       => $file,
                      "debugLogFile" => "{$config->path('core.logsPath')}/$moduleName/db/queries.log"
            ];

            $this->registerDBService($service_name, $di, $config);
        }

        // Register transactions events
        $mainConnection = $di->getShared('db');

        $eventsManager = $mainConnection->getEventsManager();
        if ($eventsManager === null) {
            $eventsManager = new Manager();
        }
        // Слушаем все события базы данных
        $eventsManager->attach(
            'db',
            function ($event) use ($registeredDBServices, $di) {
                switch ($event->getType()) {
                    case 'beginTransaction':
                    {
                        foreach ($registeredDBServices as $service) {
                            $di->get($service)->begin();
                        }
                        break;
                    }
                    case 'commitTransaction':
                    {
                        foreach ($registeredDBServices as $service) {
                            $di->get($service)->commit();
                        }
                        break;
                    }
                    case 'rollbackTransaction':
                    {
                        foreach ($registeredDBServices as $service) {
                            $di->get($service)->rollback();
                        }
                        break;
                    }
                    default:
                }
            }
        );
        // Назначаем EventsManager экземпляру адаптера базы данных
        $mainConnection->setEventsManager($eventsManager);
    }

    /**
     * Create DI service name for database connection
     *
     * @param $filePath
     *
     * @param $moduleName
     *
     * @return string - service name for dependency injection
     */
    private static function makeServiceName($filePath, $moduleName): string
    {
        $dbName     = pathinfo($filePath)['filename'];

        return $moduleName . '_' . Text::uncamelize($dbName, '_') . '_db';
    }

    /**
     * Find ModuleId from Path
     *
     * @param $filePath
     *
     * @return string - module ID
     */
    private static function findModuleIdByDbPath($filePath, $modulesRoot): string
    {
        $filePath = str_replace($modulesRoot, '', $filePath);

       // return implode('/', array_slice(explode('/', $filePath), 0, 1));
        return explode('/', $filePath)[1];
    }
}


