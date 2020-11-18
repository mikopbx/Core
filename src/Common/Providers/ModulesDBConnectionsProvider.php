<?php

declare(strict_types=1);
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */
namespace MikoPBX\Common\Providers;


use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager;
use ReflectionClass;
use ReflectionException;


/**
 * Class ModulesDBConnectionsProvider
 * Add to DI modules DB as sqlite3 connections
 *
 * @package Modules
 */
class ModulesDBConnectionsProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const SERVICE_NAME = '';
    /**
     * DiServicesInstall constructor
     *
     * @param $di DiInterface link to app dependency injector
     *
     */
    public function register(DiInterface $di): void
    {
        $registeredDBServices = [];
        $config               = $di->getShared('config');
        $modulesDir           = $config->path('core.modulesDir');

        $results = glob($modulesDir . '/*/module.json', GLOB_NOSORT);

        foreach ($results as $moduleJson) {
            $jsonString            = file_get_contents($moduleJson);
            if ($jsonString === false){
                continue;
            }
            $jsonModuleDescription = json_decode($jsonString, true);
            if ( ! is_array($jsonModuleDescription)
                || !array_key_exists('moduleUniqueID', $jsonModuleDescription)) {
                continue;
            }

            $moduleUniqueId = $jsonModuleDescription['moduleUniqueID'];
            if ( ! isset($moduleUniqueId)) {
                continue;
            }

            $modelsFiles = glob("{$modulesDir}/{$moduleUniqueId}/Models/*.php", GLOB_NOSORT);
            foreach ($modelsFiles as $file) {
                $className        = pathinfo($file)['filename'];
                $moduleModelClass = "\\Modules\\{$moduleUniqueId}\\Models\\{$className}";

                // Test whether this class abstract or not
                try {
                    $reflection = new ReflectionClass($moduleModelClass);
                    if ($reflection->isAbstract()) {
                        continue;
                    }
                } catch (ReflectionException $exception) {
                    continue;
                }

                if (
                    ! class_exists($moduleModelClass)
                    || count(get_class_vars($moduleModelClass)) === 0) {
                    continue;
                }

                $model                 = new $moduleModelClass();
                $connectionServiceName = $model->getReadConnectionService();
                if ( ! isset($connectionServiceName)) {
                    continue;
                }
                $registeredDBServices[] = $connectionServiceName;
                if ($di->has($connectionServiceName)) {
                    $di->remove($connectionServiceName);
                }

                // Create and connect database
                $dbDir = "{$config->path('core.modulesDir')}/{$moduleUniqueId}/db";
                if (!file_exists($dbDir)){
                    Util::mwMkdir($dbDir, true);
                }
                $dbFileName = "{$dbDir}/module.db";
                $dbFileExistBeforeAttachToConnection = file_exists($dbFileName);

                // Log
                $logDir = "{$config->path('core.logsDir')}/$moduleUniqueId/db";
                $logFileName = "{$logDir}/queries.log";
                if (!is_dir($logDir)){
                    Util::mwMkdir($logDir, true);
                    $touchPath = Util::which('touch');
                    Processes::mwExec("{$touchPath} {$logFileName}");
                    Util::addRegularWWWRights($logDir);
                }

                $params = [
                    "debugMode"    => $config->path('modulesDatabases.debugMode'),
                    "adapter"      => "Sqlite",
                    "dbfile"       => $dbFileName,
                    "debugLogFile" => $logFileName,
                ];

                $this->registerDBService($connectionServiceName, $di, $params);

                // if database was created, we have to apply rules
                if (!$dbFileExistBeforeAttachToConnection){
                    Util::addRegularWWWRights($dbDir);
                }
            }
        }

        // Register transactions events
        $mainConnection = $di->getShared('db');

        $eventsManager = $mainConnection->getEventsManager();
        if ($eventsManager === null) {
            $eventsManager = new Manager();
        }
        // Attach all created connections to one transaction manager
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

}


