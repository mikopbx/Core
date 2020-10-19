<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;
use SQLite3;

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
            $res->success  = (Util::mwExec("{$fail2ban} unban {$ip}}") === 0);
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

        $banRule = Fail2BanRules::findFirst("id = '1'");
        if ($banRule !== null) {
            $ban_time = $banRule->bantime;
        } else {
            $ban_time = '43800';
        }

        // Добавленн фильтр по времени бана. возвращаем только адреса, которые еще НЕ разбанены.
        $q = 'SELECT' . ' DISTINCT jail,ip,MAX(timeofban) AS timeofban, MAX(timeofban+' . $ban_time . ') AS timeunban FROM bans where (timeofban+' . $ban_time . ')>' . time(
            );
        if ($ip !== null) {
            $q .= " AND ip='{$ip}'";
        }
        $q .= ' GROUP BY jail,ip';

        $path_db = Fail2BanConf::FAIL2BAN_DB_PATH;
        $db      = new SQLite3($path_db);
        $db->busyTimeout(5000);
        $fail2ban = new Fail2BanConf();
        if (false === $fail2ban->tableBanExists($db)) {
            // Таблица не существует. Бана нет.
            $res->success = true;
            return $res;
        }

        $results = $db->query($q);
        $result = [];
        if (false !== $results && $results->numColumns() > 0) {
            while ($banRule = $results->fetchArray(SQLITE3_ASSOC)) {
                $result[] = $banRule;
            }
        }
        $res->success = true;
        $res->data = $result;
        return $res;
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