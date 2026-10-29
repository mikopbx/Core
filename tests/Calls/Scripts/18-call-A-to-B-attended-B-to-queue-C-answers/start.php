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
// Attended transfer (##) by B to a ring-all queue with agents C and D (#1084): D rejects the call
// (busy) while C still rings, C answers, then B hangs up and the transfer completes. D's rejection
// must close only D's leg, not C's. B talks to C ~3 s, then A talks to C until C hangs up at its
// absolute timeout (7 s after its answer).
// The A<->B recording ends at the transfer: Asterisk may drop its last ~1.3 s (the transfer prompt),
// so its length is 4-6 s, see README.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'ANSWERED',
    'duration' => '13', 'billsec' => '12', 'fileDuration' => ['4', '6'],
];
// The queue's own row: when it ends is not what this test checks, so only its presence is compared.
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'queueNum', 'disposition' => 'NOANSWER'];
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER',
    'duration' => '1', 'billsec' => '0', 'fileDuration' => '0',
];
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'ANSWERED',
    'duration' => '5', 'billsec' => '3', 'fileDuration' => '3',
];
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'cNum', 'disposition' => 'ANSWERED',
    'duration' => '4', 'billsec' => '4', 'fileDuration' => '4',
];

TestCallsBase::executeTest($sampleCDR);
