<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;


use Phalcon\Config;
use Phalcon\Di\DiInterface;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Logger;
use Phalcon\Logger\Adapter\Stream as FileLogger;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
abstract class DatabaseProviderBase
{
    /**
     * Register db service provider
     *
     * @param string                  $serviceName Injection service name
     * @param \Phalcon\Di\DiInterface $di
     * @param array         $dbConfig
     */
    public function registerDBService(string $serviceName, DiInterface $di, array $dbConfig): void
    {
        $di->setShared(
            $serviceName,
            function () use ($dbConfig) {
                $dbclass    = 'Phalcon\Db\Adapter\Pdo\\' . $dbConfig['adapter'];
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
                    // Слушаем все события базы данных
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
                                    }
                                }
                                $logger->debug($statement);
                            }
                        }
                    );

                    // Назначаем EventsManager экземпляру адаптера базы данных
                    $connection->setEventsManager($eventsManager);
                }

                return $connection;
            }
        );
    }
}