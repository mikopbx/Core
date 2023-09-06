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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Workers\WorkerMakeLogFilesArchive;
use Phalcon\Di;
use Phalcon\Di\Injectable;

/**
 * Class SysLogsManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SysLogsManagementProcessor extends Injectable
{
    public const DEFAULT_FILENAME = 'asterisk/messages';

    /**
     * Processes syslog requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getLogFromFile':
                $res = self::getLogFromFile($data['filename'], $data['filter'], $data['lines'], $data['offset']);
                break;
            case 'prepareLog':
                $res = self::prepareLog(false);
                $res->processor = $action;
                break;
            case 'startLog':
                $res = self::startLog();
                break;
            case 'stopLog':
                $res = self::prepareLog(true);
                $res->processor = $action;
                break;
            case 'downloadLogsArchive':
                $res = self::downloadLogsArchive($data['filename']);
                break;
            case 'downloadLogFile':
                $res = self::downloadLogFile($data['filename']);
                break;
            case 'getLogsList':
                $res = self::getLogsList();
                break;
            case 'eraseFile':
                $res = self::eraseFile($data['filename']);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Gets partially filtered log file strings.
     *
     * @param string $filename
     * @param string $filter
     * @param int    $lines
     * @param int    $offset
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getLogFromFile(string $filename, string $filter = '', $lines = 500, $offset = 0): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename       = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'No access to the file ' . $filename;
        } else {
            $res->success = true;
            $head         = Util::which('head');
            $grep         = '/bin/grep';
            if (!is_executable($grep)) {
                $grep         = Util::which('grep');
            }
            $tail         = Util::which('tail');
            $filter       = escapeshellarg($filter);
            $offset       = (int)$offset;
            $lines        = (int)$lines;
            $linesPlusOffset = $lines+$offset;

            $di          = Di::getDefault();
            $dirsConfig  = $di->getShared('config');
            $filenameTmp = $dirsConfig->path('www.downloadCacheDir') . '/' . __FUNCTION__ . '_' . time() . '.log';
            if (empty($filter)){
                $cmd         = "{$tail} -n {$linesPlusOffset} {$filename}";
            } else {
                $cmd         = "{$grep} --text -h -e ".str_replace('&',"' -e '", $filter)." -F {$filename} | $tail -n {$linesPlusOffset}";
            }
            if ($offset>0){
                $cmd .= " | {$head} -n {$lines}";
            }
            $cmd .= " > $filenameTmp";

            Processes::mwExec("$cmd; chown www:www $filenameTmp");
            $res->data['cmd']=$cmd;
            $res->data['filename'] = $filenameTmp;
        }

        return $res;
    }

    /**
     * Starts the collection of logs and captures TCP packets.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function startLog(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $logDir         = System::getLogDir();

        // TCP dump
        $tcpDumpDir  = "{$logDir}/tcpDump";
        Util::mwMkdir($tcpDumpDir);
        $network     = new Network();
        $arr_eth     = $network->getInterfacesNames();
        $tcpdumpPath = Util::which('tcpdump');
        $timeout = 300;
        foreach ($arr_eth as $eth) {
            Processes::mwExecBgWithTimeout(
                "{$tcpdumpPath} -i {$eth} -n -s 0 -vvv -w {$tcpDumpDir}/{$eth}.pcap",
                $timeout,
                "{$tcpDumpDir}/{$eth}_out.log"
            );
        }
        $res->success = true;

        return $res;
    }

    /**
     * Stops tcpdump and starts creating a log files archive for download.
     *
     * @param bool $tcpdumpOnly Indicates whether to include only tcpdump logs.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function prepareLog(bool $tcpdumpOnly): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        $dirsConfig     = $di->getShared('config');
        $temp_dir       = $dirsConfig->path('core.tempDir');

        $prefix = $tcpdumpOnly?'tcpdump':'sys';
        $futureFileName        = $temp_dir . '/log-'.$prefix.'-' . time() . '.zip';
        $res->data['filename'] = $futureFileName;
        $res->success          = true;
        // Create background task
        $merge_settings                     = [];
        $merge_settings['result_file']      = $futureFileName;
        $merge_settings['tcpdump_only']     = $tcpdumpOnly;

        if($tcpdumpOnly){
            Processes::killByName('timeout');
            Processes::killByName('tcpdump');
        }
        $settings_file                      = "{$temp_dir}/log-settings-".$prefix.".json";
        file_put_contents($settings_file, json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        $phpPath               = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMakeLogFilesArchive::class);
        Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");

        return $res;
    }

    /**
     * Requests a zipped archive containing logs and PCAP file
     * Checks if archive ready it returns download link.
     *
     * @param string $resultFile
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function downloadLogsArchive(string $resultFile): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        $progress_file = "{$resultFile}.progress";
        if ( !file_exists($progress_file)) {
            $res->messages[] = 'Archive does not exist. Try again!';
        } elseif (file_exists($progress_file) && file_get_contents($progress_file) === '100') {
            $uid          = Util::generateRandomString(36);
            $di           = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir   = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = 'MikoPBXLogs_' . basename($resultFile);
            Util::createUpdateSymlink($resultFile, "{$result_dir}/{$link_name}");
            Util::addRegularWWWRights("{$result_dir}/{$link_name}");
            $res->success          = true;
            $res->data['status']   = "READY";
            $res->data['filename'] = "{$uid}/{$link_name}";
        } else {
            $res->success           = true;
            $res->data['status']    = "PREPARING";
            $res->data['progress']  = file_get_contents($progress_file);
        }

        return $res;
    }

    /**
     * Prepares a downloadable link for a log file with the provided name.
     *
     * @param string $filename The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    private static function downloadLogFile(string $filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename       = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $uid          = Util::generateRandomString(36);
            $di           = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir   = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = basename($filename);
            $lnPath    = Util::which('ln');
            $chownPath = Util::which('chown');
            Processes::mwExec("{$lnPath} -s {$filename} {$result_dir}/{$link_name}");
            Processes::mwExec("{$chownPath} www:www {$result_dir}/{$link_name}");
            $res->success          = true;
            $res->data['filename'] = "{$uid}/{$link_name}";
        }

        return $res;
    }

    /**
     * Erase log file with the provided name.
     *
     * @param string $filename The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    private static function eraseFile(string $filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename       = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $echoPath = Util::which('echo');
            Processes::mwExec("$echoPath ' ' > $filename");
            $res->success          = true;
        }

        return $res;
    }

    /**
     * Returns list of log files to show them on web interface
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function getLogsList(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $logDir         = System::getLogDir();
        $filesList      = [];
        $entries        = self::scanDirRecursively($logDir);
        $entries        = Util::flattenArray($entries);
        $defaultFound   = false;
        foreach ($entries as $entry) {
            $fileSize = filesize($entry);
            $now      = time();
            if ($fileSize === 0
                || $now - filemtime($entry) > 604800 // Older than 10 days
            ) {
                continue;
            }
            $relativePath             = str_ireplace($logDir . '/', '', $entry);
            $fileSizeKB               = ceil($fileSize / 1024);
            $default = ($relativePath === self::DEFAULT_FILENAME);
            $filesList[$relativePath] =
                [
                    'path'    => $relativePath,
                    'size'    => "{$fileSizeKB} kb",
                    'default' => $default,
                ];
            if($default){
                $defaultFound = true;
            }
        }
        if(!$defaultFound){
            if(isset($filesList['system/messages'])){
                $filesList['system/messages']['default'] = true;

            }else{
                $filesList[array_key_first($filesList)]['default'] = true;
            }
        }
        ksort($filesList);
        $res->success       = true;
        $res->data['files'] = $filesList;
        return $res;
    }

    /**
     * Scans a directory just like scandir(), only recursively
     * returns a hierarchical array representing the directory structure
     *
     * @param string $dir directory to scan
     *
     * @return array
     */
    private static function scanDirRecursively(string $dir): array
    {
        $list = [];

        //get directory contents
        foreach (scandir($dir) as $d) {
            //ignore any of the files in the array
            if (in_array($d, ['.', '..'])) {
                continue;
            }
            //if current file ($d) is a directory, call scanDirRecursively
            if (is_dir($dir . '/' . $d)) {
                $list[] = self::scanDirRecursively($dir . '/' . $d);
                //otherwise, add the file to the list
            } elseif (is_file($dir . '/' . $d) || is_link($dir . '/' . $d)) {
                $list[] = $dir . '/' . $d;
            }
        }

        return $list;
    }
}