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
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', 'duration'=>'11', 'billsec'=>'10', 'fileDuration' => '6'];
$sampleCDR[] = ['src_num'=>'bNum', 'dst_num'=>'cNum', 'duration'=>'3',  'billsec'=>'2',  'fileDuration' => '2'];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'cNum', 'duration'=>'6',  'billsec'=>'6',  'fileDuration' => '2'];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR);
