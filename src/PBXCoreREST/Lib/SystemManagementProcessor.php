<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class SystemManagementProcessor extends Injectable
{

    /**
     * Получение сведений о системе.
     *
     * @return PBXApiResult
     */
    public static function getInfo(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $storage        = new Storage();
        $res->data           = [
            'disks'  => $storage->getAllHdd(),
            'cpu'    => self::getCpu(),
            'uptime' => self::getUpTime(),
            'mem'    => self::getMemInfo(),
        ];
        $res->processor = __METHOD__;
        return $res;
    }

    /**
     * Возвращает информацию по загрузке CPU.
     */
    public static function getCpu()
    {
        $ut = [];
        $grepPath = Util::which('grep');
        $mpstatPath = Util::which('mpstat');
        Util::mwExec("{$mpstatPath} | {$grepPath} all", $ut);
        preg_match("/^.*\s+all\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+(.*)\s*.*/i", $ut[0], $matches);
        $rv = 100 - $matches[1];

        if (100 < $rv) {
            $rv = 100;
        }

        return round($rv, 2);
    }

    /**
     * Получаем информацию по времени работы ПК.
     */
    public static function getUpTime(): string
    {
        $ut = [];
        $uptimePath = Util::which('uptime');
        $awkPath = Util::which('awk');
        Util::mwExec("{$uptimePath} | {$awkPath} -F \" |,\" '{print $5}'", $ut);

        return implode('', $ut);
    }

    /**
     * Получаем информацию по оперативной памяти.
     */
    public static function getMemInfo(): array
    {
        $result = [];
        $out    = [];
        $catPath = Util::which('cat');
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        Util::mwExec("{$catPath} /proc/meminfo | {$grepPath} -C 0 'Inactive:' | {$awkPath} '{print $2}'", $out);
        $result['inactive'] = round((1 * implode($out)) / 1024, 2);
        Util::mwExec("{$catPath} /proc/meminfo | {$grepPath} -C 0 'MemFree:' | {$awkPath} '{print $2}'", $out);
        $result['free'] = round((1 * implode($out)) / 1024, 2);
        Util::mwExec("{$catPath} /proc/meminfo | {$grepPath} -C 0 'MemTotal:' | {$awkPath} '{print $2}'", $out);
        $result['total'] = round((1 * implode($out)) / 1024, 2);

        return $result;
    }

    /**
     * Upgrade MikoPBX from uploaded IMG file
     *
     * @param string $tempFilename path to uploaded image
     *
     * @return PBXApiResult
     */
    public static function upgradeFromImg(string $tempFilename): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data['message']='In progress...';


        if (!file_exists($tempFilename)){
            $res->success = false;
            $res->messages[]="Update file '{$tempFilename}' not found.";
            return $res;
        }

        if ( ! file_exists('/var/etc/cfdevice')) {
            $res->success = false;
            $res->messages[]="The system is not installed";
            return $res;
        }
        $dev = trim(file_get_contents('/var/etc/cfdevice'));

        $link = '/tmp/firmware_update.img';
        Util::createUpdateSymlink($tempFilename, $link);
        $mikopbx_firmwarePath = Util::which('mikopbx_firmware');
        Util::mwExecBg("{$mikopbx_firmwarePath} recover_upgrade {$link} /dev/{$dev}");
        return $res;
    }

}