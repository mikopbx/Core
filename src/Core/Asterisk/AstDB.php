<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Core\System\{Util};
use Phalcon\Di;
use SQLite3;

class AstDB extends Di\Injectable
{
    /**
     * Ссылка на базу данных
     */
    private ?SQLite3 $db;
    private AsteriskManager $am;

    /**
     * AstDB constructor.
     */
    public function __construct()
    {
        $this->am = Util::getAstManager('off');
        $this->db = new SQLite3($this->di->getShared('config')->path('astDatabase.dbfile'));
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
        } catch (\Exception $e) {
            $this->closeDb();
        }
    }

    /**
     * Закрыть соединение с базой данных.
     */
    public function closeDb(): void
    {
        if ($this->db == null) {
            return;
        }

        $this->db->close();
        $this->db = null;
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
        if ($this->db == null || $this->am->loggedIn()) {
            $result = $this->databasePutAmi($family, $key, $value);
        }
        if ($result == true || $this->db == null) {
            return $result;
        }
        $sql = "INSERT" . " OR REPLACE INTO astdb (key, value) VALUES ('/{$family}/{$key}', '{$value}')";
        try {
            $result = $this->db->exec($sql);
        } catch (\Exception $e) {
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
        if (is_array($res_data) && 'Success' == $res_data['Response']) {
            $result = true;
        }

        return $result;
    }
}