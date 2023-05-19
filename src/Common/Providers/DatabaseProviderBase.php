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


use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Logger;
use Phalcon\Logger\Adapter\Stream as FileLogger;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 *
 *  @package MikoPBX\Common\Providers
 */
abstract class DatabaseProviderBase
{
    /**
     * Register the database service provider.
     *
     * @param string                  $serviceName Injection service name
     * @param \Phalcon\Di\DiInterface $di The DI container.
     * @param array                   $dbConfig The database configuration.
     */
    public function registerDBService(string $serviceName, DiInterface $di, array $dbConfig): void
    {
        $di->setShared(
            $serviceName,
            function () use ($dbConfig) {
                $dbclass    = 'Phalcon\Db\Adapter\Pdo\\' . $dbConfig['adapter'];

                $folderWithDB = dirname($dbConfig['dbfile']);
                if (!is_dir($folderWithDB)){
                    Util::mwMkdir($folderWithDB, true);
                }

                $connection = new $dbclass(
                    [
                        'dbname' => $dbConfig['dbfile'],
                    ]
                );
                $connection->setNestedTransactionsWithSavepoints(true);
                if ($dbConfig['debugMode']) {
                    $adapter       = new FileLogger($dbConfig['debugLogFile']);
                    $logger        = new Logger(
                        'messages',
                        [
                            'main' => $adapter,
                        ]
                    );
                    $eventsManager = new EventsManager();
                    // Listen to all database events
                    $eventsManager->attach(
                        'db',
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
                                        $statement = preg_replace('/= \?/', " = '{$value}'", $statement, 1);
                                      //  $statement = preg_replace('/\?/', " = '{$value}'", $statement, 1);
                                    }
                                }
                                $callStack = json_encode(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS,50), JSON_PRETTY_PRINT);
                                $logger->debug("Request: \n {$statement}\nCall stack:\n{$callStack} \n\n\n\n");
                            }
                        }
                    );

                    // Assign the EventsManager to the database adapter instance
                    $connection->setEventsManager($eventsManager);
                }

                return $connection;
            }
        );
    }

    /**
     * Recreate DB connections after table structure changes
     */
    public static function recreateDBConnections(): void
    {
        $dbProvidersList = [
            // Always recreate it before change DB providers
            ModelsCacheProvider::class,

            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,

            ModelsMetadataProvider::class,
            ModelsAnnotationsProvider::class,
        ];

        $di = Di::getDefault();

        foreach ($dbProvidersList as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }
    }
}