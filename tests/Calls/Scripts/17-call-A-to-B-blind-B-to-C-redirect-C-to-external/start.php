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
// Blind transfer (**) by B to C; C's phone forwards by itself (302) to an external number.
// The A<->B recording ends at the transfer: Asterisk may drop its last ~1.3 s (the transfer prompt),
// so its length is 4-6 s, see README.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'ANSWERED',
    'duration' => '8', 'billsec' => '7', 'fileDuration' => ['4', '6'],
];
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'cNum', 'disposition' => 'NOANSWER',
    'duration' => '1', 'billsec' => '0', 'fileDuration' => '0',
];
// A hangs up at its absolute timeout (20 s); the forward through the outgoing route takes ~2 s
// longer than in test 14.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => '74952293042', 'disposition' => 'ANSWERED',
    'duration' => '10', 'billsec' => '8', 'fileDuration' => '8',
];

TestCallsBase::executeTest($sampleCDR);
