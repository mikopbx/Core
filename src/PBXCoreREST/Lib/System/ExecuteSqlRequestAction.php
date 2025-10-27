<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Common\Models\CDRDatabaseProvider;
use MikoPBX\Common\Providers\{CDRDatabaseProvider as CDRProvider, MainDatabaseProvider, TranslationProvider};
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * ExecuteSqlRequestAction
 *
 * Execute arbitrary SQL query against specified database
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class ExecuteSqlRequestAction extends Injectable
{
    /**
     * Execute SQL query
     *
     * @param array $data Request data containing:
     *   - query: string (required) - The SQL query to execute
     *   - database: string (optional) - Database path or 'main'/'cdr', default 'main'
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get translation service
        $translation = Di::getDefault()->get(TranslationProvider::SERVICE_NAME);

        // Validate required parameters
        if (empty($data['query'])) {
            $res->messages['error'][] = $translation->_('rest_err_system_query_required');
            $res->httpCode = 400;
            return $res;
        }

        $query = $data['query'];
        $databaseType = $data['database'] ?? 'main';

        try {
            // Get database connection
            $connection = self::getDatabaseConnection($databaseType);

            if ($connection === null) {
                $res->messages['error'][] = $translation->_('rest_err_system_invalid_database');
                $res->httpCode = 400;
                return $res;
            }

            // Execute query
            $result = $connection->query($query);

            if ($result === false) {
                $res->messages['error'][] = $translation->_('rest_err_system_query_failed') . ': ' . implode(', ', $connection->getErrorInfo());
                $res->httpCode = 500;
                return $res;
            }

            // Fetch results
            $rows = [];
            if ($result !== true) {
                $result->setFetchMode(\Phalcon\Db\Enum::FETCH_ASSOC);
                while ($row = $result->fetch()) {
                    $rows[] = $row;
                }
            }

            $res->success = true;
            $res->data = [
                'query' => $query,
                'database' => $databaseType,
                'rows' => $rows,
                'rowCount' => count($rows),
                'affectedRows' => $connection->affectedRows()
            ];
        } catch (\Throwable $e) {
            $res->messages['error'][] = $translation->_('rest_err_system_query_exception') . ': ' . $e->getMessage();
            $res->httpCode = 500;
        }

        return $res;
    }

    /**
     * Get database connection based on type or path
     *
     * @param string $databaseType Database type ('main', 'cdr') or custom path
     *
     * @return \Phalcon\Db\Adapter\AbstractAdapter|null Database connection or null if invalid
     */
    private static function getDatabaseConnection(string $databaseType): ?\Phalcon\Db\Adapter\AbstractAdapter
    {
        $di = Di::getDefault();

        switch ($databaseType) {
            case 'main':
                // Main MikoPBX database
                return $di->getShared(MainDatabaseProvider::SERVICE_NAME);

            case 'cdr':
                // CDR database
                return $di->getShared(CDRProvider::SERVICE_NAME);

            default:
                // Custom database path
                if (file_exists($databaseType) && is_readable($databaseType)) {
                    return new \Phalcon\Db\Adapter\Pdo\Sqlite([
                        'dbname' => $databaseType
                    ]);
                }
                return null;
        }
    }
}
