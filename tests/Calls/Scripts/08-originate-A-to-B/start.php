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
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'74952293042', 'duration'=>'16', 'billsec'=>'10', 'fileDuration' => '10'];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$rules = [
    [TestCallsBase::ACtION_GENERAL_ORIGINATE, 'aNum', '74952293042'],
];
$test->runTest($testName, $sampleCDR, $rules);