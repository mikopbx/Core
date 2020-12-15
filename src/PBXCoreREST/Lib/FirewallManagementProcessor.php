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

        $db = self::getDbConnection();
        if(!$db){
            // Таблица не существует. Бана нет.
            $res->success    = false;
            $res->messages[] = 'DB '.Fail2BanConf::FAIL2BAN_DB_PATH.' not found';
            return $res;
        }
        $query   = self::getQueryBanIp($ip);
        $results = $db->query($query);
        $result  = [];
        if (false !== $results && $results->numColumns() > 0) {
            while ($banRule = $results->fetchArray(SQLITE3_ASSOC)) {
                $result[] = $banRule;
            }
        }
        $res->success = true;
        $res->data = $result;
        return $res;
    }

     public static function getDbConnection(){
         if(!file_exists(Fail2BanConf::FAIL2BAN_DB_PATH)){
             return null;
         }
         try {
             $db      = new SQLite3(Fail2BanConf::FAIL2BAN_DB_PATH);
         }catch (Throwable $e){
             return null;
         }
         $db->busyTimeout(5000);
         $fail2ban = new Fail2BanConf();
         if (false === $fail2ban->tableBanExists($db)) {
             return null;
         }

         return $db;
    }

    /**
     * Возвращает запрос SQL для получения забаненных IP.
     * @param $ip
     * @return string
     */
    public static function getQueryBanIp($ip):string{
        $banRule = Fail2BanRules::findFirst("id = '1'");
        if ($banRule !== null) {
            $ban_time = $banRule->bantime;
        } else {
            $ban_time = '43800';
        }
        // Добавленн фильтр по времени бана. возвращаем только адреса, которые еще НЕ разбанены.
        $q = 'SELECT' . ' DISTINCT jail,ip,MAX(timeofban) AS timeofban, MAX(timeofban+' . $ban_time . ') AS timeunban FROM bans where (timeofban+' . $ban_time . ')>' . time();
        if ($ip !== null) {
            $q .= " AND ip='{$ip}'";
        }
        $q .= ' GROUP BY jail,ip';
        return $q;
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