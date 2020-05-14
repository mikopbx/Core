<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\System;

use AGI_AsteriskManager;
use DateTime;
use Exception;
use MikoPBX\Common\Models\{CallEventsLogs, CustomFiles};
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\Db\Column;
use Phalcon\Di;
use ReflectionClass;


/**
 * Вспомогательные методы.
 */
class Util
{

    /**
     * @param $options
     * @param $manual_attributes
     * @param $section
     *
     * @return string
     */
    public static function overrideConfigurationArray($options, $manual_attributes, $section): string
    {
        $result_config = '';
        if ($manual_attributes !== null && isset($manual_attributes[$section])) {
            foreach ($manual_attributes[$section] as $key => $value) {
                if ($key === 'type') {
                    continue;
                }
                $options[$key] = $value;
            }
        }
        foreach ($options as $key => $value) {
            if (empty($value) || empty($key)) {
                continue;
            }
            if (is_array($value)) {
                array_unshift($value, ' ');
                $result_config .= trim(implode("\n{$key} = ", $value)) . "\n";
            } else {
                $result_config .= "{$key} = {$value}\n";
            }
        }

        return "$result_config\n";
    }

    /**
     * Стартует запись логов.
     *
     * @param int $timeout
     */
    public static function startLog($timeout = 300): void
    {
        self::stopLog();
        $dir_all_log = System::getLogDir();
        self::mwExec('find ' . $dir_all_log . '/ -name *_start_all_log* | xargs rm -rf');
        // Получим каталог с логами.
        $dirlog = $dir_all_log . '/dir_start_all_log';
        if ( ! file_exists($dirlog) && ! mkdir($dirlog, 0777, true) && ! is_dir($dirlog)) {
            return;
        }
        self::mwExecBg('ping 8.8.8.8 -w 2', "{$dirlog}/ping_8888.log");
        self::mwExecBg('ping ya.ru -w 2', "{$dirlog}/ping_8888.log");
        self::mwExecBgWithTimeout("openssl s_client -connect lm.miko.ru:443 > {$dirlog}/openssl_lm_miko_ru.log", 1);
        self::mwExecBgWithTimeout("openssl s_client -connect lic.miko.ru:443 > {$dirlog}/openssl_lic_miko_ru.log", 1);
        self::mwExecBg('route -n ', " {$dirlog}/rout_n.log");

        if (SIPConf::getTechnology() === SIPConf::TYPE_SIP) {
            self::mwExecBg("asterisk -rx 'sip show settings' ", " {$dirlog}/sip_show_settings.log");
            self::mwExecBg("asterisk -rx 'sip show peers' ", " {$dirlog}/sip_show_peers.log");
            self::mwExecBg("asterisk -rx 'sip show registry' ", " {$dirlog}/sip_show_registry.log");
        } else {
            self::mwExecBg("asterisk -rx 'pjsip show registrations' ", " {$dirlog}/pjsip_show_registrations.log");
            self::mwExecBg("asterisk -rx 'pjsip show endpoints' ", " {$dirlog}/pjsip_show_endpoints.log");
            self::mwExecBg("asterisk -rx 'pjsip show contacts' ", " {$dirlog}/pjsip_show_contacts.log");
        }

        $php_log = '/var/log/php_error.log';
        if (file_exists($php_log)) {
            self::mwExec("cp $php_log $dirlog");
        }

        $network = new Network();
        $arr_eth = $network->getInterfacesNames();
        foreach ($arr_eth as $eth) {
            self::mwExecBgWithTimeout(
                "tcpdump -i $eth -n -s 0 -vvv -w {$dirlog}/{$eth}.pcap",
                $timeout,
                "{$dirlog}/{$eth}_out.log"
            );
        }
    }

    /**
     * Завершает запись логов.
     *
     * @return string
     */
    public static function stopLog(): string
    {
        $dir_all_log = System::getLogDir();

        self::killByName('timeout');
        self::killByName('tcpdump');

        $dirlog = $dir_all_log . '/dir_start_all_log';
        if ( ! file_exists($dirlog) && ! mkdir($dirlog, 0777, true) && ! is_dir($dirlog)) {
            return '';
        }

        $log_dir = System::getLogDir();
        self::mwExec("cp -R {$log_dir} {$dirlog}");

        $result = $dir_all_log . '/arhive_start_all_log.zip';
        if (file_exists($result)) {
            self::mwExec('rm -rf ' . $result);
        }
        // Пакуем логи.
        self::mwExec("7za a -tzip -mx0 -spf '{$result}' '{$dirlog}'");
        // Удаляем логи. Оставляем только архив.
        self::mwExec('find ' . $dir_all_log . '/ -name *_start_all_log | xargs rm -rf');

        if (file_exists($dirlog)) {
            self::mwExec('find ' . $dirlog . '/ -name license.key | xargs rm -rf');
        }
        // Удаляем каталог логов.
        self::mwExecBg("rm -rf $dirlog");

        return $result;
    }

    /**
     * Завершаем процесс по имени.
     *
     * @param $procname
     *
     * @return int|null
     */
    public static function killByName($procname)
    {
        return self::mwExec('busybox killall ' . escapeshellarg($procname));
    }

    /**
     * Выполняет системную команду exec().
     *
     * @param      $command
     * @param null $oarr
     * @param null $retval
     *
     * @return int|null
     */
    public static function mwExec($command, &$oarr = null, &$retval = null)
    {
        $retval = 0;
        $oarr   = [];
        $di = Di::getDefault();

        if ($di!==null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExec(): $command\n";
        } else {
            exec("$command 2>&1", $oarr, $retval);
        }

        return $retval;
    }

    /**
     * Выполняет системную команду exec() в фоне.
     *
     * @param $command
     * @param $out_file
     * @param $sleep_time
     */
    public static function mwExecBg($command, $out_file = '/dev/null', $sleep_time = 0)
    {
        if ($sleep_time > 0) {
            $filename = '/tmp/' . time() . '_noop.sh';
            file_put_contents($filename, "sleep {$sleep_time}; $command; rm -rf $filename");
            $noop_command = "nohup sh {$filename} > {$out_file} 2>&1 &";
        } else {
            $noop_command = "nohup {$command} > {$out_file} 2>&1 &";
        }
        exec($noop_command);
    }

    /**
     * Выполняет системную команду exec() в фоне.
     *
     * @param        $command
     * @param int    $timeout
     * @param string $logname
     */
    public static function mwExecBgWithTimeout($command, $timeout = 4, $logname = '/dev/null')
    {
        $di = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExecBg(): $command\n";

            return;
        }
        exec("nohup timeout -t {$timeout} $command > {$logname} 2>&1 &");
    }

    /**
     * Выполнение нескольких команд.
     *
     * @param        $arr_cmds
     * @param null   $out
     * @param string $logname
     */
    public static function mwExecCommands($arr_cmds, &$out = null, $logname = ''): void
    {
        $out = [];
        foreach ($arr_cmds as $cmd) {
            $out[]   = "$cmd;";
            $out_cmd = [];
            self::mwExec($cmd, $out_cmd);
            $out = array_merge($out, $out_cmd);
        }

        if ($logname !== '') {
            $result = implode("\n", $out);
            file_put_contents("/tmp/{$logname}_commands.log", $result);
        }
    }

    /**
     * @param $path
     *
     * @return bool
     */
    public static function mwMkdir($path): bool
    {
        $result = true;
        if ( ! file_exists($path) && ! mkdir($path, 0777, true) && ! is_dir($path)) {
            $result = false;
        }

        return $result;
    }

    // TODO / Возвращает путь к исполняемому файлу.

    /**
     * Форматирует JSON в читабельный вид.
     *
     * @param $json
     *
     * @return string
     */
    public static function jsonIndent($json): string
    {
        $result      = '';
        $pos         = 0;
        $strLen      = strlen($json);
        $indentStr   = '  ';
        $newLine     = "\n";
        $prevChar    = '';
        $outOfQuotes = true;

        for ($i = 0; $i <= $strLen; $i++) {
            // Grab the next character in the string.
            $char = substr($json, $i, 1);

            // Are we inside a quoted string?
            if ($char === '"' && $prevChar !== '\\') {
                $outOfQuotes = ! $outOfQuotes;

                // If this character is the end of an element,
                // output a new line and indent the next line.
            } elseif (($char === '}' || $char === ']') && $outOfQuotes) {
                $result .= $newLine;
                $pos--;
                for ($j = 0; $j < $pos; $j++) {
                    $result .= $indentStr;
                }
            }

            // Add the character to the result string.
            $result .= $char;

            // If the last character was the beginning of an element,
            // output a new line and indent the next line.
            if (($char === ',' || $char === '{' || $char === '[') && $outOfQuotes) {
                $result .= $newLine;
                if ($char === '{' || $char === '[') {
                    $pos++;
                }

                for ($j = 0; $j < $pos; $j++) {
                    $result .= $indentStr;
                }
            }

            $prevChar = $char;
        }

        return $result;
    }

    /**
     * Restart PHP workers
     *
     * @param string $className
     * @param string $param
     */
    public static function restartPHPWorker($className, $param = 'start'): void
    {
        $workerPath = self::getFilePathByClassName($className);
        if ( ! empty($workerPath)) {
            $command = "php -f {$workerPath}";
            self::processWorker($command, $param, $className, 'restart');
        }
    }

    /**
     * Try to find full path to php file by class name
     *
     * @param $className
     *
     * @return string|null
     */
    public static function getFilePathByClassName($className): ?string
    {
        $filename = null;
        try {
            $reflection = new ReflectionClass($className);
            $filename   = $reflection->getFileName();
        } catch (Exception $exception) {
            self::sysLogMsg('Util', 'Error ' . $exception->getMessage());
        }

        return $filename;
    }

    /**
     * Добавить сообщение в Syslog.
     *
     * @param     $log_name
     * @param     $text
     * @param int $level
     */
    public static function sysLogMsg($log_name, $text, $level = null)
    {
        $level = ($level == null) ? LOG_WARNING : $level;
        openlog("$log_name", LOG_PID | LOG_PERROR, LOG_AUTH);
        syslog($level, "$text");
        closelog();
    }

    /**
     * Управление процессом / демоном.
     * Получние информации по статусу процесса.
     *
     * @param $cmd
     * @param $param
     * @param $proc_name
     * @param $action
     * @param $out_file
     *
     * @return array | bool
     */
    public static function processWorker($cmd, $param, $proc_name, $action, $out_file = '/dev/null')
    {
        $path_kill  = self::which('kill');
        $path_nohup = self::which('nohup');

        if ( ! empty($param)) {
            $proc_str = $cmd . ' ' . trim($param);
        } else {
            $proc_str = $proc_name;
        }
        $WorkerPID = self::getPidOfProcess($proc_str);

        if ('status' === $action) {
            $status = ($WorkerPID !== '') ? 'Started' : 'Stoped';

            return ['status' => $status, 'app' => $proc_name, 'PID' => $WorkerPID];
        }
        $out = [];

        if ($WorkerPID !== '' && ('stop' === $action || 'restart' === $action)) {
            self::mwExec("$path_kill -9 $WorkerPID  > /dev/null 2>&1 &", $out);
            $WorkerPID = '';
        }

        if ($WorkerPID === '' && ('start' === $action || 'restart' === $action)) {
            self::mwExec("$path_nohup $cmd $param  > $out_file 2>&1 &", $out);
            // usleep(500000);
        }

        return true;
    }

    /**
     * @param $v
     *
     * @return string
     */
    public static function which($v): string
    {
        return $v;
    }

    /**
     * Возвращает PID процесса по его имени.
     *
     * @param        $name
     * @param string $exclude
     *
     * @return string
     */
    public static function getPidOfProcess($name, $exclude = ''): string
    {
        $path_ps   = self::which('ps');
        $path_grep = self::which('grep');
        $path_awk  = self::which('awk');

        $name       = addslashes($name);
        $filter_cmd = '';
        if ( ! empty($exclude)) {
            $filter_cmd = "| $path_grep -v " . escapeshellarg($exclude);
        }

        $out = [];
        self::mwExec(
            "$path_ps -A -o 'pid,args' {$filter_cmd} | $path_grep '$name' | $path_grep -v grep | $path_awk ' {print $1} '",
            $out
        );

        return trim(implode(' ', $out));
    }

    /**
     *
     */
    public static function restartModuleDependentWorkers(): void
    {
        // Завершение WorkerModelsEvents процесса перезапустит его.
        self::killByName(WorkerModelsEvents::class);
    }

    /**
     * Инициация телефонного звонка.
     *
     * @param string $peer_number
     * @param string $peer_mobile
     * @param string $dest_number
     *
     * @return array
     */
    public static function amiOriginate($peer_number, $peer_mobile, $dest_number): array
    {
        $am       = self::getAstManager('off');
        $channel  = 'Local/' . $peer_number . '@internal-originate';
        $context  = 'all_peers';
        $IS_ORGNT = self::generateRandomString();
        $variable = "_IS_ORGNT={$IS_ORGNT},pt1c_cid={$dest_number},_extenfrom1c={$peer_number},__peer_mobile={$peer_mobile},_FROM_PEER={$peer_number}";

        $result = $am->Originate($channel, $dest_number, $context, '1', null, null, null, null, $variable, null, '1');

        return $result;
    }

    /**
     * Получаем объект менеджер asterisk.
     *
     * @param string $events
     *
     * @return AGI_AsteriskManager
     */
    public static function getAstManager($events = 'on')
    {
        global $g;
        require_once 'phpagi.php';
        if (isset($g['AGI_AsteriskManager'])) {
            /** @var AGI_AsteriskManager $am */
            $am = $g['AGI_AsteriskManager'];
            // Проверка на разрыв соединения.
            if (is_resource($am->socket)) {
                $res = $am->sendRequestTimeout('Ping');
                if (isset($res['Response']) && trim($res['Response']) != '') {
                    // Уже есть подключенный экземпляр класса.
                    return $am;
                }
            } else {
                unset($g['AGI_AsteriskManager']);
            }
        }
        $config = new MikoPBXConfig();
        $port   = $config->getGeneralSettings('AMIPort');

        $am  = new AGI_AsteriskManager();
        $res = $am->connect("127.0.0.1:{$port}", null, null, $events);
        if (true === $res) {
            $g['AGI_AsteriskManager'] = $am;
        }

        return $am;
    }

    /**
     * Генератор произвольной строки.
     *
     * @param int $length
     *
     * @return string
     */
    public static function generateRandomString($length = 10): string
    {
        $characters       = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString     = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }

        return $randomString;
    }

    /**
     * Json validate
     *
     * @param $jsonString
     *
     * @return bool
     */
    public static function isJson($jsonString): bool
    {
        json_decode($jsonString, true);

        return (json_last_error() === JSON_ERROR_NONE);
    }

    /**
     *  Возвращает размер файла в Мб.
     *
     * @param $filename
     *
     * @return float|int
     */
    public static function mFileSize($filename)
    {
        $size = 0;
        if (file_exists($filename)) {
            $tmp_size = filesize($filename);
            if ($tmp_size !== false) {
                // Получим размер в Мб.
                $size = $tmp_size;
            }
        }

        return $size;
    }

    /**
     * Проверка авторизации.
     *
     * @param Phalcon\Http\Request $request
     *
     * @return bool
     */
    public static function checkAuthHttp($request)
    {
        $result   = false;
        $userName = $request->getServer('PHP_AUTH_USER');
        $password = $request->getServer('PHP_AUTH_PW');

        $data = file_get_contents('/var/etc/http_auth');
        if ("$data" == "{$userName}:{$password}") {
            $result = true;
        } else {
            openlog("miko_ajam", LOG_PID | LOG_PERROR, LOG_AUTH);
            syslog(
                LOG_WARNING,
                "From {$_SERVER['REMOTE_ADDR']}. UserAgent: ({$_SERVER['HTTP_USER_AGENT']}). Fail auth http."
            );
            closelog();
        }

        return $result;
    }

    /**
     * Возвращает указанное количество X.
     *
     * @param $length
     *
     * @return string
     */
    public static function getExtensionX($length): string
    {
        $extension = '';
        for ($i = 0; $i < $length; $i++) {
            $extension .= 'X';
        }

        return $extension;
    }

    /**
     * Проверяет существование файла.
     *
     * @param $filename
     *
     * @return bool
     */
    public static function recFileExists($filename): ?bool
    {
        if (file_exists($filename) && filesize($filename) > 0) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Если переданный параметр - число, то будет возвращена дата.
     *
     * @param $data
     *
     * @return string
     */
    public static function numberToDate($data): string
    {
        $re_number = '/^\d+.\d+$/';
        preg_match_all($re_number, $data, $matches, PREG_SET_ORDER, 0);
        if (count($matches) > 0) {
            $data = date('Y.m.d-H:i:s', $data);
        }

        return $data;
    }

    /**
     * Записывает данные в файл.
     *
     * @param $filename
     * @param $data
     */
    public static function fileWriteContent($filename, $data): void
    {
        /** @var \MikoPBX\Common\Models\CustomFiles $res */
        $res = CustomFiles::findFirst("filepath = '{$filename}'");

        $filename_orgn = "{$filename}.orgn";
        if (( $res === null || $res->mode === 'none') && file_exists($filename_orgn)) {
            unlink($filename_orgn);
        } elseif ($res !== null && $res->mode !== 'none') {
            // Запишем оригинальный файл.
            file_put_contents($filename_orgn, $data);
        }

        if ( ! $res) {
            // Файл еще не зарегистрирован в базе. Сделаем это.
            $res = new CustomFiles();
            $res->writeAttribute('filepath', $filename);
            $res->writeAttribute('mode', 'none');
            $res->save();
        } elseif ($res->mode === 'append') {
            // Добавить к файлу.
            $data .= "\n\n";
            $data .= base64_decode($res->content);
        } elseif ($res->mode === 'override') {
            // Переопределить файл.
            $data = base64_decode($res->content);
        }
        file_put_contents($filename, $data);
    }

    /**
     * Считывает содержимое файла, если есть разрешение.
     *
     * @param $filename
     * @param $needOriginal
     *
     * @return array
     */
    public static function fileReadContent($filename, $needOriginal = true): array
    {
        $result = [];
        $res    = CustomFiles::findFirst("filepath = '{$filename}'");
        if ($res !== null) {
            $filename_orgn = "{$filename}.orgn";
            if ($needOriginal && file_exists($filename_orgn)) {
                $filename = $filename_orgn;
            }
            $result['result'] = 'Success';
            $result['data']   = rawurlencode(file_get_contents($filename));
        } else {
            $result['result']  = 'ERROR';
            $result['data']    = '';
            $result['message'] = 'There is no access to the file';
        }

        return $result;
    }

    /**
     * Смена владельца файла.
     *
     * @param $filename
     * @param $user
     */
    public static function chown($filename, $user): void
    {
        if (file_exists($filename)) {
            chown($filename, $user);
            chgrp($filename, $user);
        }
    }

    /**
     * Создаем базу данных для логов, если требуется.
     */
    public static function CreateLogDB(): void
    {
        $di = Di::getDefault();
        if ($di===null) {
            self::sysLogMsg('CreateLogDB', 'Dependency injector does not initialized');
            return;
        }

        $db_path    = $di->getShared('config')->path('eventsLogDatabase.dbfile');
        $table_name = 'call_events';
        $db         = new Sqlite(['dbname' => $db_path]);
        if ( ! $db->tableExists($table_name)) {
            $type_str = ['type' => Column::TYPE_TEXT, 'default' => ''];
            $type_key = ['type' => Column::TYPE_INTEGER, 'notNull' => true, 'autoIncrement' => true, 'primary' => true];

            $columns = [
                new Column('id', $type_key),
                new Column('eventtime', $type_str),
                new Column('app', $type_str),
                new Column('linkedid', $type_str),
                new Column('datajson', $type_str),
            ];
            $result  = $db->createTable($table_name, '', ['columns' => $columns]);
            if ( ! $result) {
                self::sysLogMsg('CreateLogDB', 'Can not create db ' . $table_name);

                return;
            }
        }

        $index_names = [
            'eventtime' => 1,
            'linkedid'  => 1,
            'app'       => 1,
        ];

        $index_q = "SELECT" . " name FROM sqlite_master WHERE type='index' AND tbl_name='$table_name'";
        $indexes = $db->query($index_q)->fetchAll();
        foreach ($indexes as $index_data) {
            if (key_exists($index_data['name'], $index_names)) {
                unset($index_names[$index_data['name']]);
            }
        }
        foreach ($index_names as $index_name => $value) {
            $q      = "CREATE" . " INDEX IF NOT EXISTS i_call_events_{$index_name} ON {$table_name} ({$index_name})";
            $result = $db->query($q);
            if ( ! $result) {
                self::sysLogMsg('CreateLogDB', 'Can not create index ' . $index_name);

                return;
            }
        }
    }

    /**
     * @param string  $id
     * @param SQLite3 $db
     *
     * @return array
     */
    public static function GetLastDateLogDB($id, &$db = null): ?array
    {
        $di = Di::getDefault();
        if ($di===null) {
            self::sysLogMsg('CreateLogDB', 'Dependency injector does not initialized');
            return[];
        }

        if ($db == null) {
            $cdr_db_path = $di->getShared('config')->path('eventsLogDatabase.dbfile');
            $db          = new SQLite3($cdr_db_path);
        }
        $db->busyTimeout(5000);
        $eventtime = null;

        $q      = 'SELECT' . ' MAX(eventtime) AS eventtime FROM call_events WHERE linkedid="' . $id . '" GROUP BY linkedid';
        $result = $db->query($q);
        $row    = $result->fetchArray(SQLITE3_ASSOC);
        if ($row) {
            $eventtime = $row['eventtime'];
        }

        return $eventtime;
    }

    /**
     * Пишем лог в базу данных.
     *
     * @param $app
     * @param $data_obj
     */
    public static function logMsgDb($app, $data_obj): void
    {
        try {
            $data = new CallEventsLogs();
            $data->writeAttribute('eventtime', date("Y-m-d H:i:s"));
            $data->writeAttribute('app', $app);
            $data->writeAttribute('datajson', json_encode($data_obj, JSON_UNESCAPED_SLASHES));

            if (is_array($data_obj) && isset($data_obj['linkedid'])) {
                $data->writeAttribute('linkedid', $data_obj['linkedid']);
            }
            $data->save();
        } catch (Exception $e) {
            self::sysLogMsg('logMsgDb', $e->getMessage());
        }
    }

    /**
     * Возвращает текущую дату в виде строки с точностью до милисекунд.
     *
     * @return string
     */
    public static function getNowDate(): ?string
    {
        $result = null;
        try {
            $d      = new DateTime();
            $result = $d->format("Y-m-d H:i:s.v");
        } catch (Exception $e) {
            unset($e);
        }

        return $result;
    }

    /**
     * Delete file from disk by filepath
     *
     * @param $filePath
     *
     * @return array
     */
    public static function removeAudioFile($filePath): array
    {
        $result    = [];
        $extension = self::getExtensionOfFile($filePath);
        if ( ! in_array($extension, ['mp3', 'wav', 'alaw'])) {
            $result['result']  = 'Error';
            $result['message'] = "It is forbidden to remove the file $extension.";

            return $result;
        }

        if ( ! file_exists($filePath)) {
            $result['result']  = 'Success';
            $result['message'] = "File '{$filePath}' not found.";

            return $result;
        }

        $out = [];

        $arrDeletedFiles = [
            escapeshellarg(self::trimExtensionForFile($filePath) . ".wav"),
            escapeshellarg(self::trimExtensionForFile($filePath) . ".mp3"),
            escapeshellarg(self::trimExtensionForFile($filePath) . ".alaw"),
        ];


        self::mwExec("rm -rf " . implode(' ', $arrDeletedFiles), $out);
        if (file_exists($filePath)) {
            $result_str        = implode($out);
            $result['result']  = 'Error';
            $result['message'] = $result_str;
        } else {
            $result['result'] = 'Success';
        }

        return $result;
    }

    /**
     * Получает расширение файла.
     *
     * @param        $filename
     * @param string $delimiter
     *
     * @return mixed
     */
    public static function getExtensionOfFile($filename, $delimiter = '.')
    {
        $tmp_arr   = explode("$delimiter", $filename);
        $extension = $tmp_arr[count($tmp_arr) - 1];

        return $extension;
    }

    /**
     * Удаляет расширение файла.
     *
     * @param        $filename
     * @param string $delimiter
     *
     * @return string
     */
    public static function trimExtensionForFile($filename, $delimiter = '.'): string
    {
        // Отсечем расширение файла.
        $tmp_arr = explode("$delimiter", $filename);
        if (count($tmp_arr) > 1) {
            unset($tmp_arr[count($tmp_arr) - 1]);
            $filename = implode("$delimiter", $tmp_arr);
        }

        return $filename;
    }

    /**
     * Конвертация файла в wav 8000.
     *
     * @param $filename
     *
     * @return mixed
     */
    public static function convertAudioFile($filename)
    {
        $result = [];
        if ( ! file_exists($filename)) {
            $result['result']  = 'Error';
            $result['message'] = "File '{$filename}' not found.";

            return $result;
        }
        $out          = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);
        if (false === copy($filename, $tmp_filename)) {
            $result['result']  = 'Error';
            $result['message'] = "Unable to create temporary file '{$tmp_filename}'.";

            return $result;
        }

        // Принудительно устанавливаем расширение файла в wav.
        $n_filename     = self::trimExtensionForFile($filename) . ".wav";
        $n_filename_mp3 = self::trimExtensionForFile($filename) . ".mp3";
        // Конвертируем файл.
        $tmp_filename = escapeshellcmd($tmp_filename);
        $n_filename   = escapeshellcmd($n_filename);
        self::mwExec("/usr/bin/sox -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        self::mwExec("/usr/bin/lame -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Чистим мусор.
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Ошибка выполнения конвертации.
            $result['result']  = 'Error';
            $result['message'] = $result_str;

            return $result;
        }

        if ($filename !== $n_filename && $filename !== $n_filename_mp3) {
            @unlink($filename);
        }

        $result['result'] = 'Success';
        $result['data']   = $n_filename_mp3;

        return $result;
    }

    /**
     * Получаем размер файла / директории.
     *
     * @param $filename
     *
     * @return int
     */
    public static function getSizeOfFile($filename): int
    {
        $result = 0;
        if (file_exists($filename)) {
            self::mwExec("du -d 0 -k '{$filename}' | /usr/bin/awk  '{ print $1}'", $out);
            $time_str = implode($out);
            preg_match_all('/^\d+$/', $time_str, $matches, PREG_SET_ORDER, 0);
            if (count($matches) > 0) {
                $result = round(1 * $time_str / 1024, 2);
            }
        }

        return $result;
    }

    /**
     * Устанавливаем шрифт для консоли.
     */
    public static function setCyrillicFont(): void
    {
        self::mwExec("/usr/sbin/setfont /usr/share/consolefonts/Cyr_a8x16.psfu.gz 2>/dev/null");
    }

    /**
     * Получить перевод строки текста.
     *
     * @param $text
     *
     * @return mixed
     */
    public static function translate($text)
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getShared('translation')->_($text);
        } else {
            return $text;
        }
    }

    /**
     * Check if all the parts exist, and
     * gather all the parts of the file together
     *
     * @param string $temp_dir    - the temporary directory holding all the parts of the file
     * @param string $fileName    - the original file name
     * @param string $totalSize   - original file size (in bytes)
     * @param string $total_files - original file size (in bytes)
     * @param string $result_file - original file size (in bytes)
     * @param string $chunkSize   - each chunk size (in bytes)
     *
     * @return bool
     */
    public static function createFileFromChunks(
        $temp_dir,
        $fileName,
        $totalSize,
        $total_files,
        $result_file = '',
        $chunkSize = 0
    ): bool {
        // count all the parts of this file
        $total_files_on_server_size = 0;
        foreach (scandir($temp_dir) as $file) {
            $temp_total                 = $total_files_on_server_size;
            $tempfilesize               = filesize($temp_dir . '/' . $file);
            $total_files_on_server_size = $temp_total + $tempfilesize;
        }
        // check that all the parts are present
        // If the Size of all the chunks on the server is equal to the size of the file uploaded.
        if ($total_files_on_server_size >= $totalSize) {
            // Загрузка завершена.
            return true;
        }

        // Загрузка еще не завершена. Часть файла успешно сохранена.
        return false;
    }

    /**
     * @param        $temp_dir
     * @param        $fileName
     * @param        $total_files
     * @param string $result_file
     * @param string $progress_dir
     *
     * @return bool|string
     */
    public static function mergeFilesInDirectory(
        $temp_dir,
        $fileName,
        $total_files,
        $result_file = '',
        $progress_dir = ''
    ) {
        if (empty($result_file)) {
            $result_file = dirname($temp_dir) . '/' . $fileName;
        }

        $show_progress = file_exists($progress_dir);
        $progress_file = $progress_dir . '/progress';
        if ($show_progress && ! file_exists($progress_file)) {
            file_put_contents($progress_file, '0');
        }

        // create the final destination file
        if (($fp = fopen($result_file, 'w')) !== false) {
            for ($i = 1; $i <= $total_files; $i++) {
                $tmp_file = $temp_dir . '/' . $fileName . '.part' . $i;
                fwrite($fp, file_get_contents($tmp_file));
                // Удаляем временный файл.
                unlink($tmp_file);
                if ($show_progress) {
                    file_put_contents($progress_file, round($i / $total_files * 100), 2);
                }
            }
            fclose($fp);
        } else {
            self::sysLogMsg('UploadFile', 'cannot create the destination file - ' . $result_file);

            return false;
        }
        self::sysLogMsg('UploadFile', 'destination file - ' . $result_file);
        // rename the temporary directory (to avoid access from other
        // concurrent chunks uploads) and than delete it
        if (rename($temp_dir, $temp_dir . '_UNUSED')) {
            self::rRmDir($temp_dir . '_UNUSED');
        } else {
            self::rRmDir($temp_dir);
        }

        if ($show_progress) {
            file_put_contents($progress_file, 100);
        }

        // Загрузка завершена. Возвращаем путь к файлу.
        return $result_file;
    }

    /**
     *
     * Delete a directory RECURSIVELY
     *
     * @param string $dir - directory path
     *
     * @link http://php.net/manual/en/function.rmdir.php
     */
    public static function rRmDir($dir): void
    {
        if (is_dir($dir)) {
            $objects = scandir($dir);
            foreach ($objects as $object) {
                if ($object != "." && $object != "..") {
                    if (filetype($dir . "/" . $object) == "dir") {
                        self::rRmDir($dir . "/" . $object);
                    } else {
                        unlink($dir . "/" . $object);
                    }
                }
            }
            reset($objects);
            rmdir($dir);
        }
    }

    /**
     * Генерация сертификата средствами openssl.
     *
     * @param null $options
     * @param null $config_args_pkey
     * @param null $config_args_csr
     *
     * @return array
     */
    public static function generateSslCert($options = null, $config_args_pkey = null, $config_args_csr = null): array
    {
        // Инициализация настроек.
        if ( ! $options) {
            $options = [
                "countryName"            => 'RU',
                "stateOrProvinceName"    => 'Moscow',
                "localityName"           => 'Zelenograd',
                "organizationName"       => 'MIKO LLC',
                "organizationalUnitName" => 'Software development',
                "commonName"             => 'MIKO PBX',
                "emailAddress"           => 'info@miko.ru',
            ];
        }

        if ( ! $config_args_csr) {
            $config_args_csr = ['digest_alg' => 'sha256'];
        }

        if ( ! $config_args_pkey) {
            $config_args_pkey = [
                "private_key_bits" => 2048,
                "private_key_type" => OPENSSL_KEYTYPE_RSA,
            ];
        }

        // Генерация ключей.
        $private_key = openssl_pkey_new($config_args_pkey);
        $csr         = openssl_csr_new($options, $private_key, $config_args_csr);
        $x509        = openssl_csr_sign($csr, null, $private_key, $days = 3650, $config_args_csr);

        // Экспорт ключей.
        openssl_x509_export($x509, $certout);
        openssl_pkey_export($private_key, $pkeyout);
        // echo $pkeyout; // -> WEBHTTPSPrivateKey
        // echo $certout; // -> WEBHTTPSPublicKey
        return ['PublicKey' => $certout, 'PrivateKey' => $pkeyout];
    }

    /**
     * @return bool
     */
    public static function isSystemctl(): bool
    {
        return (stripos(php_uname('v'), 'debian') !== false);
    }

    /**
     * Выводить текстовое сообщение "done" подсвечивает зеленым цветом.
     */
    public static function echoGreenDone(): void
    {
        echo "\033[32;1mdone\033[0m \n";
    }

    /**
     * Создание символической ссылки, если необходимо.
     *
     * @param $target
     * @param $link
     *
     * @return bool
     */
    public static function createUpdateSymlink($target, $link): bool
    {
        $need_create_link = true;
        if (is_link($link)) {
            $old_target       = readlink($link);
            $need_create_link = ($old_target != $target);
            // Если необходимо, удаляем старую ссылку.
            if ($need_create_link) {
                self::mwExec("cp {$old_target}/* {$target}");
                unlink($link);
            }
        } elseif (is_dir($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            rmdir($link);
        } elseif (file_exists($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            unlink($link);
        }
        if ( ! file_exists($target)) {
            self::mwExec("mkdir -p {$target}");
        }
        if ($need_create_link) {
            self::mwExec("ln -s {$target}  {$link}");
        }

        return $need_create_link;
    }

    /**
     * Print message and write it to syslog
     */
    public static function echoWithSyslog($message): void
    {
        echo $message . PHP_EOL;
        self::sysLogMsg(static::class, $message, LOG_INFO);
    }

    /**
     * Добавляем задачу для уведомлений.
     *
     * @param string $tube
     * @param        $data
     */
    public function addJobToBeanstalk($tube, $data): void
    {
        $queue = new BeanstalkClient($tube);
        $queue->publish(json_encode($data));
    }
}