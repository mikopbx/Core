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
// B's phone forwards the call by itself (302 Moved Temporarily to C): the B leg is not answered.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'bNum', 'disposition' => 'NOANSWER',
    'duration' => '1', 'billsec' => '0', 'fileDuration' => '0',
];
// The forwarded call gets its own row with the answer and the recording.
$sampleCDR[] = [
    'src_num' => 'aNum', 'dst_num' => 'cNum', 'disposition' => 'ANSWERED',
    'duration' => '8', 'billsec' => '7', 'fileDuration' => '7',
];

TestCallsBase::executeTest($sampleCDR);
