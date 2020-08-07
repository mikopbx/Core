<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Core\System\Firewall;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;
use SQLite3;

class FirewallManagementProcessor extends Injectable
{
    /**
     * Удалить адрес из бана.
     *
     * @param $ip
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function fail2banUnbanAll($ip): PBXApiResult
    {
        $ip     = trim($ip);
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        if ( ! Verify::isIpAddress($ip)) {
            $res->success = false;
            $res->messages[]="Not valid ip '{$ip}'.";
        }
        $config          = new MikoPBXConfig();
        $fail2ban_enable = $config->getGeneralSettings('PBXFail2BanEnabled');
        $enable          = ($fail2ban_enable == '1');
        if ($enable) {
            // Попробуем найти jail по данным DB.
            // fail2ban-client unban 172.16.156.1
            // TODO Util::mwExec("fail2ban-client unban {$ip}}");
            $data = self::getBanIp($ip);
            foreach ($data as $row) {
                $res = self::fail2banUnban($ip, $row['jail']);
                if (!$res->success) {
                    return $res;
                }
            }
        } else {
            $res = self::fail2banUnbanDb($ip);
        }

        return $res;
    }

    /**
     * Возвращает массив забаненных ip. Либо данные по конкретному адресу.
     *
     * @param null $ip
     *
     * @return PBXApiResult
     */
    public static function getBanIp($ip = null): PBXApiResult
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

        $path_db = Firewall::FAIL2BAN_DB_PATH;
        $db      = new SQLite3($path_db);
        $db->busyTimeout(5000);

        if (false === Firewall::tableBanExists($db)) {
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
     * Удалить из бана конкретный IP из конкретного jail.
     *
     * @param $ip
     * @param $jail
     *
     * @return PBXApiResult
     */
    public static function fail2banUnban($ip, $jail): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $ip  = trim($ip);
        // Валидация...
        // $matches = [];
        // preg_match_all('/^[a-z-]+$/', $jail, $matches, PREG_SET_ORDER);
        if ( ! Verify::isIpAddress($ip)) {
            // это НЕ IP адрес, или не корректно указан jail.
            $res->messages[]='Not valid ip or jail.';
            return $res;
        }
        $path_sock = '/var/run/fail2ban/fail2ban.sock';
        if (file_exists($path_sock) && filetype($path_sock) === 'socket') {
            $out = [];
            $fail2banPath = Util::which('fail2ban-client');
            Util::mwExec("{$fail2banPath} set {$jail} unbanip {$ip} 2>&1", $out);
            $res_data = trim(implode('', $out));
            if ($res_data !== $ip && $res_data !== "IP $ip is not banned") {
                $res->messages[] = 'Error fail2ban-client. ' . $res_data;
                return $res;
            }
        } else {
            $res->messages[] = 'Fail2ban not run.';
            return $res;
        }

        $res = self::fail2banUnbanDb($ip, $jail);

        return $res;
    }

    /**
     * Удаление бана из базы.
     *
     * @param        $ip
     * @param string $jail
     *
     * @return PBXApiResult
     */
    public static function fail2banUnbanDb($ip, $jail = ''): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $jail_q  = ($jail === '') ? '' : "AND jail = '{$jail}'";
        $path_db = Firewall::FAIL2BAN_DB_PATH;
        $db      = new SQLite3($path_db);
        $db->busyTimeout(3000);
        if (false === Firewall::tableBanExists($db)) {
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