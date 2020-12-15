<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk;

use Throwable;
use MikoPBX\Core\System\{Util};
use Phalcon\Di;
use SQLite3;

class AstDB extends Di\Injectable
{
    /**
     * Ссылка на базу данных
     * @var SQLite3
     */
    private SQLite3 $db;
    private AsteriskManager $am;
    private bool $booting;

    /**
     * AstDB constructor.
     */
    public function __construct()
    {
        $di = Di::getDefault();
        $this->booting = ($di->getShared('registry')->booting === true);

        if(!$this->booting){
            Util::echoWithSyslog(' - Start Util::getAstManager'.PHP_EOL);
            $this->am = Util::getAstManager('off');
            Util::echoWithSyslog(' - End call Util::getAstManager...'.PHP_EOL);
        }

        $this->db = new SQLite3($this->getDI()->getShared('config')->path('astDatabase.dbfile'));
        $this->db->busyTimeout(1000);
        $this->db->enableExceptions(true);
        $this->createDb();
    }

    /**
     * Создать базу данных.
     */
    private function createDb(): void
    {
        $sql = <<<EOF
			CREATE TABLE IF NOT EXISTS astdb (
			    [key] VARCHAR (256),
			    value VARCHAR (256),
			    PRIMARY KEY (
			        [key]
			    )
			)
EOF;
        try {
            $this->db->exec('PRAGMA journal_mode=WAL;');
            $this->db->exec($sql);
        } catch (Throwable $e) {
            $this->closeDb();
        }
    }

    /**
     * Закрыть соединение с базой данных.
     */
    public function closeDb(): void
    {
        if ($this->db === null) {
            return;
        }

        $this->db->close();
    }

    /**
     * Поместить значение в базу данных.
     *
     * @param $family
     * @param $key
     * @param $value
     *
     * @return bool
     */
    public function databasePut($family, $key, $value): bool
    {
        $result = false;
        if (!$this->booting && ($this->db === null || $this->am->loggedIn()) ) {
            $result = $this->databasePutAmi($family, $key, $value);
        }
        if ($result === true || $this->db === null) {
            return $result;
        }
        $sql = "INSERT" . " OR REPLACE INTO astdb (key, value) VALUES ('/{$family}/{$key}', '{$value}')";
        try {
            $result = $this->db->exec($sql);
        } catch (Throwable $e) {
            $this->closeDb();
            $this->databasePut($family, $key, $value);
        }

        return $result;
    }

    /**
     * Поместить значение в базу данных через AMI.
     *
     * @param $family
     * @param $key
     * @param $value
     *
     * @return bool
     */
    private function databasePutAmi($family, $key, $value): bool
    {
        $result   = false;
        $res_data = $this->am->DBPut($family, $key, $value);
        $response = $res_data['Response'] ?? '';
        if (is_array($res_data) && 'Success' === $response) {
            $result = true;
        }

        return $result;
    }
}