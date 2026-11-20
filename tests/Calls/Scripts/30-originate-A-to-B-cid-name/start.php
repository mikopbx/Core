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
 * You should have received a copy of the GNU General Public License along with this license.
 */
use MikoPBX\Tests\Calls\Scripts\TestCallsBase;

require_once __DIR__ . '/../TestCallsBase.php';

// click2call with a display name (test 07 plus CallerID name): the originate rings A, A answers
// and the PBX dials B. The CDR of that leg names the answering phone from its endpoint callerid -
// the originate's own CallerID name reaches the phone, not the CDR. Guards that the interception
// name work does not cost click2call its caller name.
$peers = TestCallsBase::getIdlePeers();
$sampleCDR = [];
$sampleCDR[] = [
    'src_num' => 'aNum',
    'src_name' => 'Абонент ' . $peers[0],
    'dst_num' => 'bNum',
    'dst_name' => 'Абонент ' . $peers[1],
    'disposition' => 'ANSWERED',
    'duration' => [10, 22],
    'billsec' => [6, 14],
    'fileDuration' => [6, 14],
];

$rules = [
    [TestCallsBase::ACTION_GENERAL_ORIGINATE, 'aNum', 'bNum', 'all_peers', 'Тестовый Оператор'],
];
TestCallsBase::executeTest($sampleCDR, $rules);
