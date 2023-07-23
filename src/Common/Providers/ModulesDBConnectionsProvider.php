<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Common\Providers;


use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Models\ModulesModelsBase;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager;
use ReflectionClass;
use ReflectionException;


/**
 * ModulesDBConnectionsProvider is responsible for adding module DB connections to the DI container.
 *
 * @package MikoPBX\Common\Providers
 */
class ModulesDBConnectionsProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const SERVICE_NAME = '';

    /**
     * Register module DB connections service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $registeredDBServices = [];
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        $modulesDir = $config->path('core.modulesDir');

        $results = glob($modulesDir . '/*/module.json', GLOB_NOSORT);

        foreach ($results as $moduleJson) {
            $jsonString = file_get_contents($moduleJson);
            if ($jsonString === false) {
                continue;
            }
            $jsonModuleDescription = json_decode($jsonString, true);
            if (!is_array($jsonModuleDescription)
                || !array_key_exists('moduleUniqueID', $jsonModuleDescription)) {
                continue;
            }

            $moduleUniqueId = $jsonModuleDescription['moduleUniqueID'];
            if (!isset($moduleUniqueId)) {
                continue;
            }

            $modelsFiles = glob("{$modulesDir}/{$moduleUniqueId}/Models/*.php", GLOB_NOSORT);
            foreach ($modelsFiles as $file) {
                $className = pathinfo($file)['filename'];
                $moduleModelClass = "Modules\\{$moduleUniqueId}\\Models\\{$className}";

                // Test whether this class abstract or not
                try {
                    $reflection = new ReflectionClass($moduleModelClass);
                    if ($reflection->isAbstract()) {
                        continue;
                    }
                } catch (ReflectionException $exception) {
                    continue;
                }

                if (!class_exists($moduleModelClass)
                    || count(get_class_vars($moduleModelClass)) === 0) {
                    continue;
                }

                $connectionServiceName = ModulesModelsBase::getConnectionServiceName($moduleUniqueId);
                $registeredDBServices[] = $connectionServiceName;
                if ($di->has($connectionServiceName)) {
                    $di->remove($connectionServiceName);
                }

                // Create and connect database
                $dbDir = "{$config->path('core.modulesDir')}/{$moduleUniqueId}/db";
                if (!file_exists($dbDir)) {
                    Util::mwMkdir($dbDir, true);
                }
                $dbFileName = "{$dbDir}/module.db";
                $dbFileExistBeforeAttachToConnection = file_exists($dbFileName);

                // Log
                $logDir = "{$config->path('core.logsDir')}/$moduleUniqueId/db";
                $logFileName = "{$logDir}/queries.log";
                if (!is_dir($logDir)) {
                    Util::mwMkdir($logDir, true);
                    $touchPath = Util::which('touch');
                    Processes::mwExec("{$touchPath} {$logFileName}");
                    Util::addRegularWWWRights($logDir);
                }

                $params = [
                    "debugMode" => $config->path('modulesDatabases.debugMode'),
                    "adapter" => "Sqlite",
                    "dbfile" => $dbFileName,
                    "debugLogFile" => $logFileName,
                ];

                $this->registerDBService($connectionServiceName, $di, $params);

                // if database was created, we have to apply rules
                if (!$dbFileExistBeforeAttachToConnection) {
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
        // Set EventsManager to the main database adapter instance
        $mainConnection->setEventsManager($eventsManager);
    }

    /**
     * Recreate module DB connections after table structure changes for additional modules.
     */
    public static function recreateModulesDBConnections(): void
    {
        $di = Di::getDefault();
        $di->register(new self());

        ModelsAnnotationsProvider::recreateAnnotationsProvider();

        if ($di->has(ModelsMetadataProvider::SERVICE_NAME)) {
            $di->get(ModelsMetadataProvider::SERVICE_NAME)->reset();
        }
    }
}


