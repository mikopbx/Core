<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

class Verify
{

    /**
     * Returns true if $ipaddr is a valid dotted IPv4 address
     *
     * @param $ipaddr
     *
     * @return bool
     */
    public static function isIpAddress($ipaddr): ?bool
    {
        if ( ! is_string($ipaddr)) {
            return false;
        }

        $ip_long    = ip2long($ipaddr);
        $ip_reverse = long2ip($ip_long);

        if ($ipaddr == $ip_reverse) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Verifies input as being a numeric integer
     *
     * @param $arg
     *
     * @return bool
     */
    public function isNumericInt($arg): bool
    {
        return (preg_match("/[^0-9]/", $arg) ? false : true);
    }
}