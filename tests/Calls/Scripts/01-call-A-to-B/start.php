<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';

$sampleCDR   = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', 'duration'=>'7', 'billsec'=>'5', 'fileDuration' => '5'];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR);