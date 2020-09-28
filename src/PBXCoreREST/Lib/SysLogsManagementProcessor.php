<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Network;
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
    public static function syslogCallBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getLogFromFile':
                $res = self::getLogFromFile($data['filename'], $data['filter'], $data['lines'], $data['offset']);
                break;
            case 'startLog':
                $res = self::startLog();
                break;
            case 'stopLog':
                $res = self::stopLog();
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
    private static function getLogFromFile(string $filename, string $filter = '', $lines = 500, $offset = 0): PBXApiResult
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
            $grep         = Util::which('grep');
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
                $cmd         = "{$grep} -F {$filter} {$filename} | $tail -n {$linesPlusOffset}";
            }
            if ($offset>0){
                $cmd .= " | {$head} -n {$lines}";
            }
            $cmd .= " > $filenameTmp";

            Util::mwExec("$cmd; chown www:www $filenameTmp");
            $res->data['cmd']=$cmd;
            $res->data['filename'] = $filenameTmp;
        }

        return $res;
    }

    /**
     * Стартует запись логов.
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
            Util::mwExecBgWithTimeout(
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
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
     */
    private static function stopLog(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        $dirsConfig     = $di->getShared('config');
        $temp_dir       = $dirsConfig->path('core.tempDir');

        // Collect system info
        $logDir         = System::getLogDir();
        $systemInfoFile = "{$logDir}/system-information.log";
        file_put_contents($systemInfoFile, SysinfoManagementProcessor::prepareSysyinfoContent());

        $futureFileName        = $temp_dir . '/temp-all-log-' . time() . '.zip';
        $res->data['filename'] = $futureFileName;
        $res->success          = true;

        Util::killByName('timeout');
        Util::killByName('tcpdump');

        // Create background task
        $merge_settings                = [];
        $merge_settings['result_file'] = $futureFileName;
        $settings_file                 = "{$temp_dir}/logs_archive_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
        $phpPath               = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMakeLogFilesArchive::class);
        Util::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} '{$settings_file}'");

        return $res;
    }

    /**
     * Check if archive ready then create download link
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
        if ( ! file_exists($progress_file)) {
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
            $res->success        = true;
            $res->data['status'] = "preparing";
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
            Util::mwExec("{$lnPath} -s {$filename} {$result_dir}/{$link_name}");
            Util::mwExec("{$chownPath} www:www {$result_dir}/{$link_name}");
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
        $entries        = FilesManagementProcessor::scanDirRecursively($logDir);
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
}