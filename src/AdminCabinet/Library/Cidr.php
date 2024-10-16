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

namespace MikoPBX\AdminCabinet\Library;

use Phalcon\Di\Injectable;

class Cidr extends Injectable
{
    // convert cidr to netmask
    // e.g. 21 = 255.255.248.0
    public function cidr2netmask(int $cidr): false|string
    {
        $bin = '';
        for ($i = 1; $i <= 32; $i++) {
            $bin .= $cidr >= $i ? '1' : '0';
        }

        $netmask = long2ip(intval(bindec($bin)));

        if ($netmask == "0.0.0.0") {
            return false;
        }

        return $netmask;
    }

    // get network address from cidr subnet
    // e.g. 10.0.2.56/21 = 10.0.0.0
    public function cidr2network(string $ip, int $cidr): false|string
    {
        return long2ip((ip2long($ip)) & ((-1 << (32 - $cidr))));
    }

    // convert netmask to cidr
    // e.g. 255.255.255.128 = 25
    public function netmask2cidr(string $netmask): int
    {
        $bits    = 0;
        $netmask = explode(".", $netmask);

        foreach ($netmask as $octect) {
            $bits += strlen(str_replace("0", "", decbin((int)$octect)));
        }

        return $bits;
    }

    // is ip in subnet
    // e.g. is 10.5.21.30 in 10.5.16.0/20 == true
    //      is 192.168.50.2 in 192.168.30.0/23 == false
    public function cidr_match(string $ip, string $network, int $cidr): bool
    {
        if ((ip2long($ip) & ~((1 << (32 - $cidr)) - 1)) == ip2long($network)) {
            return true;
        }

        return false;
    }

    /**
     * Retrieves an array of network masks with CIDR notation as the key and the corresponding netmask.
     *
     * @return array Associative array where keys are CIDR notation (0-32) and values
     * are the corresponding netmask strings.
     */
    public static function getNetMasks(): array
    {
        $arrMasks = [
            "0" => "0 - 0.0.0.0",
            "1" => "1 - 128.0.0.0",
            "2" => "2 - 192.0.0.0",
            "3" => "3 - 224.0.0.0",
            "4" => "4 - 240.0.0.0",
            "5" => "5 - 248.0.0.0",
            "6" => "6 - 252.0.0.0",
            "7" => "7 - 254.0.0.0",
            "8" => "8 - 255.0.0.0",
            "9" => "9 - 255.128.0.0",
            "10" => "10 - 255.192.0.0",
            "11" => "11 - 255.224.0.0",
            "12" => "12 - 255.240.0.0",
            "13" => "13 - 255.248.0.0",
            "14" => "14 - 255.252.0.0",
            "15" => "15 - 255.254.0.0",
            "16" => "16 - 255.255.0.0",
            "17" => "17 - 255.255.128.0",
            "18" => "18 - 255.255.192.0",
            "19" => "19 - 255.255.224.0",
            "20" => "20 - 255.255.240.0",
            "21" => "21 - 255.255.248.0",
            "22" => "22 - 255.255.252.0",
            "23" => "23 - 255.255.254.0",
            "24" => "24 - 255.255.255.0",
            "25" => "25 - 255.255.255.128",
            "26" => "26 - 255.255.255.192",
            "27" => "27 - 255.255.255.224",
            "28" => "28 - 255.255.255.240",
            "29" => "29 - 255.255.255.248",
            "30" => "30 - 255.255.255.252",
            "31" => "31 - 255.255.255.254",
            "32" => "32 - 255.255.255.255",
        ];
        krsort($arrMasks, SORT_NUMERIC);
        return $arrMasks;
    }
}
