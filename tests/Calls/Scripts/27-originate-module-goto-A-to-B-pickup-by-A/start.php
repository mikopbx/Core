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

// The after-answer context of a CTI / PT1C originate (ModuleCTIClient [miko-cti2-goto], ModulePT1CCore
// [miko-ajam-goto]): redirect the answered channel to the destination, then hang up the originate leg
// whatever happened. Without ORIGINATE_SRC_CHANNEL on that leg the call is dropped.
$context = 'calls-test-module-goto';
$added = TestCallsBase::addPbxContext($context, [
    'ExecIf($[!${ISNULL(${ORIGINATE_SRC_CHANNEL})}]?ChannelRedirect(${ORIGINATE_SRC_CHANNEL},all_peers,${EXTEN},1))',
    'Hangup()',
]);
register_shutdown_function([TestCallsBase::class, 'removePbxContext'], $context);
if (!$added) {
    exit(1);
}

// Originate A -> B through the module context; A's phone rings, A answers it with *8A. The pickup
// channel has its own linkedid, so ORIGINATE_SRC_CHANNEL must reach the originate leg explicitly,
// otherwise the module context hangs up right after the answer and B is never called.
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
    [TestCallsBase::ACTION_GENERAL_ORIGINATE, 'aNum', 'bNum', $context],
    [TestCallsBase::ACTION_WAIT, 3],
    [TestCallsBase::ACTION_ORIGINATE, 'aNum', '8'],
];
TestCallsBase::executeTest($sampleCDR, $rules);
