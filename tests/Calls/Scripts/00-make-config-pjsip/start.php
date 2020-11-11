<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
use MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once 'Globals.php';

$testName = basename(__DIR__);
TestCallsBase::printHeader("Start test {$testName}");

TestCallsBase::printInfo("Get data peers...");
$limitPeers = 10;
$db_data = Sip::find([
    "type = 'peer' AND ( disabled <> '1')",
    'limit' => $limitPeers
]);
$limitPeers = min(count($db_data->toArray()), $limitPeers);

TestCallsBase::printInfo("Make pjsip.conf...");
$enpointPattern = file_get_contents(__DIR__.'/configs/pjsip-pattern-endpoint.conf');
$config         = file_get_contents(__DIR__.'/configs/pjsip-pattern.conf');
/** @var Sip $peer */
foreach ($db_data as $peer){
    $conf = str_replace(array('<ENDPOINT>', '<PASSWORD>'), array($peer->extension, $peer->secret), $enpointPattern);
    $config .= "\n$conf \n";
}

$dirName = getenv('dirName');
$astConf = getenv('astConf');


TestCallsBase::printInfo("Copy pjsip.conf...");
file_put_contents("$dirName/asterisk/pjsip.conf", $config);

TestCallsBase::printInfo("Reload res_pjsip...");
$cmdAsterisk = Util::which('asterisk');
Util::mwExec("{$cmdAsterisk} -C '$astConf' -rx 'module reload res_pjsip.so'");

$duration = 120;
$start = time();
TestCallsBase::printInfo("Waiting for registration of peers. Wait max {$duration} s...");
do{
    sleep(1);
    $idlePeers = TestCallsBase::getIdlePeers();
    if ((time() - $start) >= $duration){
        break;
    }
}while(count($idlePeers) < $limitPeers);

TestCallsBase::printInfo('Time waiting '.(time() - $start).'s...');
if(count($idlePeers) !== $limitPeers){
    TestCallsBase::printError('Not all endpoint are registered:');
}else{
    TestCallsBase::printInfo('Endpoints connected successfully');
}
TestCallsBase::printInfo('End test ');