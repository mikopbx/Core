<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

require_once 'globals.php';

class Verify {

    /**
     * Returns true if $ipaddr is a valid dotted IPv4 address
     * @param $ipaddr
     * @return bool
     */
	static function is_ipaddress($ipaddr) {
	
		if (!is_string($ipaddr)) {
			return false;
		}
		
		$ip_long = ip2long($ipaddr);
		$ip_reverse = long2ip($ip_long);
	 
		if ($ipaddr == $ip_reverse) {
			return true;
		} else {
			return false;
		}
	}

    /**
     * Verifies input as being a numeric integer
     * @param $arg
     * @return bool
     */
	function is_numericint($arg) {
		return (preg_match("/[^0-9]/", $arg) ? false : true);
	}
}