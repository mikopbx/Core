<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Workers\WorkerMakeLogFilesArchive;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class LogsManagementProcessor extends Injectable
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
        $action = $request['action'];
        $data   = $request['data'];
        $res    = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getLogFromFile':
                $res = LogsManagementProcessor::getLogFromFile($data['filename'], $data['filter'], $data['lines']);
                break;
            case 'startLog':
                $res = LogsManagementProcessor::startLog();
                break;
            case 'stopLog':
                $res = LogsManagementProcessor::stopLog();
                break;
            case 'downloadLogsArchive':
                $res = LogsManagementProcessor::downloadLogsArchive($data['filename']);
                break;
            case 'downloadLogFile':
                $res = LogsManagementProcessor::downloadLogFile($data['filename']);
                break;
            case 'getLogsList':
                $res = LogsManagementProcessor::getLogsList();
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in syslogCallBack";
        }

        $res->function = $action;

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
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        self::stopLog();
        $dir_all_log = System::getLogDir();
        $findPath    = Util::which('find');
        Util::mwExec("{$findPath} {$dir_all_log}" . '/ -name *_start_all_log* | xargs rm -rf');
        // Получим каталог с логами.
        $dirlog = $dir_all_log . '/dir_start_all_log';
        Util::mwMkdir($dirlog);

        $pingPath = Util::which('ping');
        Util::mwExecBg("{$pingPath} 8.8.8.8 -w 2", "{$dirlog}/ping_8888.log");
        Util::mwExecBg("{$pingPath} ya.ru -w 2", "{$dirlog}/ping_8888.log");

        $opensslPath = Util::which('openssl');
        Util::mwExecBgWithTimeout(
            "{$opensslPath} s_client -connect lm.miko.ru:443 > {$dirlog}/openssl_lm_miko_ru.log",
            1
        );
        Util::mwExecBgWithTimeout(
            "{$opensslPath} s_client -connect lic.miko.ru:443 > {$dirlog}/openssl_lic_miko_ru.log",
            1
        );
        $routePath = Util::which('route');
        Util::mwExecBg("{$routePath} -n ", " {$dirlog}/rout_n.log");

        $asteriskPath = Util::which('asterisk');
        Util::mwExecBg("{$asteriskPath} -rx 'pjsip show registrations' ", " {$dirlog}/pjsip_show_registrations.log");
        Util::mwExecBg("{$asteriskPath} -rx 'pjsip show endpoints' ", " {$dirlog}/pjsip_show_endpoints.log");
        Util::mwExecBg("{$asteriskPath} -rx 'pjsip show contacts' ", " {$dirlog}/pjsip_show_contacts.log");

        $php_log = '/var/log/php_error.log';
        if (file_exists($php_log)) {
            $cpPath = Util::which('cp');
            Util::mwExec("{$cpPath} {$php_log} {$dirlog}");
        }

        $network     = new Network();
        $arr_eth     = $network->getInterfacesNames();
        $tcpdumpPath = Util::which('tcpdump');
        foreach ($arr_eth as $eth) {
            Util::mwExecBgWithTimeout(
                "{$tcpdumpPath} -i {$eth} -n -s 0 -vvv -w {$dirlog}/{$eth}.pcap",
                $timeout,
                "{$dirlog}/{$eth}_out.log"
            );
        }
        $res->success=true;
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
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di         = Di::getDefault();
        $dirsConfig = $di->getShared('config');
        $temp_dir = $dirsConfig->path('core.tempDir');
        $futureFileName = $temp_dir . '/temp-all-log-'.time().'.zip';
        $res->data['filename'] = $futureFileName;
        $res->success = true;

        // Create background task
        $merge_settings = [];
        $merge_settings['result_file'] = $futureFileName;
        $settings_file  = "{$temp_dir}/logs_archive_settings.json";
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
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $progress_file = "{$resultFile}.progress";
        if (!file_exists($progress_file)){
            $res->messages[]='Archive does not exist. Try again!';
        } elseif (file_exists($progress_file) && file_get_contents($progress_file)==='100'){
            $uid = Util::generateRandomString(36);
            $di = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = 'MikoPBXLogs_'.basename($resultFile);
            $lnPath = Util::which('ln');
            $chownPath      = Util::which('chown');
            Util::mwExec("{$lnPath} -s {$resultFile} {$result_dir}/{$link_name}");
            Util::mwExec("{$chownPath} www:www {$result_dir}/{$link_name}");
            $res->success=true;
            $res->data['status'] = "READY";
            $res->data['filename'] = "{$uid}/{$link_name}";
        } else {
            $res->success=true;
            $res->data['status'] = "preparing";
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
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $logDir     = System::getLogDir();
        $filesList = [];
        $entries = FilesManagementProcessor::scanDirRecursively($logDir);
        $entries = Util::flattenArray($entries);
        foreach($entries as $entry) {
            $fileSize = filesize($entry);
            $now  = time();
            if ($fileSize===0
                ||$now-filemtime($entry)>604800 // Older than 10 days
            )
            {
                continue;
            }

            $relativePath = str_ireplace($logDir. '/', '', $entry);
            $fileSizeKB = ceil($fileSize/1024);
            $filesList[$relativePath] =
            [
                'path'=> $relativePath,
                'size'=> "{$fileSizeKB} kb",
                'default'=>($relativePath===self::DEFAULT_FILENAME)
            ];
        }

        ksort($filesList);
        $res->success=true;
        $res->data['files'] = $filesList;
        return $res;
    }

    /**
     * Gets log file content partially
     *
     * @param string $filename
     * @param string $filter
     * @param int    $lines
     *
     * @return PBXApiResult
     */
    private static function getLogFromFile(string $filename, string $filter='', $lines = 500): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'No access to the file ' . $filename;
        } else {
            $res->success = true;
            $cat          = Util::which('cat');
            $grep         = Util::which('grep');
            $tail         = Util::which('tail');

            $di          = Di::getDefault();
            $dirsConfig  = $di->getShared('config');
            $filenameTmp = $dirsConfig->path('www.downloadCacheDir') . '/' . __FUNCTION__ . '_' . time() . '.log';
            $cmd         = "{$cat} {$filename} | {$grep} " . escapeshellarg($filter) . " | $tail -n " . escapeshellarg(
                    $lines
                ) . "> $filenameTmp";
            Util::mwExec("$cmd; chown www:www $filenameTmp");
            $res->data['filename'] = $filenameTmp;
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
    private static function downloadLogFile(string $filename):PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $uid = Util::generateRandomString(36);
            $di = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = basename($filename);
            $lnPath = Util::which('ln');
            $chownPath      = Util::which('chown');
            Util::mwExec("{$lnPath} -s {$filename} {$result_dir}/{$link_name}");
            Util::mwExec("{$chownPath} www:www {$result_dir}/{$link_name}");
            $res->success=true;
            $res->data['filename'] = "{$uid}/{$link_name}";
        }
        return $res;
    }
}