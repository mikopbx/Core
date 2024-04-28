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
use malkusch\lock\mutex\PHPRedisMutex;
use MikoPBX\Common\Providers\AmiConnectionCommand;
use MikoPBX\Common\Providers\AmiConnectionListener;
use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
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

        // Try to connect to Asterisk Manager
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
    public static function generateRandomString(int $length = 10): string
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
    public static function getExtensionX(int $length): string
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
    public static function recFileExists(string $filename): ?bool
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
     * @param string $data The data to write to the file.
     *
     * @return void
     */
    public static function fileWriteContent(string $filename, string $data): void
    {
        /** @var CustomFiles $res */
        $res = CustomFiles::findFirst("filepath = '{$filename}'");
        if ($res === null) {
            // File is not yet registered in the database, create a new CustomFiles entry
            $res = new CustomFiles();
            $res->writeAttribute('filepath', $filename);
            $res->writeAttribute('mode',  CustomFiles::MODE_NONE);
            $res->save();
        }

        $filename_orgn = "{$filename}.orgn";

        switch ($res->mode){
            case CustomFiles::MODE_NONE:
                if (file_exists($filename_orgn)) {
                    unlink($filename_orgn);
                }
                file_put_contents($filename, $data);
                break;
            case CustomFiles::MODE_APPEND:
                file_put_contents($filename_orgn, $data);
                // Append to the file
                $data .= "\n\n";
                $data .= base64_decode((string)$res->content);
                file_put_contents($filename, $data);
                break;
            case CustomFiles::MODE_OVERRIDE:
                file_put_contents($filename_orgn, $data);
                // Override the file
                $data = base64_decode((string)$res->content);
                file_put_contents($filename, $data);
                break;
            case CustomFiles::MODE_SCRIPT:
                // Save the original copy.
                file_put_contents($filename_orgn, $data);

                // Save the config file.
                file_put_contents($filename, $data);

                // Apply custom script to the file
                $scriptText = base64_decode((string)$res->content);
                $tempScriptFile = tempnam(sys_get_temp_dir(), 'temp_script.sh');
                file_put_contents($tempScriptFile, $scriptText);
                $command = "/bin/sh {$tempScriptFile} {$filename}";
                Processes::mwExec($command);
                unlink($tempScriptFile);

                break;
            default:
        }
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
        $tmp_arr = explode((string)$delimiter, $filename);
        if (count($tmp_arr) > 1) {
            unset($tmp_arr[count($tmp_arr) - 1]);
            $filename = implode((string)$delimiter, $tmp_arr);
        }

        return $filename;
    }

    /**
     * Get the size of a file in kilobytes.
     *
     * @param string $filename The path to the file.
     * @return float The size of the file in kilobytes.
     */
    public static function getSizeOfFile(string $filename): float
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

        // Default binary folders to search if PATH is not set or command is not found
        $binaryFolders = $_ENV['PATH'] ?? '/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/bin:/usr/local/sbin';

        // Search for the command in each binary folder
        foreach (explode(':', $binaryFolders) as $path) {
            if (is_executable("{$path}/{$cmd}")) {
                return "{$path}/{$cmd}";
            }
        }

        // Get BusyBox applets list from cache or generate it
        $busyBoxApplets = self::getBusyBoxCommands();

        // Check if the command is a BusyBox applet
        if (in_array($cmd, $busyBoxApplets)) {
            return "/bin/busybox $cmd"; // Prefix with 'busybox' if it is a BusyBox command
        }

        // Return the command as it is if not found and not a BusyBox applet
        return $cmd;
    }

    /**
     * Fetches or generates the list of BusyBox commands.
     *
     * @return array List of BusyBox commands.
     */
    public static function getBusyBoxCommands(): array
    {
        $filename = '/etc/busybox-commands';
        if (!file_exists($filename)) {
            // Get the list of BusyBox commands by executing busybox --list
            Processes::mwExec('busybox --list', $output);
            // Save the output to a file
            file_put_contents($filename, implode("\n", $output));
            return $output;
        } else {
            // Read the list from the file
            $commands = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            return $commands;
        }
    }

    /**
     * Checks if a password is simple based on a dictionary.
     *
     * @param string $value The password to check.
     *
     * @return bool True if the password is found in the dictionary, false otherwise.
     */
    public static function isSimplePassword(string $value): bool
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
                $di->setShared(LanguageProvider::PREFERRED_LANG_WEB, true);
            }
            $text = $di->getShared(TranslationProvider::SERVICE_NAME)->_($text);
            if (!$cliLang) {
                $di->remove(LanguageProvider::PREFERRED_LANG_WEB);
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
        $csr = openssl_csr_new($options, /** @scrutinizer ignore-type */$private_key, $config_args_csr);
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
        return file_exists('/etc/t2-sde-build');
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
            $need_create_link = ($old_target !== $target);

            // If needed, remove the old symlink.
            if ($need_create_link) {
                $cpPath = self::which('cp');
                Processes::mwExec("$cpPath $old_target/* $target");
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
            Processes::mwExec("$lnPath -s $target $link");
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
                        SystemMessages::sysLogMsg(__METHOD__, 'Error on create folder ' . $path, LOG_ERR);
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
            SystemMessages::sysLogMsg(__METHOD__, 'ReflectionException ' . $exception->getMessage(), LOG_ERR);
        }

        return $filename;
    }


    /**
     * Creates a mutex to ensure synchronized module installation.
     *
     * @param string $namespace Namespace for the mutex, used to differentiate mutexes.
     * @param string $uniqueId Unique identifier for the mutex, usually the module ID.
     * @param int $timeout Timeout in seconds for the mutex.
     *
     * @return PHPRedisMutex Returns an instance of PHPRedisMutex.
     */
    public static function createMutex(string $namespace, string $uniqueId, int $timeout = 5): PHPRedisMutex
    {
        $di = Di::getDefault();
        $redisAdapter = $di->get(ManagedCacheProvider::SERVICE_NAME)->getAdapter();
        $mutexKey = "Mutex:$namespace-" . md5($uniqueId);
        return new PHPRedisMutex([$redisAdapter], $mutexKey, $timeout);
    }

    /**
     * Adds messages to Syslog.
     * @deprecated Use SystemMessages::sysLogMsg instead
     *
     * @param string $ident The category, class, or method identification.
     * @param string $message The log message.
     * @param int $level The log level (default: LOG_WARNING).
     *
     * @return void
     */
    public static function sysLogMsg(string $ident, string $message, int $level = LOG_WARNING): void
    {
        SystemMessages::sysLogMsg($ident, $message, $level);
    }


    /**
     * Echoes a message and logs it to the system log.
     * @deprecated Use SystemMessages::echoWithSyslog instead
     *
     * @param string $message The message to echo and log.
     *
     * @return void
     */
    public static function echoWithSyslog(string $message): void
    {
        SystemMessages::echoWithSyslog($message);
    }

    /**
     * Is recovery mode
     *
     * @return bool
     */
    public static function isRecoveryMode(): bool
    {
        return file_exists('/offload/livecd');
    }


}