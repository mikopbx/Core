<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use SQLite3;

/**
 *  Class Fail2banUnban
 *
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class Fail2BanUnbanAction extends \Phalcon\Di\Injectable
{
    /**
     * Remove an IP address from the fail2ban ban list.
     *
     * @param string $ip The IP address to unban.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $ip): PBXApiResult
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
