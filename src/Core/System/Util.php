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

namespace MikoPBX\Core\System;

use DateTime;
use Exception;
use MikoPBX\Common\Models\{CallEventsLogs, CustomFiles};
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Core\Asterisk\AsteriskManager;
use Phalcon\Di;
use ReflectionClass;
use ReflectionException;
use Throwable;

/**
 * Universal commands and procedures
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
     * Инициация телефонного звонка.
     *
     * @param $peer_number
     * @param $peer_mobile
     * @param $dest_number
     *
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

        return $am->Originate(
            $channel,
            $dest_number,
            $context,
            '1',
            null,
            null,
            null,
            null,
            $variable,
            null,
            true
        );
    }

    /**
     * Получаем объект менеджер asterisk.
     *
     * @param string $events
     *
     * @return AsteriskManager
     */
    public static function getAstManager($events = 'on'): AsteriskManager
    {
        if ($events === 'on') {
            $nameService = 'amiListner';
        } else {
            $nameService = 'amiCommander';
        }

        $di = Di::getDefault();
        $am = $di->getShared($nameService);
        if (is_resource($am->socket)) {
            return $am;
        }

        return $di->get($nameService);
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
            try {
                $randomString .= $characters[random_int(0, $charactersLength - 1)];
            } catch (Throwable $e) {
                $randomString = '';
            }
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

        if ($res === null) {
            // Файл еще не зарегистрирован в базе. Сделаем это.
            $res = new CustomFiles();
            $res->writeAttribute('filepath', $filename);
            $res->writeAttribute('mode', 'none');
            $res->save();
        } elseif ($res->mode === 'append') {
            // Добавить к файлу.
            $data .= "\n\n";
            $data .= base64_decode((string)$res->content);
        } elseif ($res->mode === 'override') {
            // Переопределить файл.
            $data = base64_decode((string)$res->content);
        }
        file_put_contents($filename, $data);
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
        } catch (Throwable $e) {
            self::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
        }
    }

    /**
     * Adds messages to Syslog.
     *
     * @param string $ident category, class, method
     * @param string $message log message
     * @param int $level log level https://docs.phalcon.io/4.0/en/logger#constants
     *
     */
    public static function sysLogMsg(string $ident, string $message, $level = LOG_WARNING): void
    {
        /** @var \Phalcon\Logger $logger */
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log($level, "{$message} on {$ident}" );
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
     * Получает расширение файла.
     *
     * @param        $filename
     *
     * @return mixed
     */
    public static function getExtensionOfFile($filename)
    {
        $path_parts = pathinfo($filename);

        return $path_parts['extension'] ?? '';
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
     * Получаем размер файла / директории.
     *
     * @param $filename
     *
     * @return float
     */
    public static function getSizeOfFile($filename): float
    {
        $result = 0;
        if (file_exists($filename)) {
            $duPath  = self::which('du');
            $awkPath = self::which('awk');
            Processes::mwExec("{$duPath} -d 0 -k '{$filename}' | {$awkPath}  '{ print $1}'", $out);
            $time_str = implode($out);
            preg_match_all('/^\d+$/', $time_str, $matches, PREG_SET_ORDER, 0);
            if (count($matches) > 0) {
                $result = round(1 * $time_str / 1024, 2);
            }
        }

        return $result;
    }

    /**
     * Return full path to executable binary
     *
     * @param string $cmd - name of file
     *
     * @return string
     */
    public static function which(string $cmd): string
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
     * DEPRICATED
     * Executes command exec().
     *
     * @param $command
     * @param $outArr
     * @param $retVal
     *
     * @return int
     */
    public static function mwExec($command, &$outArr = null, &$retVal = null): int
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);

        return Processes::mwExec($command, $outArr, $retVal);
    }

    /**
     * Устанавливаем шрифт для консоли.
     */
    public static function setCyrillicFont(): void
    {
        $setfontPath = self::which('setfont');
        Processes::mwExec("{$setfontPath} /usr/share/consolefonts/Cyr_a8x16.psfu.gz 2>/dev/null");
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
     *
     * Delete a directory RECURSIVELY
     *
     * @param string $dir - directory path
     *
     * @link http://php.net/manual/en/function.rmdir.php
     */
    public static function rRmDir(string $dir): void
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
            if ($objects !== false) {
                reset($objects);
            }
            rmdir($dir);
        }
    }

    /**
     * Генерация сертификата средствами openssl.
     *
     * @param ?array $options
     * @param ?array $config_args_pkey
     * @param ?array $config_args_csr
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

    public static function isDocker(): bool
    {
        return file_exists('/.dockerenv');
    }

    /**
     * Выводить текстовое сообщение "done" подсвечивает зеленым цветом.
     */
    public static function echoDone(bool $result=true): void
    {
        $pos    = self::getCursorPosition();
        $cols   = self::getCountCols();
        $spaces = str_repeat(' ', $cols - $pos - 6);
        if($result === false){
            echo $spaces."\033[31;1mFAIL\033[0m \n";
        }else{
            echo $spaces."\033[32;1mDONE\033[0m \n";
        }
    }

    public static function getCursorPosition():string
    {
        // Example response string.
        $ttyprops = trim(shell_exec('stty -g'));
        system('stty -icanon -echo');
        $term = fopen('/dev/tty', 'w');
        fwrite($term, "\033[6n");
        fclose($term);

        $buf = fread(STDIN, 16);

        $matches = [];
        preg_match('/^\033\[(\d+);(\d+)R$/', $buf, $matches);
        system("stty '$ttyprops'");
        return $matches[2]??'0';
    }

    public static function getCountCols():string
    {
        return shell_exec('tput cols');
    }

    /**
     * Создание символической ссылки, если необходимо.
     *
     * @param $target
     * @param $link
     * @param bool $isFile
     *
     * @return bool
     */
    public static function createUpdateSymlink($target, $link, $isFile=false): bool
    {
        $need_create_link = true;
        if (is_link($link)) {
            $old_target       = readlink($link);
            $need_create_link = ($old_target != $target);
            // Если необходимо, удаляем старую ссылку.
            if ($need_create_link) {
                $cpPath = self::which('cp');
                Processes::mwExec("{$cpPath} {$old_target}/* {$target}");
                unlink($link);
            }
        } elseif (is_dir($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            rmdir($link);
        } elseif (file_exists($link)) {
            // Это должна быть именно ссылка. Файл удаляем.
            unlink($link);
        }
        if($isFile === false){
            self::mwMkdir($target);
        }
        if ($need_create_link) {
            $lnPath = self::which('ln');
            Processes::mwExec("{$lnPath} -s {$target}  {$link}");
        }

        return $need_create_link;
    }

    /**
     * Create folder if it not exist.
     *
     * @param      $parameters string one or multiple paths separated by space
     *
     * @param bool $addWWWRights
     *
     * @return bool
     */
    public static function mwMkdir(string $parameters, bool $addWWWRights = false): bool
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
                        self::sysLogMsg('Util', 'Error on create folder ' . $path, LOG_ERR);
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
            Processes::mwExec("{$findPath} {$folder} -type d -exec {$chmodPath} 755 {} \;");
            Processes::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 644 {} \;");
            Processes::mwExec("{$chownPath} -R www:www {$folder}");
        }
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
     * Apply executable rights for files
     *
     * @param $folder
     */
    public static function addExecutableRights($folder): void
    {
        if (posix_getuid() === 0) {
            $findPath  = self::which('find');
            $chmodPath = self::which('chmod');
            Processes::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 755 {} \;");
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
                    $key       = '';
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

    /**
     * Converts multidimensional array into single array
     *
     * @param $array
     *
     * @return array
     */
    public static function flattenArray(array $array)
    {
        $result = [];
        foreach ($array as $value) {
            if (is_array($value)) {
                $result = array_merge($result, self::flattenArray($value));
            } else {
                $result[] = $value;
            }
        }

        return $result;
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
        } catch (ReflectionException $exception) {
            self::sysLogMsg(__METHOD__, 'ReflectionException ' . $exception->getMessage(), LOG_ERR);
        }

        return $filename;
    }

    /**
     * DEPRICATED
     * Возвращает PID процесса по его имени.
     *
     * @param        $name
     * @param string $exclude
     *
     * @return string
     */
    public static function getPidOfProcess($name, $exclude = ''): string
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);

        return Processes::getPidOfProcess($name, $exclude);
    }

    /**
     * DEPRICATED
     * Manages a daemon/worker process
     * Returns process statuses by name of it
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
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);

        return Processes::processWorker($cmd, $param, $proc_name, $action, $out_file);
    }

    /**
     * DEPRICATED
     * Process PHP workers
     *
     * @param string $className
     * @param string $param
     * @param string $action
     */
    public static function processPHPWorker(
        string $className,
        string $param = 'start',
        string $action = 'restart'
    ): void {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::processPHPWorker($className, $param, $action);
    }

    /**
     * DEPRICATED
     * Kills process/daemon by name
     *
     * @param $procName
     *
     * @return int|null
     */
    public static function killByName($procName): ?int
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);

        return Processes::killByName($procName);
    }

    /**
     * DEPRICATED
     * Executes command exec() as background process.
     *
     * @param $command
     * @param $out_file
     * @param $sleep_time
     */
    public static function mwExecBg($command, $out_file = '/dev/null', $sleep_time = 0): void
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::mwExecBg($command, $out_file, $sleep_time);
    }

    /**
     * DEPRICATED
     * Executes command exec() as background process with an execution timeout.
     *
     * @param        $command
     * @param int    $timeout
     * @param string $logname
     */
    public static function mwExecBgWithTimeout($command, $timeout = 4, $logname = '/dev/null'): void
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::mwExecBgWithTimeout($command, $timeout, $logname);
    }

    /**
     * DEPRICATED
     * Executes multiple commands.
     *
     * @param        $arr_cmds
     * @param array  $out
     * @param string $logname
     */
    public static function mwExecCommands($arr_cmds, &$out = [], $logname = ''): void
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::mwExecCommands($arr_cmds, $out, $logname);
    }

    /**
     * Добавляем задачу для уведомлений.
     *
     * @param string $tube
     * @param        $data
     */
    public function addJobToBeanstalk(string $tube, $data): void
    {
        $queue = new BeanstalkClient($tube);
        $queue->publish(json_encode($data));
    }


}