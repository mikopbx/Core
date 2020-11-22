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
// TODO Разобраться с 'billsec' > 'fileDuration'
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', 'duration'=>'12', 'billsec'=>'10', 'fileDuration' => '4'];
$sampleCDR[] = ['src_num'=>'bNum', 'dst_num'=>'cNum', 'duration'=>'5',  'billsec'=>'4',  'fileDuration' => '4'];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR);
