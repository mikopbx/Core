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


use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;

use SQLite3;
use Throwable;

/**
 * Class FirewallManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class FirewallManagementProcessor extends Injectable
{

    /**
     * Processes Firewall requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     * @throws \Exception
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'unBanIp':
                $res = self::fail2banUnbanAll($data['ip']);
                break;
            case 'getBannedIp':
                $res = self::getBannedIp();
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in systemCallBack";
        }
        $res->function = $action;

        return $res;
    }

    /**
     * Remove an IP address from the fail2ban ban list.
     *
     * @param string $ip The IP address to unban.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function fail2banUnbanAll(string $ip): PBXApiResult
    {
        $ip     = trim($ip);
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        if ( ! Verify::isIpAddress($ip)) {
            $res->success = false;
            $res->messages[]="Not valid ip '{$ip}'.";
        }
        $fail2ban        = new Fail2BanConf();
        if ($fail2ban->fail2ban_enable) {
            $fail2ban = Util::which('fail2ban-client');
            $res->success  = (Processes::mwExec("{$fail2ban} unban {$ip}") === 0);
        } else {
            $res = self::fail2banUnbanDb($ip);
        }

        return $res;
    }

    /**
     * Retrieve a list of banned IP addresses or get data for a specific IP address.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getBannedIp(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data = self::getBanIpWithTime();
        return $res;
    }

    /**
     * Retrieve a list of banned IP addresses with their corresponding ban and unban timestamps.
     *
     * @return array An array containing the banned IP addresses and their timestamps.
     */
    public static function getBanIpWithTime():array
    {
        $result = [];
        $sep = '"|"';
        $sepSpace = '" "';
        $fail2banPath = Util::which('fail2ban-client');
        $awkPath      = Util::which('awk');
        try {
            $shellData = str_replace("'", '"', shell_exec("$fail2banPath banned"));
            $data = json_decode($shellData, true, 512, JSON_THROW_ON_ERROR);
            $data = array_merge(... $data);
        }catch (\Throwable $e){
            $data = [];
        }
        $jails = array_keys($data);
        foreach ($jails as $jail){
            $data = [];
            Processes::mwExec("$fail2banPath get $jail banip --with-time | $awkPath '{print $1 $sep $2 $sepSpace $3 $sep $7 $sepSpace $8 }'", $data);
            foreach ($data as $ipData){
                $ipData = explode('|', $ipData);
                $ip = $ipData[0]??'';
                if(empty($ip)){
                    continue;
                }
                $result[] = [
                    'ip' => $ip,
                    'jail' => "{$jail}_v2",
                    'timeofban' => self::time2stamp($ipData[1]),
                    'timeunban' => self::time2stamp($ipData[2]),
                    'v' => '2',
                ];
            }
        }
        return $result;
    }

    /**
     * Convert a string representation of a time to a UNIX timestamp.
     *
     * @param string $strTime The string representation of the time.
     * @return int The UNIX timestamp.
     */
    public static function time2stamp(string $strTime):int
    {
        $result = 0;
        $d = \DateTime::createFromFormat('Y-m-d H:i:s', $strTime);
        if ($d !== false) {
            $result = $d->getTimestamp();
        }
        return $result;
    }

    /**
     * Remove an IP from the fail2ban database ban.
     *
     * @param string $ip The IP address to unban.
     * @param string $jail The jail name (optional).
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function fail2banUnbanDb(string $ip, string $jail = ''): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $jail_q  = ($jail === '') ? '' : "AND jail = '{$jail}'";
        $path_db = Fail2BanConf::FAIL2BAN_DB_PATH;
        if(!file_exists($path_db)){
            // Database table does not exist. No ban.
            $res->success    = false;
            $res->messages[] = "DB {$path_db} not found";
            return $res;
        }
        $db      = new SQLite3($path_db);
        $db->busyTimeout(3000);
        $fail2ban = new Fail2BanConf();
        if (false === $fail2ban->tableBanExists($db)) {
            // Database table does not exist. No ban.
            $res->success = true;
            return $res;
        }
        $q = 'DELETE' . " FROM bans WHERE ip = '{$ip}' {$jail_q}";
        $db->query($q);

        $err = $db->lastErrorMsg();

        $res->success = ($err === 'not an error');
        $res->messages[] = $err;
        return $res;
    }
}