<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
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
    static function isIpAddress($ipaddr)
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
    function isNumericInt($arg)
    {
        return (preg_match("/[^0-9]/", $arg) ? false : true);
    }
}