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
// Blind transfer (**) by B to C; C's phone forwards by itself (302) to D, D answers. The A->D row
// starts on the forwarded Local leg, which is optimized away once D answers: it must stay ANSWERED.
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
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'dNum', 'disposition' => 'ANSWERED',
    'duration' => '11', 'billsec' => '9', 'fileDuration' => '8',
];

TestCallsBase::executeTest($sampleCDR);
