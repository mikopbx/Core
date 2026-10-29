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
// Attended transfer (##) by B to C; C's phone forwards by itself (302) to an external number, and B
// hangs up while that number still rings. Once it answers, A talks to it: one row, with its recording.
// The answer of C's own leg (on the Local channel of the forward) is not a *8 pickup and must not
// bill an A->C row.
// The A<->B recording ends at the transfer, ~1 s after the answer.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'ANSWERED',
    'duration' => '10', 'billsec' => '9', 'fileDuration' => '2',
];
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER',
    'duration' => '1', 'billsec' => '0', 'fileDuration' => '0',
];
// The forwarded call rings ~5 s while B is still on the line; B's hangup ends this row.
$sampleCDR[] = [
    'src_num' => 'bNum', 'dst_num' => '74952293042', 'disposition' => 'NOANSWER',
    'duration' => '5', 'billsec' => '0', 'fileDuration' => '0',
];
// From the answer (~2 s after B left) until A hangs up at its absolute timeout (20 s).
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => '74952293042', 'disposition' => 'ANSWERED',
    'duration' => '6', 'billsec' => '6', 'fileDuration' => '6',
];

TestCallsBase::executeTest($sampleCDR);
