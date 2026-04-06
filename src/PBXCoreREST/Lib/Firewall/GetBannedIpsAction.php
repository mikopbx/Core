<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Configs\GeoIP2Conf;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use SQLite3;

/**
 *  Class GetBannedIpsAction
 *  Retrieve a list of banned IP addresses or get data for a specific IP address.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class GetBannedIpsAction extends Injectable
{
    public const string CACHE_KEY = 'firewall:bannedIps';
    private const int CACHE_TTL = 30;

    /**
     * Retrieve a list of banned IP addresses or get data for a specific IP address.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $di = Di::getDefault();
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);

        $cached = $managedCache->get(self::CACHE_KEY);
        if ($cached !== null) {
            $res->data = $cached;
            return $res;
        }

        $res->data = self::getBanIpWithTime();
        $managedCache->set(self::CACHE_KEY, $res->data, self::CACHE_TTL);

        return $res;
    }

    /**
     * Retrieve a list of currently banned IP addresses with their ban/unban timestamps.
     * Reads directly from fail2ban SQLite database for instant response (~3ms vs ~8s via fail2ban-client).
     *
     * @return array An array of banned IPs grouped by IP address with country info and ban details.
     */
    public static function getBanIpWithTime(): array
    {
        $groupedResults = [];
        $dbPath = Fail2BanConf::FAIL2BAN_DB_PATH;

        if (!file_exists($dbPath)) {
            return $groupedResults;
        }

        $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
        $db->busyTimeout(3000);

        if (false === Fail2BanConf::tableBanExists($db)) {
            $db->close();
            return $groupedResults;
        }

        $now = time();
        $stmt = $db->prepare(
            'SELECT jail, ip, timeofban, timeofban + bantime AS timeunban '
            . 'FROM bans WHERE timeofban + bantime > :now'
        );
        $stmt->bindValue(':now', $now, SQLITE3_INTEGER);
        $result = $stmt->execute();

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $ip = $row['ip'] ?? '';
            if (empty($ip)) {
                continue;
            }

            if (!isset($groupedResults[$ip])) {
                $countryInfo = GeoIP2Conf::getCountryByIp($ip);
                $groupedResults[$ip] = [
                    'country' => $countryInfo['isoCode'],
                    'countryName' => $countryInfo['name'],
                    'bans' => [],
                ];
            }

            $jail = $row['jail'] ?? '';
            $groupedResults[$ip]['bans'][] = [
                'jail' => "{$jail}_v2",
                'timeofban' => (int)$row['timeofban'],
                'timeunban' => (int)$row['timeunban'],
                'v' => '2',
            ];
        }

        $stmt->close();
        $db->close();

        return $groupedResults;
    }
}
