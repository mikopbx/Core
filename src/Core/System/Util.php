<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\{CustomFiles};
use MikoPBX\Common\Providers\AmiConnectionCommand;
use MikoPBX\Common\Providers\AmiConnectionListener;
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Asterisk\AsteriskManager;
use Phalcon\Di;
use ReflectionClass;
use ReflectionException;
use Throwable;

/**
 * Class Util
 *
 * Universal commands and procedures
 *
 * @package MikoPBX\Core\System
 */
class Util
{

    /**
     * Overrides configuration array with manual attributes for a specific section.
     *
     * @param array $options The original configuration options.
     * @param array|null $manual_attributes The manual attributes to override the options.
     * @param string $section The section to override.
     *
     * @return string The resulting configuration string.
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
     * Initiates a call using the Asterisk Manager Interface (AMI).
     *
     * @param string $peer_number The peer number.
     * @param string $peer_mobile The peer mobile number.
     * @param string $dest_number The destination number.
     *
     * @return array The result of the Originate command.
     */
    public static function amiOriginate(string $peer_number, string $peer_mobile, string $dest_number): array
    {
        $am = self::getAstManager('off');
        $channel = 'Local/' . $peer_number . '@internal-originate';
        $context = 'all_peers';
        $variable = "pt1c_cid={$dest_number},__peer_mobile={$peer_mobile}";

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
     * Retrieves the Asterisk Manager object.
     *
     * @param string $events Whether to enable events or commands.
     *
     * @return AsteriskManager The Asterisk Manager object.
     *
     * @throws \Phalcon\Exception
     */
    public static function getAstManager(string $events = 'on'): AsteriskManager
    {
        if ($events === 'on') {
            $nameService = AmiConnectionListener::SERVICE_NAME;
        } else {
            $nameService = AmiConnectionCommand::SERVICE_NAME;
        }
        $di = Di::getDefault();
        if ($di === null) {
            throw new \Phalcon\Exception("di not found");
        }
        $am = $di->getShared($nameService);
        if (is_resource($am->socket)) {
            return $am;
        }

        return $di->get($nameService);
    }

    /**
     * Generates a random string of a given length.
     *
     * @param int $length The length of the random string (default: 10).
     *
     * @return string The generated random string.
     */
    public static function generateRandomString($length = 10): string
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';
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
     * Validates if a string is a valid JSON.
     *
     * @param mixed $jsonString The string to validate.
     *
     * @return bool True if the string is a valid JSON, false otherwise.
     */
    public static function isJson($jsonString): bool
    {
        json_decode($jsonString, true);

        return (json_last_error() === JSON_ERROR_NONE);
    }

    /**
     * Returns the size of a file in megabytes.
     *
     * @param string $filename The filename.
     *
     * @return float|int The size of the file in megabytes.
     */
    public static function mFileSize(string $filename)
    {
        $size = 0;
        if (file_exists($filename)) {
            $tmp_size = filesize($filename);
            if ($tmp_size !== false) {
                // Convert size to megabytes
                $size = $tmp_size;
            }
        }

        return $size;
    }

    /**
     * Returns a string with the specified number of 'X' characters.
     *
     * @param int $length The length of the string.
     *
     * @return string The string with 'X' characters.
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
     * Checks if a file exists and has a non-zero size.
     *
     * @param string $filename The filename.
     *
     * @return bool True if the file exists and has a non-zero size, false otherwise.
     */
    public static function recFileExists($filename): ?bool
    {
        return (file_exists($filename) && filesize($filename) > 0);
    }

    /**
     * Converts a number to a date if the input is numeric.
     *
     * @param mixed $data The input data.
     *
     * @return string The converted date string or the original input data.
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
     * Writes content to a file.
     *
     * @param string $filename The path of the file.
     * @param mixed $data The data to write to the file.
     *
     * @return void
     */
    public static function fileWriteContent($filename, $data): void
    {
        /** @var CustomFiles $res */
        $res = CustomFiles::findFirst("filepath = '{$filename}'");

        $filename_orgn = "{$filename}.orgn";

        // Check if CustomFiles entry exists and its mode is 'none'
        if (($res === null || $res->mode === 'none') && file_exists($filename_orgn)) {
            unlink($filename_orgn);
        } // Check if CustomFiles entry exists and its mode is not 'none'
        elseif ($res !== null && $res->mode !== 'none') {
            // Write the original file
            file_put_contents($filename_orgn, $data);
        }

        if ($res === null) {
            // File is not yet registered in the database, create a new CustomFiles entry
            $res = new CustomFiles();
            $res->writeAttribute('filepath', $filename);
            $res->writeAttribute('mode', 'none');
            $res->save();
        } elseif ($res->mode === 'append') {
            // Append to the file
            $data .= "\n\n";
            $data .= base64_decode((string)$res->content);
        } elseif ($res->mode === 'override') {
            // Override the file
            $data = base64_decode((string)$res->content);
        }
        file_put_contents($filename, $data);
    }

    /**
     * Adds messages to Syslog.
     *
     * @param string $ident The category, class, or method identification.
     * @param string $message The log message.
     * @param int $level The log level (default: LOG_WARNING).
     *
     * @return void
     */
    public static function sysLogMsg(string $ident, string $message, $level = LOG_WARNING): void
    {
        /** @var \Phalcon\Logger $logger */
        $logger = Di::getDefault()->getShared(LoggerProvider::SERVICE_NAME);
        $logger->log($level, "{$message} on {$ident}");
    }

    /**
     * Returns the current date as a string with millisecond precision.
     *
     * @return string|null The current date string, or null on error.
     */
    public static function getNowDate(): ?string
    {
        $result = null;
        try {
            $d = new DateTime();
            $result = $d->format("Y-m-d H:i:s.v");
        } catch (Exception $e) {
            unset($e);
        }

        return $result;
    }

    /**
     * Retrieves the extension of a file.
     *
     * @param string $filename The filename.
     *
     * @return string The extension of the file.
     */
    public static function getExtensionOfFile(string $filename): string
    {
        $path_parts = pathinfo($filename);

        return $path_parts['extension'] ?? '';
    }

    /**
     * Removes the extension from a filename.
     *
     * @param string $filename The filename.
     * @param string $delimiter The delimiter character (default: '.').
     *
     * @return string The filename without the extension.
     */
    public static function trimExtensionForFile(string $filename, string $delimiter = '.'): string
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
            $duPath = self::which('du');
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
     * Searches for the executable path of a command.
     *
     * @param string $cmd The command to search for.
     *
     * @return string The path of the executable command, or the command itself if not found.
     */
    public static function which(string $cmd): string
    {
        global $_ENV;
        if (array_key_exists('PATH', $_ENV)) {
            $binaryFolders = $_ENV['PATH'];

            // Search for the command in each binary folder
            foreach (explode(':', $binaryFolders) as $path) {
                if (is_executable("{$path}/{$cmd}")) {
                    return "{$path}/{$cmd}";
                }
            }
        }

        // Default binary folders to search if PATH is not set or command is not found
        $binaryFolders =
            [
                '/sbin',
                '/bin',
                '/usr/sbin',
                '/usr/bin',
                '/usr/local/bin',
                '/usr/local/sbin',
            ];

        // Search for the command in the default binary folders
        foreach ($binaryFolders as $path) {
            if (is_executable("{$path}/{$cmd}")) {
                return "{$path}/{$cmd}";
            }
        }

        return $cmd;
    }

    /**
     * DEPRECATED
     * Executes a command using exec().
     *
     * @param string $command The command to execute.
     * @param array|null $outArr Reference to an array to store the output (default: null).
     * @param int|null $retVal Reference to a variable to store the return value (default: null).
     *
     * @return int The return value of the command execution.
     */
    public static function mwExec($command, &$outArr = null, &$retVal = null): int
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);

        return Processes::mwExec($command, $outArr, $retVal);
    }

    /**
     * Checks if a password is simple based on a dictionary.
     *
     * @param string $value The password to check.
     *
     * @return bool True if the password is found in the dictionary, false otherwise.
     */
    public static function isSimplePassword($value): bool
    {
        $passwords = [];
        Processes::mwExec('/bin/zcat /usr/share/wordlists/rockyou.txt.gz', $passwords);
        return in_array($value, $passwords, true);
    }

    /**
     * Sets the Cyrillic font for the console.
     *
     * @return void
     */
    public static function setCyrillicFont(): void
    {
        $setfontPath = self::which('setfont');
        Processes::mwExec("{$setfontPath} /usr/share/consolefonts/Cyr_a8x16.psfu.gz 2>/dev/null");
    }

    /**
     * Translates a text string.
     *
     * @param string $text The text to translate.
     * @param bool $cliLang Whether to use CLI language or web language (default: true).
     *
     * @return string The translated text.
     */
    public static function translate(string $text, bool $cliLang = true): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            if (!$cliLang) {
                $di->setShared('PREFERRED_LANG_WEB', true);
            }
            $text = $di->getShared(TranslationProvider::SERVICE_NAME)->_($text);
            if (!$cliLang) {
                $di->remove('PREFERRED_LANG_WEB');
            }
        }
        return $text;
    }


    /**
     * Recursively deletes a directory.
     *
     * @param string $dir The directory path to delete.
     *
     * @return void
     *
     * @link http://php.net/manual/en/function.rmdir.php
     */
    public static function rRmDir(string $dir): void
    {
        if (is_dir($dir)) {
            $objects = scandir($dir);

            // Recursively delete files and subdirectories
            foreach ($objects as $object) {
                if ($object != "." && $object != "..") {
                    if (filetype($dir . "/" . $object) == "dir") {
                        self::rRmDir($dir . "/" . $object);
                    } else {
                        unlink($dir . "/" . $object);
                    }
                }
            }

            // Reset the array pointer and remove the directory
            if ($objects !== false) {
                reset($objects);
            }
            rmdir($dir);
        }
    }

    /**
     * Generates an SSL certificate.
     *
     * @param array|null $options The options for the certificate (default: null).
     * @param array|null $config_args_pkey The configuration arguments for the private key (default: null).
     * @param array|null $config_args_csr The configuration arguments for the CSR (default: null).
     *
     * @return array The generated SSL certificate (public and private keys).
     */
    public static function generateSslCert($options = null, $config_args_pkey = null, $config_args_csr = null): array
    {
        // Initialize options if not provided
        if (!$options) {
            $options = [
                "countryName" => 'RU',
                "stateOrProvinceName" => 'Moscow',
                "localityName" => 'Zelenograd',
                "organizationName" => 'MIKO LLC',
                "organizationalUnitName" => 'Software development',
                "commonName" => 'MIKO PBX',
                "emailAddress" => 'info@miko.ru',
            ];
        }

        // Initialize CSR configuration arguments if not provided
        if (!$config_args_csr) {
            $config_args_csr = ['digest_alg' => 'sha256'];
        }

        // Initialize private key configuration arguments if not provided
        if (!$config_args_pkey) {
            $config_args_pkey = [
                "private_key_bits" => 2048,
                "private_key_type" => OPENSSL_KEYTYPE_RSA,
            ];
        }

        // Generate keys
        $private_key = openssl_pkey_new($config_args_pkey);
        $csr = openssl_csr_new($options, $private_key, $config_args_csr);
        $x509 = openssl_csr_sign($csr, null, $private_key, $days = 3650, $config_args_csr);

        // Export keys
        openssl_x509_export($x509, $certout);
        openssl_pkey_export($private_key, $pkeyout);
        // echo $pkeyout; // -> WEBHTTPSPrivateKey
        // echo $certout; // -> WEBHTTPSPublicKey
        return ['PublicKey' => $certout, 'PrivateKey' => $pkeyout];
    }

    /**
     * Checks whether the current system is t2 SDE build.
     *
     * @return bool True if the system is t2 SDE build, false otherwise.
     */
    public static function isT2SdeLinux(): bool
    {
        return !self::isSystemctl() && !self::isDocker();
    }

    /**
     * Checks whether the current system has systemctl installed and executable.
     *
     * @return bool True if systemctl is available, false otherwise.
     */
    public static function isSystemctl(): bool
    {
        $pathSystemCtl = self::which('systemctl');
        return !empty($pathSystemCtl) && is_executable($pathSystemCtl);
    }

    /**
     * Checks whether the current process is running inside a Docker container.
     *
     * @return bool True if the process is inside a container, false otherwise.
     */
    public static function isDocker(): bool
    {
        return file_exists('/.dockerenv');
    }

    /**
     * Outputs a message to the main teletype.
     *
     * @param string $message The message to output.
     * @param string $ttyPath The path to the teletype device (default: '/dev/ttyS0').
     *
     * @return void
     */
    public static function teletypeEcho(string $message, string $ttyPath = '/dev/ttyS0'): void
    {
        $pathBusyBox = self::which('busybox');
        $ttyTittle = trim(shell_exec("$pathBusyBox setserial -g $ttyPath 2> /dev/null"));
        if (strpos($ttyTittle, $ttyPath) !== false && strpos($ttyTittle, 'unknown') === false) {
            @file_put_contents($ttyPath, $message, FILE_APPEND);
        }
    }

    /**
     * Echoes a teletype message with "DONE" or "FAIL" status.
     *
     * @param string $message The main message to display.
     * @param mixed $result The result status.
     *
     * @return void
     */
    public static function teletypeEchoDone(string $message, $result): void
    {
        $len = max(0, 80 - strlen($message) - 9);
        $spaces = str_repeat('.', $len);
        if ($result === false) {
            $message = " \033[31;1mFAIL\033[0m \n";
        } else {
            $message = " \033[32;1mDONE\033[0m \n";
        }
        self::teletypeEcho($spaces . $message);
    }

    /**
     * Echoes a "DONE" or "FAIL" message based on the result status.
     *
     * @param bool $result The result status (true by default).
     *
     * @return void
     */
    public static function echoDone(bool $result = true): void
    {
        if ($result === false) {
            echo "\033[31;1mFAIL\033[0m \n";
        } else {
            echo "\033[32;1mDONE\033[0m \n";
        }
    }

    /**
     * Echoes a result message with progress dots.
     *
     * @param string $message The result message to echo.
     * @param bool $result The result status (true by default).
     *
     * @return void
     */
    public static function echoResult(string $message, bool $result = true): void
    {
        $cols = self::getCountCols();
        if (!is_numeric($cols)) {
            // Failed to retrieve the screen width.
            return;
        }
        $len = $cols - strlen($message) - 8;
        if ($len < 2) {
            // Incorrect screen width.
            return;
        }

        $spaces = str_repeat('.', $len);
        echo "\r" . $message . $spaces;
        self::echoDone($result);
    }

    /**
     * Gets the count of columns in the terminal window.
     *
     * @return string The count of columns.
     */
    public static function getCountCols(): string
    {
        $len = 1 * trim(shell_exec('tput cols'));

        // If the count of columns is zero, set it to a default value of 80
        if ($len === 0) {
            $len = 80;
        } else {
            // Limit the count of columns to a maximum of 80
            $len = min($len, 80);
        }
        return $len;
    }

    /**
     * Creates or updates a symlink to a target path.
     *
     * @param string $target The target path.
     * @param string $link The symlink path.
     * @param bool $isFile Whether the symlink should point to a file (false by default).
     *
     * @return bool True if the symlink was created or updated, false otherwise.
     */
    public static function createUpdateSymlink(string $target, string $link, bool $isFile = false): bool
    {
        $need_create_link = true;
        if (is_link($link)) {
            $old_target = readlink($link);
            $need_create_link = ($old_target != $target);

            // If needed, remove the old symlink.
            if ($need_create_link) {
                $cpPath = self::which('cp');
                Processes::mwExec("{$cpPath} {$old_target}/* {$target}");
                unlink($link);
            }
        } elseif (is_dir($link)) {
            // It should be a symlink. Remove the directory.
            rmdir($link);
        } elseif (file_exists($link)) {
            // It should be a symlink. Remove the file.
            unlink($link);
        }

        // Create the target directory if $isFile is false
        if ($isFile === false) {
            self::mwMkdir($target);
        }

        if ($need_create_link) {
            $lnPath = self::which('ln');
            Processes::mwExec("{$lnPath} -s {$target}  {$link}");
        }

        return $need_create_link;
    }

    /**
     * Creates directories with optional WWW rights.
     *
     * @param string $parameters The space-separated list of directory paths.
     * @param bool $addWWWRights Whether to add WWW rights to the directories.
     *
     * @return bool True if the directories were created successfully, false otherwise.
     */
    public static function mwMkdir(string $parameters, bool $addWWWRights = false): bool
    {
        $result = true;

        // Check if the script is running with root privileges
        if (posix_getuid() === 0) {
            $arrPaths = explode(' ', $parameters);
            if (count($arrPaths) > 0) {
                foreach ($arrPaths as $path) {
                    if (!empty($path)
                        && !file_exists($path)
                        && !mkdir($path, 0755, true)
                        && !is_dir($path)) {
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
            $findPath = self::which('find');
            $chownPath = self::which('chown');
            $chmodPath = self::which('chmod');
            Processes::mwExec("{$findPath} {$folder} -type d -exec {$chmodPath} 755 {} \;");
            Processes::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 644 {} \;");
            Processes::mwExec("{$chownPath} -R www:www {$folder}");
        }
    }

    /**
     * Echoes a message and logs it to the system log.
     *
     * @param string $message The message to echo and log.
     *
     * @return void
     */
    public static function echoWithSyslog(string $message): void
    {
        echo $message;
        // Log the message to the system log with LOG_INFO level
        self::sysLogMsg(static::class, $message, LOG_INFO);
    }

    /**
     * Adds executable rights to files in a folder.
     *
     * @param string $folder The folder path.
     *
     * @return void
     */
    public static function addExecutableRights(string $folder): void
    {
        // Check if the script is running with root privileges
        if (posix_getuid() === 0) {
            $findPath = self::which('find');
            $chmodPath = self::which('chmod');

            // Execute find command to locate files and modify their permissions
            Processes::mwExec("{$findPath} {$folder} -type f -exec {$chmodPath} 755 {} \;");
        }
    }

    /**
     * Parses ini settings from a string.
     *
     * @param string $manual_attributes The ini settings string.
     *
     * @return array An array representing the parsed ini settings.
     */
    public static function parseIniSettings(string $manual_attributes): array
    {
        // Decode the base64-encoded string if it is valid
        $tmp_data = base64_decode($manual_attributes);
        if (base64_encode($tmp_data) === $manual_attributes) {
            $manual_attributes = $tmp_data;
        }
        unset($tmp_data);

        // TRIMMING: Remove leading/trailing spaces and section markers
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
        $sections = explode("\n[", str_replace(']', '', $manual_attributes));
        foreach ($sections as $section) {
            $data_rows = explode("\n", trim($section));
            $section_name = trim($data_rows[0] ?? '');
            if (!empty($section_name)) {
                unset($data_rows[0]);
                $manual_data[$section_name] = [];
                foreach ($data_rows as $row) {
                    $value = '';

                    // Skip rows without an equal sign
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

                    // Skip rows with empty key or value not equal to '0'
                    if (($value !== '0' && empty($value)) || empty($key)) {
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
     * @param array $array
     *
     * @return array
     */
    public static function flattenArray(array $array): array
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
            $filename = $reflection->getFileName();
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
     *
     * @deprecated
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
     *
     * @deprecated
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
     *
     * @deprecated
     */
    public static function processPHPWorker(
        string $className,
        string $param = 'start',
        string $action = 'restart'
    ): void
    {
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
     *
     * @deprecated
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
     *
     * @deprecated
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
     * @param int $timeout
     * @param string $logname
     *
     * @deprecated
     */
    public static function mwExecBgWithTimeout($command, $timeout = 4, $logname = '/dev/null'): void
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::mwExecBgWithTimeout($command, $timeout, $logname);
    }

    /**
     * Depricated
     *
     * Executes commands.
     *
     * @param array $arr_cmds An array of commands to be executed.
     * @param array &$out A reference parameter to store the command output.
     * @param string $logname The name of the log file.
     *
     * @return void
     * @deprecated
     */
    public static function mwExecCommands($arr_cmds, &$out = [], $logname = ''): void
    {
        self::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        Processes::mwExecCommands($arr_cmds, $out, $logname);
    }

    /**
     * Adds a job to the Beanstalk queue.
     *
     * @param string $tube The name of the Beanstalk tube to add the job to.
     * @param mixed $data The data to be added as a job in the queue.
     *
     * @return void
     */
    public function addJobToBeanstalk(string $tube, $data): void
    {
        $queue = new BeanstalkClient($tube);
        $queue->publish(json_encode($data));
    }


}