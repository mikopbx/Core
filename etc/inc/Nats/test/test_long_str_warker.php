<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2018
 */

require_once 'globals.php';
require_once 'Nats/autoloader.php';

$client = new \Nats\Connection();

$echo_worker = function ($message) {
	// echo "Получена строка в ".strlen($message)." символов\n";
	$message->reply($message);
};

while (true) {
	$client->connect();
	$client->subscribe('echo',  	  $echo_worker);
	$client->wait();
}
