<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';
require_once 'Nats/autoloader.php';

// Обработчик результата запроса. 
$worker = function ($message) {
	echo "Получена строка в ".strlen($message)." символов\n";
};

$start = microtime(true);

$client = new \Nats\Connection();
$client->connect(1);

echo "отправляем строку в ".strlen($q)." символов\n";

while ($ch < 1000){
    $ch++;
    $q = Util::generateRandomString($ch);
    $client->request('echo', $q, $worker);
    // echo $result."\n";
}

echo "Total time: ". (microtime(true) - $start);


