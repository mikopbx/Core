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
     * Retrieves an array of IPv4 network masks with CIDR notation as the key and the corresponding netmask.
     *
     * @return array<string, string> Associative array where keys are CIDR notation (0-32) and values
     * are the corresponding netmask strings.
     */
    public static function getNetMasks(): array
    {
        return self::getIPv4NetMasks();
    }

    /**
     * Retrieves an array of IPv4 network masks with CIDR notation as the key and the corresponding netmask.
     *
     * @return array<string, string> Associative array where keys are CIDR notation (0-32) and values
     * are the corresponding netmask strings, sorted from /32 to /0
     * @phpstan-return array<string, string>
     */
    public static function getIPv4NetMasks(): array
    {
        // Pre-calculated netmasks for all CIDR values (0-32)
        $netmaskValues = [
            "0.0.0.0",
            "128.0.0.0",
            "192.0.0.0",
            "224.0.0.0",
            "240.0.0.0",
            "248.0.0.0",
            "252.0.0.0",
            "254.0.0.0",
            "255.0.0.0",
            "255.128.0.0",
            "255.192.0.0",
            "255.224.0.0",
            "255.240.0.0",
            "255.248.0.0",
            "255.252.0.0",
            "255.254.0.0",
            "255.255.0.0",
            "255.255.128.0",
            "255.255.192.0",
            "255.255.224.0",
            "255.255.240.0",
            "255.255.248.0",
            "255.255.252.0",
            "255.255.254.0",
            "255.255.255.0",
            "255.255.255.128",
            "255.255.255.192",
            "255.255.255.224",
            "255.255.255.240",
            "255.255.255.248",
            "255.255.255.252",
            "255.255.255.254",
            "255.255.255.255",
        ];

        // Build array in reverse order (32 down to 0) with string keys
        $arrMasks = [];
        for ($i = 32; $i >= 0; $i--) {
            $key = (string)$i;
            $arrMasks[$key] = $key . ' - ' . $netmaskValues[$i];
        }

        // PHPStan workaround: ensure keys are strings
        /** @var array<string, string> */
        return $arrMasks;
    }

    /**
     * Retrieves an array of IPv6 prefix lengths
     *
     * @return array<string, string> Associative array where keys and values are prefix lengths (0-128),
     * sorted from /128 to /0
     * @phpstan-return array<string, string>
     */
    public static function getIPv6NetMasks(): array
    {
        // Build array in reverse order (128 down to 0) with string keys
        $masks = [];
        for ($i = 128; $i >= 0; $i--) {
            $key = (string)$i;
            $masks[$key] = $key;
        }

        // PHPStan workaround: ensure keys are strings
        /** @var array<string, string> */
        return $masks;
    }
}
