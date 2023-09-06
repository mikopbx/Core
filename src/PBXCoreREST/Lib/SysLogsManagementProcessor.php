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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Workers\WorkerMakeLogFilesArchive;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class SysLogsManagementProcessor extends Injectable
{
    public const DEFAULT_FILENAME = 'asterisk/messages';

    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
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
            default:
                $res->messages[] = "Unknown action - {$action} in syslogCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Gets log file content partially
     *
     * @param string $filename
     * @param string $filter
     * @param int    $lines
     * @param int    $offset
     *
     * @return PBXApiResult
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
     * Starts logs record
     *
     * @param int $timeout
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
     */
    private static function startLog($timeout = 300): PBXApiResult
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
     * Prepare log archive file
     *
     * @param bool $tcpdumpOnly
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
     * Checks if archive ready then create download link
     *
     * @param string $resultFile
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
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
     * Prepares downloadable log file
     *
     * @param string $filename
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
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
     * Returns list of log files to show them on web interface
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private static function getLogsList(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $logDir         = System::getLogDir();
        $filesList      = [];
        $entries        = self::scanDirRecursively($logDir);
        $entries        = Util::flattenArray($entries);
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
            $filesList[$relativePath] =
                [
                    'path'    => $relativePath,
                    'size'    => "{$fileSizeKB} kb",
                    'default' => ($relativePath === self::DEFAULT_FILENAME),
                ];
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