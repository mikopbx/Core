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

// Originate A -> B; A's phone rings, A answers it with *8A from the same endpoint.
// The PBX redirects the picking channel to the destination and drops the originate leg: one answered
// row with the recording and no leftover row of the originate attempt. all_peers would also survive a
// missing ORIGINATE_SRC_CHANNEL by dialing from the originate leg; 27 covers the context that does not.
$sampleCDR = [];
$sampleCDR[] = [
    'src_num' => 'aNum',
    'dst_num' => 'bNum',
    'disposition' => 'ANSWERED',
    'duration' => '11',
    'billsec' => '8',
    'fileDuration' => '8',
];

$rules = [
    [TestCallsBase::ACTION_GENERAL_ORIGINATE, 'aNum', 'bNum'],
    [TestCallsBase::ACTION_WAIT, 3],
    [TestCallsBase::ACTION_ORIGINATE, 'aNum', '8'],
];
TestCallsBase::executeTest($sampleCDR, $rules);
