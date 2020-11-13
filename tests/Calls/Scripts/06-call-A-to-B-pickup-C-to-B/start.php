<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__ . '/../TestCallsBase.php';

$sampleCDR = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', 'duration'=>'5', 'billsec'=>'0', 'fileDuration' => '0'];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'cNum', 'duration'=>'10', 'billsec'=>'10', 'fileDuration' => '10'];

$testName = basename(__DIR__);
$test = new TestCallsBase();

$rules = [
    [TestCallsBase::ACtION_ORIGINATE, 'aNum', 'bNum'],
    [TestCallsBase::ACtION_WAIT, 5],
    [TestCallsBase::ACtION_ORIGINATE, 'cNum', '8'],
];
$test->runTest($testName, $sampleCDR, $rules);