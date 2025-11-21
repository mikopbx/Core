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
     * Returns true if $ipaddr is a valid IPv4 or IPv6 address.
     *
     * @param string $ipaddr The string to validate as an IP address.
     * @param int $flags Optional flags to restrict validation to IPv4 or IPv6.
     *                   Use FILTER_FLAG_IPV4 for IPv4 only, FILTER_FLAG_IPV6 for IPv6 only,
     *                   or combine both (default) for dual-stack validation.
     *
     * @return bool|null Returns true if the $ipaddr is a valid IP address, false otherwise.
     */
    public static function isIpAddress(string $ipaddr, int $flags = FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6): ?bool
    {
        if (empty($ipaddr)) {
            return false;
        }

        return filter_var($ipaddr, FILTER_VALIDATE_IP, $flags) !== false;
    }

    /**
     * Verifies input as being a numeric integer.
     *
     * @param mixed $arg The argument to validate as a numeric integer.
     *
     * @return bool Returns true if $arg is a numeric integer, false otherwise.
     */
    public function isNumericInt(mixed $arg): bool
    {
        // Check if $arg has any non-numeric characters.
        // If it does, it's not a numeric integer, so return false.
        // Otherwise, return true.
        return (preg_match("/[^0-9]/", $arg) ? false : true);
    }
}