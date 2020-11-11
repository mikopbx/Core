<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
require_once 'Globals.php';

$testName = basename(__DIR__);
echo "\033[01;35mStart test {$testName}\033[39m \n";

$limitPeers = 10;
$db_data = Sip::find([
    "type = 'peer' AND ( disabled <> '1')",
    'limit' => $limitPeers
]);
$limitPeers = min(count($db_data->toArray()), $limitPeers);

$enpointPattern = file_get_contents(__DIR__.'/configs/pjsip-pattern-endpoint.conf');
$config         = file_get_contents(__DIR__.'/configs/pjsip-pattern.conf');
/** @var Sip $peer */
foreach ($db_data as $peer){
    $conf = str_replace(array('<ENDPOINT>', '<PASSWORD>'), array($peer->extension, $peer->secret), $enpointPattern);
    $config .= "\n$conf \n";
}

$dirName = getenv('dirName');
$astConf = getenv('astConf');

$cmdAsterisk = Util::which('asterisk');
file_put_contents("$dirName/asterisk/pjsip.conf", $config);
Util::mwExec("{$cmdAsterisk} -C '$astConf' -rx 'module reload res_pjsip.so'");

$duration = count($db_data->toArray())*3;
echo "\033[01;32m-> \033[39mWaiting for registration of peers {$duration} s... \n";
sleep($duration);
$result = Util::mwExec($cmdAsterisk.' -rx"core show hints" | grep PJSIP/ | grep Idle', $out);
if(count($out) !== $limitPeers){
    file_put_contents('php://stderr', "\033[01;31m-> ".'Not all endpoint are registered: '. implode("\n", $out)."\033[39m \n");
}else{
    echo "\033[01;32m-> \033[39mEndpoints connected successfully \n";
}

sleep(5);
echo "\033[01;32m-> \033[39mEnd test \n\n";
