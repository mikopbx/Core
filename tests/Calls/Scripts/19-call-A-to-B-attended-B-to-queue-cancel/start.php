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

use MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';

$sampleCDR = [];
// Attended transfer (##) by B to a ring-all queue (#1125): no agent answers and B cancels the
// transfer about 10.6 s after answering. B returns to A and the A<->B recording resumes in the same
// file: 4.4-5.7 s before the consultation plus up to 5.4 s until B hangs up at 16 s, i.e. 7-11 s.
// Without the resume it would stay at 4-6 s; recording the consultation would make it ~16 s.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'ANSWERED',
    'duration' => '17', 'billsec' => '16', 'fileDuration' => ['7', '11'],
];
// The queue's own row: when it ends is not what this test checks, so only its presence is compared.
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'queueNum', 'disposition' => 'NOANSWER'];
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER',
    'duration' => '5', 'billsec' => '0', 'fileDuration' => '0',
];
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER',
    'duration' => '5', 'billsec' => '0', 'fileDuration' => '0',
];

TestCallsBase::executeTest($sampleCDR);
