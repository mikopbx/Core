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

use GeoIp2\Database\Reader;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\GeoIP2Conf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 *  Class GetBannedIp
 *  Retrieve a list of banned IP addresses or get data for a specific IP address.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class GetBannedIpsAction extends Injectable
{
    /**
     * GeoIP2 database reader instance
     *
     * @var Reader|null
     */
    private static ?Reader $geoReader = null;

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
        $res->data = self::getBanIpWithTime();
        return $res;
    }

    /**
     * Initialize GeoIP2 reader if available
     *
     * @return void
     */
    private static function initGeoReader(): void
    {
        if (self::$geoReader !== null) {
            return;
        }

        $dbPath = GeoIP2Conf::getDatabasePath();
        if ($dbPath !== null) {
            try {
                self::$geoReader = new Reader($dbPath);
            } catch (\Throwable $e) {
                self::$geoReader = null;
            }
        }
    }

    /**
     * Get country information for an IP address
     *
     * @param string $ip IP address to lookup
     * @return array Country information (isoCode and name)
     */
    private static function getCountryInfo(string $ip): array
    {
        $result = [
            'isoCode' => '',
            'name' => '',
        ];

        self::initGeoReader();

        if (self::$geoReader === null) {
            return $result;
        }

        try {
            $record = self::$geoReader->country($ip);
            $result['isoCode'] = $record->country->isoCode ?? '';
            $result['name'] = $record->country->name ?? '';
        } catch (\Throwable $e) {
            // IP not found or error - return empty data
        }

        return $result;
    }

    /**
     * Retrieve a list of banned IP addresses with their corresponding ban and unban timestamps.
     *
     * @return array An array containing the banned IP addresses and their timestamps.
     */
    public static function getBanIpWithTime():array
    {
        $groupedResults = [];
        
        
        return $groupedResults;
        
        $sep = '"|"';
        $sepSpace = '" "';
        $fail2banPath = Util::which(Fail2BanConf::FB_CLIENT_BIN);
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

                // Check if this IP is already in the result array.
                if (!isset($groupedResults[$ip])) {
                    // If not, initialize it and add country info
                    $countryInfo = self::getCountryInfo($ip);
                    $groupedResults[$ip] = [
                        'country' => $countryInfo['isoCode'],
                        'countryName' => $countryInfo['name'],
                        'bans' => [],
                    ];
                }

                // Append the ban details to the existing array for this IP.
                $groupedResults[$ip]['bans'][] = [
                    'jail' => "{$jail}_v2",
                    'timeofban' => self::time2stamp($ipData[1]),
                    'timeunban' => self::time2stamp($ipData[2]),
                    'v' => '2',
                ];
            }
        }
        return $groupedResults;
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

}