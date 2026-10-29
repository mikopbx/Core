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
// offNum is registered as a hung phone for the test (TestCallsBase::startHungPhone): a reachable
// contact that never answers an INVITE, like a phone that lost its network after registering.
// Main A↔B conversation; B's attempt to transfer A to offNum rings into the void until B hangs up
// at its absolute timeout. A is then connected to the still ringing offNum, which never answers,
// so there is no A↔offNum row. The A↔B recording ends at the transfer: Asterisk may drop its last
// ~1.3 s (the transfer prompt), so its length is 4-6 s, see README.
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum',  'duration'=>'14', 'billsec'=>'12', 'fileDuration' => ['4', '6']];
// Attended-transfer attempt to offNum — separate CDR, NO_ANSWER, no recording; ends with B (~6 s).
$sampleCDR[] = ['src_num'=>'bNum', 'dst_num'=>'offNum','duration'=>'6',  'billsec'=>'0',  'fileDuration' => '0'];

TestCallsBase::executeTest($sampleCDR);
