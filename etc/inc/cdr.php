<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2019
 */

require_once 'globals.php';

/**
* Вспомогательные методы. 
*/
class Cdr {
	
	/**
	 * Возвращает объект для работы с базой данных.
     * @param string $id
     * @return SQLite3
     */
    static function getDB($id=''){
		global $g;
		if(isset($g['db_sql_obj'])){
			return $g['db_sql_obj'];
		}
		$cdr_db_path = Cdr::getPathToDB($id);

		$db = new SQLite3($cdr_db_path);
		$db->busyTimeout(5000);
		$db->exec('PRAGMA journal_mode=WAL;');
		$g['db_sql_obj'] = $db;
		return $db;
    }

    /**
     * Возвращает путь к базе данных истории звонков.
     * @param string $id
     * @return string
     */
    static function getPathToDB($id=''){
        global $g;

        if($id==''){
            $dbname = 'cdr.db';
        }else{
            $id = str_replace('mikopbx-', '', $id);
            $dbname = 'cdr/'.date("Y/m/d/H/", $id).$id.".db";
        }
        if( Storage::is_storage_disk_mounted() ){
            $mountpoint = Storage::get_media_dir();
            $g['pt1c_cdr_db_path'] 	   = "$mountpoint/{$g['pt1c_pbx_name']}/astlogs/asterisk/$dbname";
        }else{
            $g['pt1c_cdr_db_path'] 	   = "/var/asterisk/log/$dbname";
        }

        return $g['pt1c_cdr_db_path'];
    }

    /**
     * Возвращает путь к логам cdr.
     * @return string
     */
    static function getPathtoLog(){
        $path	= dirname(Cdr::getPathToDB()).'/query-debug-cdr.log';
        return $path;
    }

    /**
     * Возвращает список полей базы данных.
     * @return array
     */
	static function get_db_fealds(){
		$f_list = [
            "id" 		     => 'INTEGER PRIMARY KEY',
            "UNIQUEID" 		 => 'TEXT',
			"start" 		 => 'TEXT', 	 // DataTime
			"answer" 		 => 'TEXT', 	 // DataTime
			"endtime" 		 => 'TEXT', 	 // DataTime
			"src_chan" 		 => 'TEXT',
			"src_num" 		 => 'TEXT', 
			"dst_chan" 		 => 'TEXT', 
			"dst_num" 		 => 'TEXT', 
			"linkedid" 		 => 'TEXT',
			"did"  			 => 'TEXT', 
			"disposition"  	 => 'TEXT', 
			"recordingfile"  => 'TEXT',
			"from_account"	 => 'TEXT',
			"to_account"	 => 'TEXT',
			"dialstatus"	 => 'TEXT',
			"appname"	     => 'TEXT',
			"transfer" 		 => 'INTEGER DEFAULT (0)', 	// Boolean
			"is_app" 		 => 'INTEGER DEFAULT (0)', 	// Boolean
			"duration" 		 => 'INTEGER DEFAULT (0)',
			"billsec" 		 => 'INTEGER DEFAULT (0)',
			"work_completed" => 'INTEGER DEFAULT (0)'  	// Boolean
		];
		return $f_list;
	}

    /**
     * Выполнение запроса к базе данных.
     * @param        $q
     * @param bool   $return_array
     * @param string $id
     * @return array
     */
	static function run_query($q, $return_array=false, $id=''){
	    Cdr::LogEvent( $q );
		$data = [];
		$db = Cdr::getDB($id);
        $time_start = microtime(true);
        $results  = $db->query("$q");
        // Начинаем замер времени
    	if(FALSE != $results && $results->numColumns()>0){
			while($res = $results->fetchArray(SQLITE3_ASSOC)){ 
				if($return_array == false){
					$data = $res;
					break;
				}
				$data[] = $res;
			}
		}else{
			$err = trim( $db->lastErrorMsg() );
			if('not an error' != $err){
				Cdr::LogEvent( "Sqlite3: $err" );
				Util::sys_log_msg('CDR_DB', $err);
			}
		}
        $time = microtime(true) - $time_start;
    	if($time > 0.010) {
            Cdr::LogEvent( "Sqlite3: $q"."Time: " . number_format($time, 10) );
            Util::sys_log_msg('CDR_DB', "Slow query ".number_format($time, 3)."ms. {$q}", LOG_WARNING);
        }

        return $data;
	}

    /**
     * Создание базы данных.
     * @param string $id
     * @return array
     */
	static function create_db($id=''){
        $f_list = Cdr::get_db_fealds();

        // "Рабочая" таблица.
        Cdr::create_table($id, 'cdr');
        // Итоговая таблица.
        Cdr::create_table($id, 'cdr_general');
        // Добавляем триггеры в рабочую таблицу.
		Cdr::add_triggers($id, 'cdr');

		Cdr::set_permit_to_db();
		return $f_list;
	}

	/**
     * Проверка базы данных на наличие "Битых" строк
     */
	static function check_db(){
        \Cdr::set_permit_to_db();
        $am = \Util::get_am('off');
        $channels_id = $am->GetChannels(true);
        $am->Logoff();

        /** @var \Models\CallDetailRecordsTmp $data_cdr */
        /** @var \Models\CallDetailRecordsTmp $row_cdr */
        $data_cdr = \Models\CallDetailRecordsTmp::find();
        foreach ($data_cdr as $row_cdr){
            if( array_key_exists($row_cdr->linkedid, $channels_id) ){
                continue;
            }
            $date = \Util::GetLastDateLogDB($row_cdr->linkedid);
            if(!$row_cdr->endtime){
                if($date){
                    $row_cdr->endtime = $date;
                }elseif ($row_cdr->answer){
                    $row_cdr->endtime = $row_cdr->answer;
                }else{
                    $row_cdr->endtime = $row_cdr->start;
                }
                $row_cdr->save();
            }
        }
	}

    /**
     * Создание таблицы в базе данных.
     * @param string $id
     * @param        $name
     */
	static function create_table($id, $name){
        $f_list = Cdr::get_db_fealds();
        $q = 'CREATE '.'TABLE IF NOT EXISTS "'.$name.'"(';
        $column = '';
        foreach ($f_list as $key => $value){
            $column.="\n".'"'.$key.'" '.$value.',';
        }
        $q .= "$column\n";
        $q .= 'CONSTRAINT "unique_UNIQUEID" UNIQUE ( "UNIQUEID" )';
        $q .= ');';
        Cdr::run_query($q, false, $id);

        Cdr::create_index('id',             $id, $name);
        Cdr::create_index('UNIQUEID',       $id, $name);
        Cdr::create_index('src_chan',       $id, $name);
        Cdr::create_index('dst_chan',       $id, $name);
        Cdr::create_index('linkedid',       $id, $name);
        Cdr::create_index('start',          $id, $name);
        Cdr::create_index('src_num',        $id, $name);
        Cdr::create_index('dst_num',        $id, $name);
        Cdr::create_index('work_completed', $id, $name);

    }

    /**
     * Установка прав доступа к файлам базы данных.
     */
    static function set_permit_to_db(){
        $path = Cdr::getPathToDB();
        $user = 'www';
        Util::chown($path, $user);
        Util::chown("{$path}-shm", $user);
        Util::chown("{$path}-wal", $user);

        $log_path = Cdr::getPathtoLog();
        file_put_contents($log_path,'');
        Util::chown($log_path, $user);
    }

    /**
     * Добавление индекса в таблицу.
     * @param $column_name
     * @param $id
     * @param $table
     */
	static function create_index($column_name, $id, $table){
        $q = "CREATE INDEX IF NOT EXISTS i_{$table}_{$column_name} ON {$table} ({$column_name})";
        Cdr::run_query($q, false, $id);
    }

    /**
     * Создает дополнительные триггеры в базе данных.
     * @param $id
     * @param $table
     */
    static function add_triggers($id, $table){
        $trigger_name = 'after_work_completed';
        $f_list = Cdr::get_db_fealds();
        $column     = '';
        $new_column = '';
        foreach ($f_list as $key => $value){
            if('id' == $key){
                continue;
            }
            $column     .= ($column=='')?"$key":",$key";
            $new_column .= ($new_column=='')?"NEW.$key":",NEW.$key";
        }
        $q = "DROP TRIGGER IF EXISTS {$table}.{$trigger_name}";
        Cdr::run_query($q, false, $id);

	    $q = "CREATE TRIGGER IF NOT EXISTS {$trigger_name} \n".
             "   AFTER UPDATE OF work_completed ON {$table} FOR EACH ROW \n".
             "WHEN NEW.work_completed = 1 \n".
             "BEGIN \n".
             "   INSERT OR REPLACE INTO cdr_general ({$column}) VALUES({$new_column});\n".
             "   DELETE FROM cdr WHERE UNIQUEID = NEW.UNIQUEID;\n".
             "END;";
        Cdr::run_query($q, false, $id);
    }

    /**
     * Обновление данных в базе.
     * @param $data
     * @return bool
     */
	static function update_data_in_db_m($data){
        if(empty($data['UNIQUEID'])){
            Util::sys_log_msg('update_data_in_db_m', 'UNIQUEID is empty '.json_encode($data));
            return false;
        }

        $filter = [
            "UNIQUEID=:id:",
            'bind'       => ['id' => $data['UNIQUEID'],]
        ];
        $m_data = Models\CallDetailRecordsTmp::findFirst($filter);
        if($m_data == null){
            return true;
        }
        $f_list = Cdr::get_db_fealds();
        foreach ($data as $attribute => $value){
            if(!array_key_exists($attribute, $f_list)){
                continue;
            }
            if('UNIQUEID' == $attribute){
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if(!$res) {
            Util::sys_log_msg('update_data_in_db_m', implode(' ',$m_data->getMessages()));
        };

        /**
         * Отправка UserEvent
         */
        $insert_data = $m_data->toArray();
        if($insert_data['work_completed'] == 1){

            $insert_data['action']        = "hangup_update_cdr";
            $insert_data['GLOBAL_STATUS'] = isset($data['GLOBAL_STATUS'])?$data['GLOBAL_STATUS']:$data['disposition'];
            unset($insert_data['src_chan']);
            unset($insert_data['dst_chan']);
            unset($insert_data['work_completed']);
            unset($insert_data['did']);
            unset($insert_data['id']);
            unset($insert_data['from_account']);
            unset($insert_data['to_account']);
            unset($insert_data['appname']);
            unset($insert_data['is_app']);
            unset($insert_data['transfer']);

            $am      = \Util::get_am('off');
            $AgiData = base64_encode(json_encode($insert_data));
            $am->UserEvent('CdrConnector', [ 'AgiData' => $AgiData]);
        }
        return $res;
    }

    /**
     * Помещаем данные в базу используя модели.
     * @param array $data
     * @return bool
     */
    static function insert_data_to_db_m($data){
        if(empty($data['UNIQUEID'])){
            Util::sys_log_msg('insert_data_to_db_m', 'UNIQUEID is empty '.json_encode($data));
            return false;
        }

        $is_new = false;
        $m_data = Models\CallDetailRecordsTmp::findFirst(
            [
                "UNIQUEID=:id:",
                'bind'       => [ 'id' => $data['UNIQUEID'],]
            ]
        );
        if($m_data == null){
            $m_data = new Models\CallDetailRecordsTmp();
            $is_new = true;
        }elseif (isset($data['IS_ORGNT']) && $data['action'] == 'dial'){
            // Если это оригинация, то НЕ переопределяем уже существующую строку.
            // dial может прийти дважды.
            return true;
        }

        $f_list = Cdr::get_db_fealds();
        foreach ($data as $attribute => $value){
            if(!array_key_exists($attribute, $f_list)){
                continue;
            }
            if($is_new == false && 'UNIQUEID' == $attribute){
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if(!$res) {
            Util::sys_log_msg('insert_data_to_db_m', implode(' ',$m_data->getMessages()));
        };

        return $res;
    }

    /**
     * Инициирует запись разговора на канале.
     * @param $channel
     * @param $file_name
     * @param null $subdir
     * @return string
     */
	static function MixMonitor($channel, $file_name, $subdir=null){
		global $g;
        $res_file = '';

		if(isset($g['record_calls']) && $g['record_calls'] == '1'){
            $am  = Util::get_am('off');
            $monitor_dir = Storage::get_monitor_dir();
            if($subdir==null){
                $subdir = date("Y/m/d/H/");
            }
            $f   = "$monitor_dir".$subdir.$file_name;
            $res = $am->MixMonitor($channel, "{$f}.wav", 'ab', "/bin/nice -n 19 /usr/bin/lame -b 32 --silent \"{$f}.wav\" \"{$f}.mp3\" && /bin/chmod o+r \"{$f}.mp3\"");
            $res['cmd'] = "MixMonitor($channel, $file_name)";
            Cdr::LogEvent(json_encode($res));
            $res_file = "{$f}.mp3";
            $am->UserEvent('StartRecording', ['recordingfile' => $res_file, 'recchan' => $channel]);
        }
		return "$res_file";
	}

    /**
     * Формирует путь к файлу записи без расширения.
     * @param $file_name
     * @return string
     */
	static function MeetMeSetRecFilename($file_name){
        $monitor_dir = \Storage::get_monitor_dir();
        $sub_dir      = date("Y/m/d/H/");
        return "{$monitor_dir}{$sub_dir}{$file_name}";
    }

    /**
     * Останавливает запись разговора на канале.
     * @param $channel
     */
	static function StopMixMonitor($channel){
        global $g;
        if(isset($g['record_calls']) && $g['record_calls'] == '1') {
            $am  = Util::get_am('off');
            $res = $am->StopMixMonitor($channel);
            $res['cmd'] = "StopMixMonitor($channel)";
            Cdr::LogEvent(json_encode($res));
        }
    }

    /**
     * Сохраниение лога по звонку.
     * @param $data
     */
	static function LogEvent($data){
		if(is_file('/tmp/debug')){
			file_put_contents('/tmp/dial_log', $data."\n",FILE_APPEND);
		}
	}

}