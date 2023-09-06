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

namespace MikoPBX\Core\System;

/**
 * Class Verify
 *
 * This class contains methods for verifying certain types of input.
 *
 * @package MikoPBX\Core\System
 *
 */
class Verify
{

    /**
     * Returns true if $ipaddr is a valid dotted IPv4 address.
     *
     * @param string $ipaddr The string to validate as an IP address.
     *
     * @return bool|null Returns true if the $ipaddr is a valid IP address, false otherwise.
     */
    public static function isIpAddress(string $ipaddr): ?bool
    {
        // Convert the IP address to long format.
        $ip_long    = ip2long($ipaddr);

        // Convert back to IP address.
        $ip_reverse = long2ip($ip_long);

        // Check if the original IP address is the same as the one we converted back.
        // If it's the same, it means the IP address is valid.
        if ($ipaddr == $ip_reverse) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Verifies input as being a numeric integer.
     *
     * @param mixed $arg The argument to validate as a numeric integer.
     *
     * @return bool Returns true if $arg is a numeric integer, false otherwise.
     */
    public function isNumericInt($arg): bool
    {
        // Check if $arg has any non-numeric characters.
        // If it does, it's not a numeric integer, so return false.
        // Otherwise, return true.
        return (preg_match("/[^0-9]/", $arg) ? false : true);
    }
}