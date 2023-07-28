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

/**
 * Created by PhpStorm.
 * User: nikolaybeketov
 * Date: 12.03.2018
 * Time: 12:09
 */
class Cidr extends Injectable
{
    // convert cidr to netmask
    // e.g. 21 = 255.255.248.0
    public function cidr2netmask($cidr)
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
    public function cidr2network($ip, $cidr)
    {
        return long2ip((ip2long($ip)) & ((-1 << (32 - (int)$cidr))));
    }

    // convert netmask to cidr
    // e.g. 255.255.255.128 = 25
    public function netmask2cidr($netmask)
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
    public function cidr_match($ip, $network, $cidr)
    {
        if ((ip2long($ip) & ~((1 << (32 - $cidr)) - 1)) == ip2long($network)) {
            return true;
        }

        return false;
    }
}