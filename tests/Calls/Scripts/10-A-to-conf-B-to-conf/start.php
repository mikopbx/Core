<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
use \MikoPBX\Core\Asterisk\Configs\ConferenceConf;
require_once __DIR__ . '/../TestCallsBase.php';

// Получим номер конференции.
[$conf] = ConferenceConf::getConferenceExtensions();

$sampleCDR = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=> $conf, 'duration'=>'11', 'billsec'=>'11', 'fileDuration' => '11'];
$sampleCDR[] = ['src_num'=>'bNum', 'dst_num'=> $conf, 'duration'=>'10', 'billsec'=>'10'];

$testName = basename(__DIR__);
$test = new TestCallsBase();

$rules = [
    [TestCallsBase::ACtION_ORIGINATE, 'aNum', $conf],
    [TestCallsBase::ACtION_WAIT, 2],
    [TestCallsBase::ACtION_ORIGINATE, 'bNum', $conf],
];
$test->runTest($testName, $sampleCDR, $rules);