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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use SQLite3;

/**
 *  Class Fail2banUnban
 *
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class UnbanIpAction extends Injectable
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
        if (!Verify::isIpAddress($ip)) {
            $res->success = false;
            $res->messages[] = 'Not valid IP address.';
            return $res;
        }
        if (Fail2BanConf::fail2BanEnable()) {
            $fail2ban = Util::which(Fail2BanConf::FB_CLIENT_BIN);
            $command = self::buildFail2BanUnbanCommand($fail2ban, $ip);
            $res->success  = (Processes::mwExec($command) === 0);
        } else {
            $res = self::fail2banUnbanDb($ip);
        }

        // Invalidate banned IPs cache so the UI reflects the change immediately
        $di = Di::getDefault();
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $managedCache->delete(GetBannedIpsAction::CACHE_KEY);

        return $res;
    }


    /**
     * Remove an IP from the fail2ban database ban.
     *
     * @param string $ip The IP address to unban.
     * @param string $jail The jail name (optional).
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function fail2banUnbanDb(string $ip, string $jail = '', ?SQLite3 $database = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (!Verify::isIpAddress($ip)) {
            $res->success = false;
            $res->messages[] = 'Not valid IP address.';
            return $res;
        }

        $path_db = Fail2BanConf::FAIL2BAN_DB_PATH;
        if ($database === null && !file_exists($path_db)) {
            // Database table does not exist. No ban.
            $res->success    = false;
            $res->messages[] = "DB $path_db not found";
            return $res;
        }
        $db = $database ?? new SQLite3($path_db);
        $db->busyTimeout(3000);
        if (false === Fail2BanConf::tableBanExists($db)) {
            // Database table does not exist. No ban.
            $res->success = true;
            return $res;
        }
        $query = 'DELETE FROM bans WHERE ip = :ip';
        if ($jail !== '') {
            $query .= ' AND jail = :jail';
        }

        $statement = $db->prepare($query);
        if ($statement === false) {
            $res->success = false;
            $res->messages[] = $db->lastErrorMsg();
            return $res;
        }

        $statement->bindValue(':ip', $ip, SQLITE3_TEXT);
        if ($jail !== '') {
            $statement->bindValue(':jail', $jail, SQLITE3_TEXT);
        }
        $statement->execute();

        $err = $db->lastErrorMsg();

        $res->success = ($err === 'not an error');
        $res->messages[] = $err;
        return $res;
    }

    private static function buildFail2BanUnbanCommand(string $executable, string $ip): string
    {
        return escapeshellarg($executable) . ' unban ' . escapeshellarg($ip);
    }
}
