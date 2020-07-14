<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Core\System;

use AGI_AsteriskManager;
use DateTime;
use Exception;
use MikoPBX\Common\Models\{CallEventsLogs, CustomFiles};
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
        $findPath    = self::which('find');
        self::mwExec("{$findPath} {$dir_all_log}" . '/ -name *_start_all_log* | xargs rm -rf');
        // Получим каталог с логами.
        $dirlog = $dir_all_log . '/dir_start_all_log';
        self::mwMkdir($dirlog);

        $pingPath = self::which('ping');
        self::mwExecBg("{$pingPath} 8.8.8.8 -w 2", "{$dirlog}/ping_8888.log");
        self::mwExecBg("{$pingPath} ya.ru -w 2", "{$dirlog}/ping_8888.log");

        $opensslPath = self::which('openssl');
        self::mwExecBgWithTimeout(
            "{$opensslPath} s_client -connect lm.miko.ru:443 > {$dirlog}/openssl_lm_miko_ru.log",
            1
        );
        self::mwExecBgWithTimeout(
            "{$opensslPath} s_client -connect lic.miko.ru:443 > {$dirlog}/openssl_lic_miko_ru.log",
            1
        );
        $routePath = self::which('route');
        self::mwExecBg("{$routePath} -n ", " {$dirlog}/rout_n.log");

        $asteriskPath = self::which('asterisk');
        self::mwExecBg("{$asteriskPath} -rx 'pjsip show registrations' ", " {$dirlog}/pjsip_show_registrations.log");
        self::mwExecBg("{$asteriskPath} -rx 'pjsip show endpoints' ", " {$dirlog}/pjsip_show_endpoints.log");
        self::mwExecBg("{$asteriskPath} -rx 'pjsip show contacts' ", " {$dirlog}/pjsip_show_contacts.log");

        $php_log = '/var/log/php_error.log';
        if (file_exists($php_log)) {
            $cpPath = self::which('cp');
            self::mwExec("{$cpPath} {$php_log} {$dirlog}");
        }

        $network     = new Network();
        $arr_eth     = $network->getInterfacesNames();
        $tcpdumpPath = self::which('tcpdump');
        foreach ($arr_eth as $eth) {
            self::mwExecBgWithTimeout(
                "{$tcpdumpPath} -i {$eth} -n -s 0 -vvv -w {$dirlog}/{$eth}.pcap",
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

        $rmPath   = self::which('rm');
        $findPath = self::which('find');
        $za7Path  = self::which('7za');
        $cpPath   = self::which('cp');

        $dirlog = $dir_all_log . '/dir_start_all_log';
        self::mwMkdir($dirlog);

        $log_dir = System::getLogDir();
        self::mwExec("{$cpPath} -R {$log_dir} {$dirlog}");

        $result = $dir_all_log . '/arhive_start_all_log.zip';
        if (file_exists($result)) {
            self::mwExec("{$rmPath} -rf {$result}");
        }
        // Пакуем логи.
        self::mwExec("{$za7Path} a -tzip -mx0 -spf '{$result}' '{$dirlog}'");
        // Удаляем логи. Оставляем только архив.
        self::mwExec("{$findPath} {$dir_all_log}" . '/ -name *_start_all_log | xargs rm -rf');

        if (file_exists($dirlog)) {
            self::mwExec("{$findPath} {$dirlog}" . '/ -name license.key | xargs rm -rf');
        }
        // Удаляем каталог логов.
        self::mwExecBg("{$rmPath} -rf {$dirlog}");

        return $result;
    }

    /**
     * Завершаем процесс по имени.
     *
     * @param $procName
     *
     * @return int|null
     */
    public static function killByName($procName): ?int
    {
        $killallPath = self::which('killall');

        return self::mwExec($killallPath . ' ' . escapeshellarg($procName));
    }

    /**
     * Выполняет системную команду exec().
     *
     * @param      $command
     * @param null $oarr
     * @param null $retval
     *
     * @return int
     */
    public static function mwExec($command, &$oarr = null, &$retval = null): ?int
    {
        $retval = 0;
        $oarr   = [];
        $di     = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
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
    public static function mwExecBg($command, $out_file = '/dev/null', $sleep_time = 0): void
    {
        $nohupPath = self::which('nohup');
        $shPath    = self::which('sh');
        $rmPath    = self::which('rm');
        $sleepPath = self::which('sleep');
        if ($sleep_time > 0) {
            $filename = '/tmp/' . time() . '_noop.sh';
            file_put_contents($filename, "{$sleepPath} {$sleep_time}; {$command}; {$rmPath} -rf {$filename}");
            $noop_command = "{$nohupPath} {$shPath} {$filename} > {$out_file} 2>&1 &";
        } else {
            $noop_command = "{$nohupPath} {$command} > {$out_file} 2>&1 &";
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
    public static function mwExecBgWithTimeout($command, $timeout = 4, $logname = '/dev/null'): void
    {
        $di = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExecBg(): $command\n";

            return;
        }
        $nohupPath   = self::which('nohup');
        $timeoutPath = self::which('timeout');
        exec("{$nohupPath} {$timeoutPath} -t {$timeout} {$command} > {$logname} 2>&1 &");
    }

    /**
     * Выполнение нескольких команд.
     *
     * @param        $arr_cmds
     * @param array  $out
     * @param string $logname
     */
    public static function mwExecCommands($arr_cmds, &$out = [], $logname = ''): void
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
     * Create folder if it not exist
     *
     * @param      $parameters string one or multiple paths separated by space
     *
     * @param bool $addWWWRights
     *
     * @return bool
     */
    public static function mwMkdir(string $parameters, bool $addWWWRights=false): bool
    {
        $result = true;
        if (posix_getuid() === 0) {
            $arrPaths = explode(' ', $parameters);
            if (count($arrPaths) > 0) {
                foreach ($arrPaths as $path) {
                    if ( ! empty($path)
                        && ! file_exists($path)
                        && ! mkdir($path, 0755, true)
                        && ! is_dir($path)) {
                        $result = false;
                    }
                    if ($addWWWRights) {
                        self::addRegularWWWRights($path);
                    }
                }
            }
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
    public static function sysLogMsg($log_name, $text, $level = null): void
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

        $WorkerPID = self::getPidOfProcess($proc_name);

        if ('status' === $action) {
            $status = ($WorkerPID !== '') ? 'Started' : 'Stoped';

            return ['status' => $status, 'app' => $proc_name, 'PID' => $WorkerPID];
        }
        $out = [];

        if ($WorkerPID !== '' && ('stop' === $action || 'restart' === $action)) {
            self::mwExec("{$path_kill} -9 {$WorkerPID}  > /dev/null 2>&1 &", $out);
            $WorkerPID = '';
        }

        if ($WorkerPID === '' && ('start' === $action || 'restart' === $action)) {
            self::mwExec("{$path_nohup} {$cmd} {$param}  > {$out_file} 2>&1 &", $out);
            // usleep(500000);
        }

        return true;
    }

    /**
     * Return full path to executable binary
     *
     * @param string $cmd - name of file
     *
     * @return string
     */
    public static function which($cmd): string
    {
        global $_ENV;
        if (array_key_exists('PATH', $_ENV)) {
            $binaryFolders = $_ENV['PATH'];

            foreach (explode(':', $binaryFolders) as $path) {
                if (is_executable("{$path}/{$cmd}")) {
                    return "{$path}/{$cmd}";
                }
            }
        }
        $binaryFolders =
            [
                '/bin',
                '/sbin',
                '/usr/bin',
                '/usr/sbin',
                '/usr/local/bin',
                '/usr/local/sbin',
            ];
        foreach ($binaryFolders as $path) {
            if (is_executable("{$path}/{$cmd}")) {
                return "{$path}/{$cmd}";
            }
        }

        return $cmd;
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
            "{$path_ps} -A -o 'pid,args' {$filter_cmd} | {$path_grep} '{$name}' | {$path_grep} -v grep | {$path_awk} ' {print $1} '",
            $out
        );

        return trim(implode(' ', $out));
    }

    /**
     * Инициация телефонного звонка.
     * @param $peer_number
     * @param $peer_mobile
     * @param $dest_number
     * @return array
     * @throws Exception
     */
    public static function amiOriginate($peer_number, $peer_mobile, $dest_number): array
    {
        $am       = self::getAstManager('off');
        $channel  = 'Local/' . $peer_number . '@internal-originate';
        $context  = 'all_peers';
        $IS_ORGNT = self::generateRandomString();
        $variable = "_IS_ORGNT={$IS_ORGNT},pt1c_cid={$dest_number},_extenfrom1c={$peer_number},__peer_mobile={$peer_mobile},_FROM_PEER={$peer_number}";

        return $am->Originate($channel,
                              $dest_number,
                              $context,
                      '1', null, null, null, null, $variable, null, true);
    }

    /**
     * Получаем объект менеджер asterisk.
     *
     * @param string $events
     *
     * @return AGI_AsteriskManager
     */
    public static function getAstManager($events = 'on'): AGI_AsteriskManager
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
     * @param int $length
     * @return string
     * @throws Exception
     */
    public static function generateRandomString($length = 10): string
    {
        $characters       = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString     = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[random_int(0, $charactersLength - 1)];
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
        return (file_exists($filename) && filesize($filename) > 0);
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
        /** @var CustomFiles $res */
        $res = CustomFiles::findFirst("filepath = '{$filename}'");

        $filename_orgn = "{$filename}.orgn";
        if (($res === null || $res->mode === 'none') && file_exists($filename_orgn)) {
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

        $rmPath = self::which('rm');
        self::mwExec("{$rmPath} -rf " . implode(' ', $arrDeletedFiles), $out);
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
     * @return mixed
     */
    public static function getExtensionOfFile($filename)
    {
        $path_parts = pathinfo($filename);
        return $path_parts['extension'];
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
        $tmp_arr = explode((string)$delimiter, $filename);
        if (count($tmp_arr) > 1) {
            unset($tmp_arr[count($tmp_arr) - 1]);
            $filename = implode((string)$delimiter, $tmp_arr);
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
        $soxPath      = self::which('sox');
        self::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        $lamePath = self::which('lame');
        self::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
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
            $duPath  = self::which('du');
            $awkPath = self::which('awk');
            self::mwExec("{$duPath} -d 0 -k '{$filename}' | {$awkPath}  '{ print $1}'", $out);
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
        $setfontPath = self::which('setfont');
        self::mwExec("{$setfontPath} /usr/share/consolefonts/Cyr_a8x16.psfu.gz 2>/dev/null");
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
     * @param string $temp_dir - the temporary directory holding all the parts of the file
     * @param string $totalSize - original file size (in bytes)
     * @return bool
     */
    public static function createFileFromChunks($temp_dir, $totalSize): bool {
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
     * @param array $options
     * @param array $config_args_pkey
     * @param array $config_args_csr
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
                $cpPath = self::which('cp');
                self::mwExec("{$cpPath} {$old_target}/* {$target}");
                unlink($link);
            }
        } elseif (is_dir($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            rmdir($link);
        } elseif (file_exists($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            unlink($link);
        }
        self::mwMkdir($target);
        if ($need_create_link) {
            $lnPath = self::which('ln');
            self::mwExec("{$lnPath} -s {$target}  {$link}");
        }

        return $need_create_link;
    }

    /**
     * Print message and write it to syslog
     *
     * @param $message
     */
    public static function echoWithSyslog($message): void
    {
        echo $message;
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

    /**
     * Apply regular rights for folders and files
     *
     * @param $folder
     */
    public static function addRegularWWWRights($folder): void
    {
        if (posix_getuid() === 0) {
            $findPath  = self::which('find');
            $chownPath = self::which('chown');
            $chmodPath = self::which('chmod');
            self::mwExec("{$findPath} {$folder} -type d -exec {$chmodPath} 755 {} \;");
            self::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 644 {} \;");
            self::mwExec("{$chownPath} -R www:www {$folder}");
        }
    }

    /**
     * Apply executable rights for files
     *
     * @param $folder
     */
    public static function addExecutableRights($folder): void
    {
        if (posix_getuid() === 0) {
            $findPath  = self::which('find');
            $chmodPath = self::which('chmod');
            self::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 755 {} \;");
        }
    }

    /**
     * Разбор INI конфига
     *
     * @param string $manual_attributes
     *
     * @return array
     */
    public static function parseIniSettings(string $manual_attributes): array
    {
        $tmp_data = base64_decode($manual_attributes);
        if (base64_encode($tmp_data) === $manual_attributes) {
            $manual_attributes = $tmp_data;
        }
        unset($tmp_data);
        // TRIMMING
        $tmp_arr = explode("\n", $manual_attributes);
        foreach ($tmp_arr as &$row) {
            $row = trim($row);
            $pos = strpos($row, ']');
            if ($pos !== false && strpos($row, '[') === 0) {
                $row = "\n" . substr($row, 0, $pos);
            }
        }
        unset($row);
        $manual_attributes = implode("\n", $tmp_arr);
        // TRIMMING END

        $manual_data = [];
        $sections    = explode("\n[", str_replace(']', '', $manual_attributes));
        foreach ($sections as $section) {
            $data_rows    = explode("\n", trim($section));
            $section_name = trim($data_rows[0] ?? '');
            if ( ! empty($section_name)) {
                unset($data_rows[0]);
                $manual_data[$section_name] = [];
                foreach ($data_rows as $row) {
                    if (strpos($row, '=') === false) {
                        continue;
                    }
                    $key = '';
                    $arr_value = explode('=', $row);
                    if (count($arr_value) > 1) {
                        $key = trim($arr_value[0]);
                        unset($arr_value[0]);
                        $value = trim(implode('=', $arr_value));
                    }
                    if (empty($value) || empty($key)) {
                        continue;
                    }
                    $manual_data[$section_name][$key] = $value;
                }
            }
        }

        return $manual_data;
    }




}