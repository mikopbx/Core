<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';
$i = 0;
while($i < 1){
	$lines = file(__DIR__.'/nats_log');
	// Осуществим проход массива и выведем номера строк и их содержимое в виде HTML-кода.
	foreach ($lines as $line_num => $line) {
		$row = trim($line);
		$client = new BeanstalkClient('call_events');
		$client->publish($row);
	}
	$i = $i + 1;
}
