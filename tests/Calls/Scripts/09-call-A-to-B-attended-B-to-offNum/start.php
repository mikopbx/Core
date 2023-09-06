<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';

$sampleCDR   = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum',  'duration'=>'11', 'billsec'=>'10', 'fileDuration' => '6'];
$sampleCDR[] = ['src_num'=>'bNum', 'dst_num'=>'offNum','duration'=>'0',  'billsec'=>'0',  'fileDuration' => '0'];
$sampleCDR[] = ['src_num'=>'bNum', 'duration'=>'3',  'billsec'=>'2',  'fileDuration' => '2'];
$sampleCDR[] = ['src_num'=>'aNum', 'duration'=>'6',  'billsec'=>'6',  'fileDuration' => '5'];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR);
