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
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Util;
use MikoPBX\Tests\Calls\Scripts\TestCallsBase;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Core\System\Processes;
require_once 'Globals.php';
require_once dirname(__DIR__).'/TestCallsBase.php';

$testName = basename(__DIR__);
TestCallsBase::printHeader("Start test {$testName}");
TestCallsBase::printInfo("Get data peers...");
$limitPeers = 5;
$peers = Sip::find([
    "type = 'peer' AND disabled <> '1'",
    'limit' => $limitPeers,
    'order' => 'extension'
])->toArray();

$limitProviders = 2;
// Подбираем учетки провайдеров.
$providers = Sip::find([
    "type='friend' AND disabled<>'1' AND registration_type='none'",
    'limit' => $limitProviders
])->toArray();

$limitPeers = min(count($peers), $limitPeers);
$peers = array_merge(... [$peers, $providers]);

TestCallsBase::printInfo("Make pjsip.conf...");
$enpointPattern = file_get_contents(__DIR__.'/configs/pjsip-pattern-endpoint.conf');

$config         = str_replace('<USER-AGENT>', getenv('USER_AGENT'), file_get_contents(__DIR__.'/configs/pjsip-pattern.conf'));
foreach ($peers as $peer){
    $columnName = ($peer["type"] === 'friend')?'uniqid':'extension';
    $conf = str_replace(array('<ENDPOINT>', '<PASSWORD>'), array($peer[$columnName], $peer['secret']), $enpointPattern);
    $config .= "\n$conf \n";
}

$dirName = getenv('dirName');
$astConf = getenv('astConf');

TestCallsBase::printInfo("Copy pjsip.conf...");
file_put_contents("$dirName/asterisk/pjsip.conf", $config);

TestCallsBase::printInfo("Reload res_pjsip...");
$cmdAsterisk = Util::which('asterisk');
Processes::mwExec("{$cmdAsterisk} -C '$astConf' -rx 'module reload res_pjsip.so'");
Processes::mwExec("{$cmdAsterisk} -C '$astConf' -rx 'pjsip send register *all'");

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
if(count($idlePeers) < $limitPeers){
    TestCallsBase::printError('Not all endpoint are registered:');
}else{
    TestCallsBase::printInfo('Endpoints connected successfully');
}

$needChangePriority = false;
foreach ($providers as $provider){
    $rout = OutgoingRoutingTable::findFirst("providerid='{$provider['uniqid']}' AND numberbeginswith='(7|8)'");
    if($rout !== null){
        continue;
    }
    $needChangePriority = true;
    $newRout = new OutgoingRoutingTable();
    $newRout->rulename   = 'Test out rout №1';
    $newRout->providerid = $provider['uniqid'];
    $newRout->priority = 0;
    $newRout->numberbeginswith = '(7|8)';
    $newRout->restnumbers = '10';
    $newRout->trimfrombegin = '0';
    $newRout->prepend = '';
    $newRout->note = 'TEST_CALLS';
    $newRout->save();
}
if($needChangePriority === true){
    // Опишем исходящие маршруты.
    $outRouts = OutgoingRoutingTable::find();
    /** @var OutgoingRoutingTable $rout */
    foreach ($outRouts as $rout){
        if($rout->note === 'TEST_CALLS'){
            continue;
        }
        $rout->priority += 5;
        $rout->save();
    }
    PBX::dialplanReload();
}

sleep(5);
TestCallsBase::printInfo("End test \n");