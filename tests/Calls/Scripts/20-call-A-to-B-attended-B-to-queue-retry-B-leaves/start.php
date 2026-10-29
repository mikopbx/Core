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
// Attended transfer (##) by B to a ring-all queue with a retry (#1100): in the first round C and D
// are busy, B hangs up (11 s after answering) while both agents ring in the retry, and C answers it.
// A then talks to C: that conversation must be billed, from C's answer, with its recording.
// The A<->B recording ends at the transfer: Asterisk may drop its last ~1.3 s (the transfer prompt),
// so its length is 4-6 s, see README.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'ANSWERED',
    'duration' => '13', 'billsec' => '11', 'fileDuration' => ['4', '6'],
];
// The queue's own row: when it ends is not what this test checks, so only its presence is compared.
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'queueNum', 'disposition' => 'NOANSWER'];
// First round: both agents are busy. Retry: both ring; B's hangup ends these rows, C's answer
// and D's cancel come later.
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
// C answers ~4 s after the retry and talks to A until A hangs up at its absolute timeout (20 s).
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'cNum', 'disposition' => 'ANSWERED',
    'billsec' => '5', 'fileDuration' => '4',
];

TestCallsBase::executeTest($sampleCDR);
