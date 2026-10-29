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
// As test 21, but B calls A: B's channel starts the call, so the transferee is found through the
// queue caller channel rather than through the oldest channel of the call (which is B and gone).
// B consults a ring-all queue, both agents are busy in the first round, B hangs up in the pause
// before the retry, and the retry must ring the agents for A; C answers.
// The B<->A recording ends at the transfer: Asterisk may drop its last ~1.3 s (the transfer prompt).
// B's hangup ends this row: it is B's own call, not a consultation leg kept open for A.
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'aNum', 'disposition' => 'ANSWERED',
    'duration' => '10', 'billsec' => '9', 'fileDuration' => ['4', '6'],
];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'queueNum', 'disposition' => 'NOANSWER'];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
$sampleCDR[] = ['src_num' => 'bNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
$sampleCDR[] = ['src_num' => 'aNum', 'dst_num' => 'dNum', 'disposition' => 'NOANSWER', 'billsec' => '0'];
// C answers ~4 s after the retry and talks to A until A hangs up at its absolute timeout (20 s after
// A's answer; B starts its consultation from A's answer, so this is ~1 s longer than in test 21).
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'cNum', 'disposition' => 'ANSWERED',
    'duration' => '10', 'billsec' => '6', 'fileDuration' => '6',
];

TestCallsBase::executeTest($sampleCDR);
