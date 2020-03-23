<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once("globals.php");

class AstDB {
	/**
	 * Ссылка на базу данных
	 */
    private $db=null;
    private $am=null;

    /**
     * AstDB constructor.
     */
	function __construct() {
        $this->am  = Util::get_am('off');
		$dirs = PBX::get_asterisk_dirs();
		$this->db = new SQLite3($dirs['dbpath']."/astdb.sqlite3");	
		$this->db->busyTimeout(1000);
		$this->db->enableExceptions(true);
		$this->create_db();
	}

    /**
     * Закрыть соединение с базой данных.
     */
	public function close_db(){
		if($this->db == null) return;
				
		$this->db->close();
		$this->db = null;

	}

    /**
     * Создать базу данных.
     */
	private function create_db(){
		$sql =<<<EOF
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
		} catch (Exception $e) {
			$this->close_db();
		}
	}

    /**
     * Поместить значение в базу данных.
     * @param $family
     * @param $key
     * @param $value
     * @return bool
     */
	public function database_put($family, $key, $value){
        $result = false;
	    if($this->db == null || $this->am->logged_in()){
            $result = $this->database_put_ami($family, $key, $value);
		}
		if($result == true || $this->db == null){
	        return $result;
        }
		$sql = "INSERT"." OR REPLACE INTO astdb (key, value) VALUES ('/{$family}/{$key}', '{$value}')";
		try {
			$result = $this->db->exec($sql);
		} catch (Exception $e) {
			$this->close_db();
			$this->database_put($family, $key, $value);
		}
		return $result;
	}

    /**
     * Поместить значение в базу данных через AMI.
     * @param $family
     * @param $key
     * @param $value
     * @return bool
     */
	private function database_put_ami($family, $key, $value){
        $result = false;
	    $res_data = $this->am->DBPut($family, $key, $value);
		if(is_array($res_data) && 'Success' == $res_data['Response']) {
            $result = true;
        }
		return $result;
	}
}