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

class LicenseManagementProcessor extends Injectable
{

    /**
     * Processes requests to licensing system
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     * @throws \Exception
     */
    public static function licenseCallBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getLogFromFile':
                $res = self::getLogFromFile($data['filename'], $data['filter'], $data['lines'], $data['offset']);
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in licenseCallBack";
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

}