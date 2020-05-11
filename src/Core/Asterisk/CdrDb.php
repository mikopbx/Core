<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 3 2020
 */

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Storage, Util};
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di;
use SQLite3;

/**
 * Вспомогательные методы.
 */
class CdrDb
{

    /**
     * Создание базы данных.
     *
     * @param string $id
     *
     * @return array
     */
    public static function createDb($id = ''): array
    {
        $f_list = self::getDbFields();

        // "Рабочая" таблица.
        self::createTable($id, 'cdr');
        // Итоговая таблица.
        self::createTable($id, 'cdr_general');
        // Добавляем триггеры в рабочую таблицу.
        self::addTriggers($id, 'cdr');

        self::setPermitToDb();

        return $f_list;
    }

    /**
     * Возвращает список полей базы данных.
     *
     * @return array
     */
    public static function getDbFields(): array
    {
        return [
            'id'             => 'INTEGER PRIMARY KEY',
            'UNIQUEID'       => 'TEXT',
            'start'          => 'TEXT',     // DataTime
            'answer'         => 'TEXT',     // DataTime
            'endtime'        => 'TEXT',     // DataTime
            'src_chan'       => 'TEXT',
            'src_num'        => 'TEXT',
            'dst_chan'       => 'TEXT',
            'dst_num'        => 'TEXT',
            'linkedid'       => 'TEXT',
            'did'            => 'TEXT',
            'disposition'    => 'TEXT',
            'recordingfile'  => 'TEXT',
            'from_account'   => 'TEXT',
            'to_account'     => 'TEXT',
            'dialstatus'     => 'TEXT',
            'appname'        => 'TEXT',
            'transfer'       => 'INTEGER DEFAULT (0)',    // Boolean
            'is_app'         => 'INTEGER DEFAULT (0)',    // Boolean
            'duration'       => 'INTEGER DEFAULT (0)',
            'billsec'        => 'INTEGER DEFAULT (0)',
            'work_completed' => 'INTEGER DEFAULT (0)',    // Boolean
            'src_call_id'    => 'TEXT',    // Boolean
            'dst_call_id'    => 'TEXT',    // Boolean
        ];
    }

    /**
     * Создание таблицы в базе данных.
     *
     * @param string $id
     * @param        $name
     */
    public static function createTable($id, $name): void
    {
        $f_list = self::getDbFields();
        $q      = 'CREATE ' . 'TABLE IF NOT EXISTS "' . $name . '"(';
        $column = '';
        foreach ($f_list as $key => $value) {
            $column .= "\n" . '"' . $key . '" ' . $value . ',';
        }
        $q .= "$column\n";
        $q .= 'CONSTRAINT "unique_UNIQUEID" UNIQUE ( "UNIQUEID" )';
        $q .= ');';
        self::runQuery($q, false, $id);

        self::checkColumnInTable($id, $name);

        self::createIndex('id', $id, $name);
        self::createIndex('UNIQUEID', $id, $name);
        self::createIndex('src_chan', $id, $name);
        self::createIndex('dst_chan', $id, $name);
        self::createIndex('linkedid', $id, $name);
        self::createIndex('start', $id, $name);
        self::createIndex('src_num', $id, $name);
        self::createIndex('dst_num', $id, $name);
        self::createIndex('work_completed', $id, $name);
    }

    /**
     * Выполнение запроса к базе данных.
     *
     * @param        $q
     * @param bool   $return_array
     * @param string $id
     *
     * @return array
     */
    public static function runQuery($q, $return_array = false, $id = ''): array
    {
        self::LogEvent($q);
        $data       = [];
        $db         = self::getDB($id);
        $time_start = microtime(true);
        $results    = $db->query("$q");
        // Начинаем замер времени
        if (false != $results && $results->numColumns() > 0) {
            while ($res = $results->fetchArray(SQLITE3_ASSOC)) {
                if ($return_array == false) {
                    $data = $res;
                    break;
                }
                $data[] = $res;
            }
        } else {
            $err = trim($db->lastErrorMsg());
            if ('not an error' != $err) {
                self::LogEvent("Sqlite3: $err");
                Util::sysLogMsg('CDR_DB', $err);
            }
        }
        $time = microtime(true) - $time_start;
        if ($time > 0.010) {
            self::LogEvent("Sqlite3: $q" . "Time: " . number_format($time, 10));
            Util::sysLogMsg('CDR_DB', "Slow query " . number_format($time, 3) . "ms. {$q}", LOG_WARNING);
        }

        return $data;
    }

    /**
     * Сохраниение лога по звонку.
     *
     * @param $data
     */
    public static function LogEvent($data): void
    {
        if (is_file('/tmp/debug')) {
            file_put_contents('/tmp/dial_log', $data . "\n", FILE_APPEND);
        }
    }

    /**
     * Возвращает объект для работы с базой данных.
     *
     * @param string $id
     *
     * @return SQLite3
     */
    public static function getDB($id = '')
    {
        global $g;
        if (isset($g['db_sql_obj'])) {
            return $g['db_sql_obj'];
        }
        $cdr_db_path = self::getPathToDB($id);

        $db = new SQLite3($cdr_db_path);
        $db->busyTimeout(5000);
        $db->exec('PRAGMA journal_mode=WAL;');
        $g['db_sql_obj'] = $db;

        return $db;
    }

    /**
     * Возвращает путь к базе данных истории звонков.
     *
     * @param string $id
     *
     * @return string
     */
    public static function getPathToDB($id = ''): string
    {
        $di = Di::getDefault();

        if ($id == '' && $di !== null) {
            $dbname = $di->getShared('config')->path('cdrDatabase.dbfile');
        } else {
            $id     = str_replace('mikopbx-', '', $id);
            $dbname = 'cdr/' . date("Y/m/d/H/", $id) . $id . ".db";
        }

        return $dbname;
    }

    public static function checkColumnInTable($id, $name): void
    {
        $f_list    = self::getDbFields();
        $meta_data = self::runQuery("PRAGMA table_info('$name')", true, $id);
        foreach ($meta_data as $column) {
            if (isset($f_list[$column['name']])) {
                unset($f_list[$column['name']]);
            }
        }
        foreach ($f_list as $key => $value) {
            self::runQuery('ALTER TABLE ' . $name . ' ADD COLUMN ' . $key . ' ' . $value . ';', false, $id);
        }
    }

    /**
     * Добавление индекса в таблицу.
     *
     * @param $column_name
     * @param $id
     * @param $table
     */
    public static function createIndex($column_name, $id, $table): void
    {
        $q = "CREATE INDEX IF NOT EXISTS i_{$table}_{$column_name} ON {$table} ({$column_name})";
        self::runQuery($q, false, $id);
    }

    /**
     * Создает дополнительные триггеры в базе данных.
     *
     * @param $id
     * @param $table
     */
    public static function addTriggers($id, $table): void
    {
        $trigger_name = 'after_work_completed';
        $f_list       = self::getDbFields();
        $column       = '';
        $new_column   = '';
        foreach ($f_list as $key => $value) {
            if ('id' == $key) {
                continue;
            }
            $column     .= ($column == '') ? "$key" : ",$key";
            $new_column .= ($new_column == '') ? "NEW.$key" : ",NEW.$key";
        }
        $q = "DROP TRIGGER IF EXISTS {$table}.{$trigger_name}";
        self::runQuery($q, false, $id);

        $q = "CREATE TRIGGER IF NOT EXISTS {$trigger_name} \n" .
            "   AFTER UPDATE OF work_completed ON {$table} FOR EACH ROW \n" .
            "WHEN NEW.work_completed = 1 \n" .
            "BEGIN \n" .
            "   INSERT OR REPLACE INTO cdr_general ({$column}) VALUES({$new_column});\n" .
            "   DELETE FROM cdr WHERE UNIQUEID = NEW.UNIQUEID;\n" .
            "END;";
        self::runQuery($q, false, $id);
    }

    /**
     * Установка прав доступа к файлам базы данных.
     */
    public static function setPermitToDb(): void
    {
        $path = self::getPathToDB();
        $user = 'www';
        Util::chown($path, $user);
        Util::chown("{$path}-shm", $user);
        Util::chown("{$path}-wal", $user);

        $log_path = self::getPathToLog();
        file_put_contents($log_path, '');
        Util::chown($log_path, $user);
    }

    /**
     * Возвращает путь к логам cdr.
     *
     * @return string
     */
    public static function getPathToLog(): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getShared('config')->path('cdrDatabase.debugLogFile');
        }

        return '/var/log';
    }

    /**
     * Проверка базы данных на наличие "Битых" строк
     */
    public static function checkDb(): void
    {
        self::setPermitToDb();
        self::checkColumnInTable('', 'cdr');
        self::checkColumnInTable('', 'cdr_general');

        $am          = Util::getAstManager('off');
        $channels_id = $am->GetChannels(true);
        $am->Logoff();

        /** @var \MikoPBX\Common\Models\CallDetailRecordsTmp $data_cdr */
        /** @var \MikoPBX\Common\Models\CallDetailRecordsTmp $row_cdr */
        $data_cdr = CallDetailRecordsTmp::find();
        foreach ($data_cdr as $row_cdr) {
            if (array_key_exists($row_cdr->linkedid, $channels_id)) {
                continue;
            }
            $date = Util::GetLastDateLogDB($row_cdr->linkedid);
            if ( ! $row_cdr->endtime) {
                if ($date) {
                    $row_cdr->endtime = $date;
                } elseif ($row_cdr->answer) {
                    $row_cdr->endtime = $row_cdr->answer;
                } else {
                    $row_cdr->endtime = $row_cdr->start;
                }
                $row_cdr->save();
            }
        }
    }

    /**
     * Обновление данных в базе.
     *
     * @param $data
     *
     * @return bool
     */
    public static function updateDataInDbM($data): bool
    {
        if (empty($data['UNIQUEID'])) {
            Util::sysLogMsg('updateDataInDbM', 'UNIQUEID is empty ' . json_encode($data));

            return false;
        }

        $filter = [
            "UNIQUEID=:id:",
            'bind' => ['id' => $data['UNIQUEID'],],
        ];
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if ($m_data === null) {
            return true;
        }
        $f_list = self::getDbFields();
        foreach ($data as $attribute => $value) {
            if ( ! array_key_exists($attribute, $f_list)) {
                continue;
            }
            if ('UNIQUEID' == $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if ( ! $res) {
            Util::sysLogMsg('updateDataInDbM', implode(' ', $m_data->getMessages()));
        }

        /**
         * Отправка UserEvent
         */
        $insert_data = $m_data->toArray();
        if ($insert_data['work_completed'] == 1) {
            $insert_data['action']        = "hangup_update_cdr";
            $insert_data['GLOBAL_STATUS'] = isset($data['GLOBAL_STATUS']) ? $data['GLOBAL_STATUS'] : $data['disposition'];
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

            $am      = Util::getAstManager('off');
            $AgiData = base64_encode(json_encode($insert_data));
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
        }

        return $res;
    }

    /**
     * Помещаем данные в базу используя модели.
     *
     * @param array $data
     *
     * @return bool
     */
    public static function insertDataToDbM($data): bool
    {
        if (empty($data['UNIQUEID'])) {
            Util::sysLogMsg('insertDataToDbM', 'UNIQUEID is empty ' . json_encode($data));

            return false;
        }

        $is_new = false;
        /** @var \MikoPBX\Common\Models\CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::findFirst(
            [
                "UNIQUEID=:id:",
                'bind' => ['id' => $data['UNIQUEID'],],
            ]
        );
        if ($m_data === null) {
            $m_data = new CallDetailRecordsTmp();
            $is_new = true;
        } elseif (isset($data['IS_ORGNT']) && $data['action'] == 'dial') {
            if (empty($m_data->endtime)) {
                // Если это оригинация, то НЕ переопределяем уже существующую строку.
                // dial может прийти дважды.
                return true;
            } else {
                // Предыдущие звонки завершены. Текущий вызов новый, к примеру через резервного провайдера.
                // Меняем идентификатор предыдущих звонков.
                $m_data->UNIQUEID = $m_data->UNIQUEID . Util::generateRandomString(5);
                // Чистим путь к файлу записи.
                $m_data->recordingfile = "";
                $m_data->save();

                $new_m_data               = new CallDetailRecordsTmp();
                $new_m_data->UNIQUEID     = $data['UNIQUEID'];
                $new_m_data->start        = $data['start'];
                $new_m_data->src_chan     = $m_data->src_chan;
                $new_m_data->src_num      = $m_data->src_num;
                $new_m_data->dst_num      = $data['src_num'];
                $new_m_data->did          = $data['did'];
                $new_m_data->from_account = $data['from_account'];
                $new_m_data->linkedid     = $data['linkedid'];
                $new_m_data->transfer     = $data['transfer'];

                $res = $new_m_data->save();
                if ( ! $res) {
                    Util::sysLogMsg('insertDataToDbM', implode(' ', $m_data->getMessages()));
                }

                return $res;
            }
        }

        $f_list = self::getDbFields();
        foreach ($data as $attribute => $value) {
            if ( ! array_key_exists($attribute, $f_list)) {
                continue;
            }
            if ($is_new == false && 'UNIQUEID' == $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if ( ! $res) {
            Util::sysLogMsg('insertDataToDbM', implode(' ', $m_data->getMessages()));
        }

        return $res;
    }

    /**
     * Инициирует запись разговора на канале.
     *
     * @param      $channel
     * @param      $file_name
     * @param null $sub_dir
     * @param null $full_name
     *
     * @return string
     */
    public static function MixMonitor($channel, $file_name = null, $sub_dir = null, $full_name = null): string
    {
        $res_file           = '';
        $mikoPBXConfig      = new MikoPBXConfig();
        $record_calls       = $mikoPBXConfig->getGeneralSettings('PBXRecordCalls');
        $split_audio_thread = $mikoPBXConfig->getGeneralSettings('PBXSplitAudioThread');

        $file_name = str_replace('/', '_', $file_name);
        if (isset($record_calls) && $record_calls === '1') {
            $am = Util::getAstManager('off');
            if ( ! file_exists($full_name)) {
                $monitor_dir = Storage::getMonitorDir();
                if ($sub_dir === null) {
                    $sub_dir = date('Y/m/d/H/');
                }
                $f = $monitor_dir . $sub_dir . $file_name;
            } else {
                $f         = Util::trimExtensionForFile($full_name);
                $file_name = basename($f);
            }
            if ($split_audio_thread === '1') {
                $options = "abr({$f}_in.wav)t({$f}_out.wav)";
            } else {
                $options = 'ab';
            }
            $res        = $am->MixMonitor(
                $channel,
                "{$f}.wav",
                $options,
                "/bin/nice -n 19 /usr/bin/lame -b 32 --silent \"{$f}.wav\" \"{$f}.mp3\" && /bin/chmod o+r \"{$f}.mp3\""
            );
            $res['cmd'] = "MixMonitor($channel, $file_name)";
            self::LogEvent(json_encode($res));
            $res_file = "{$f}.mp3";
            $am->UserEvent('StartRecording', ['recordingfile' => $res_file, 'recchan' => $channel]);
        }

        return $res_file;
    }

    /**
     * Формирует путь к файлу записи без расширения.
     *
     * @param $file_name
     *
     * @return string
     */
    public static function MeetMeSetRecFilename($file_name): string
    {
        $monitor_dir = Storage::getMonitorDir();
        $sub_dir     = date("Y/m/d/H/");

        return "{$monitor_dir}{$sub_dir}{$file_name}";
    }

    /**
     * Останавливает запись разговора на канале.
     *
     * @param $channel
     */
    public static function StopMixMonitor($channel): void
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $record_calls  = $mikoPBXConfig->getGeneralSettings('PBXRecordCalls');

        if (isset($record_calls) && $record_calls === '1') {
            $am         = Util::getAstManager('off');
            $res        = $am->StopMixMonitor($channel);
            $res['cmd'] = "StopMixMonitor($channel)";
            self::LogEvent(json_encode($res));
        }
    }

    /**
     * Получение активных звонков по данным CDR.
     *
     * @return string
     */
    public static function getActiveCalls(): string
    {
        $filter  = [
            'order'       => 'id',
            'columns'     => 'start,answer,endtime,src_num,dst_num,did,linkedid',
            'miko_tmp_db' => true,
        ];
        $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        $message = $client->request(json_encode($filter), 2);
        if ($message == false) {
            $content = '[]';
        } else {
            $content = $message;
        }

        return $content;
    }

    /**
     * Получение активных каналов. Не завершенные звонки (endtime IS NULL).
     *
     * @return string
     */
    public static function getActiveChannels(): string
    {
        $filter  = [
            'endtime IS NULL',
            'order'               => 'id',
            'columns'             => 'start,answer,src_chan,dst_chan,src_num,dst_num,did,linkedid',
            'miko_tmp_db'         => true,
            'miko_result_in_file' => true,
        ];
        $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        $message = $client->request(json_encode($filter), 2);
        if ($message == false) {
            $content = '[]';
        } else {
            $result_message = '[]';
            $am             = Util::getAstManager('off');
            $active_chans   = $am->GetChannels(true);
            $am->Logoff();
            $result_data = [];

            $result = json_decode($message);
            if (file_exists($result)) {
                $data = json_decode(file_get_contents($result), true);
                unlink($result);
                foreach ($data as $row) {
                    if ( ! isset($active_chans[$row['linkedid']])) {
                        // Вызов уже не существует.
                        continue;
                    }
                    if (empty($row['dst_chan']) && empty($row['src_chan'])) {
                        // Это ошибочная ситуация. Игнорируем такой вызов.
                        continue;
                    }
                    $channels = $active_chans[$row['linkedid']];
                    if ((empty($row['src_chan']) || in_array($row['src_chan'], $channels))
                        && (empty($row['dst_chan']) || in_array($row['dst_chan'], $channels))) {
                        $result_data[] = $row;
                    }
                }
                $result_message = json_encode($result_data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            }
            $content = $result_message;
        }

        return $content;
    }

}