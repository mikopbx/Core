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


use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;

use SQLite3;
use Throwable;

class FirewallManagementProcessor extends Injectable
{
    /**
     * Удалить адрес из бана.
     *
     * @param string $ip
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
     * Возвращает массив забаненных ip. Либо данные по конкретному адресу.
     *
     * @param ?string $ip
     *
     * @return PBXApiResult
     */
    public static function getBanIp(?string $ip = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data = self::getBanIpWithTime();
        return $res;
    }

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
     * Конвертация даты.
     * @param $strTime
     * @return int
     */
    public static function time2stamp($strTime):int
    {
        $result = 0;
        $d = \DateTime::createFromFormat('Y-m-d H:i:s', $strTime);
        if ($d !== false) {
            $result = $d->getTimestamp();
        }
        return $result;
    }

    /**
     * Удаление бана из базы.
     *
     * @param string $ip
     * @param string $jail
     *
     * @return PBXApiResult
     */
    public static function fail2banUnbanDb(string $ip, string $jail = ''): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $jail_q  = ($jail === '') ? '' : "AND jail = '{$jail}'";
        $path_db = Fail2BanConf::FAIL2BAN_DB_PATH;
        if(!file_exists($path_db)){
            // Таблица не существует. Бана нет.
            $res->success    = false;
            $res->messages[] = "DB {$path_db} not found";
            return $res;
        }
        $db      = new SQLite3($path_db);
        $db->busyTimeout(3000);
        $fail2ban = new Fail2BanConf();
        if (false === $fail2ban->tableBanExists($db)) {
            // Таблица не существует. Бана нет.
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