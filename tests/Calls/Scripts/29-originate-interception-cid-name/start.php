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

// CTI interception, the way the 1C panel does it: the originate carries origCidName (the name of
// the original caller) while the AMI CallerID carries the name of the operator who intercepts.
// The two halves of the interception Local channel see different CALLERID(name), so the CDR leg
// used to attribute the operator's name to the caller, and the stale CONNECTEDLINE name of the
// party being reached to the operator who answered.
// A calls D; C intercepts that call before D picks up. D is used as the ringing party because
// updateDb.php keeps 242 forwarding-free: a no-answer forward would add its own CDR rows.
$sampleCDR = [];
// The intercepted call itself; the interception takes it over, so timing is a range.
$sampleCDR[] = [
    'src_num' => 'aNum',
    'dst_num' => 'dNum',
    'duration' => [0, 30],
    'billsec' => [0, 20],
];
// The interception leg: src_name comes from origCidName (never from the operator's CallerID),
// dst_num is who intercepted, dst_name is not the stale name of the party being reached.
// src_num is the number the intercepted channel carries - here the ringing extension, on a real
// inbound interception it is the customer's number.
// updateDb.php names every test phone 'Абонент <number>', so the expected name of whichever
// peer C turned out to be is predictable.
$peers = TestCallsBase::getIdlePeers();
$sampleCDR[] = [
    'src_num' => 'dNum',
    'src_name' => 'Тестовый Клиент',
    'dst_num' => 'cNum',
    'dst_name' => 'Абонент ' . $peers[2],
    'disposition' => 'ANSWERED',
];

$rules = [
    [TestCallsBase::ACTION_ORIGINATE, 'aNum', 'dNum'],
    [
        TestCallsBase::ACTION_INTERCEPTION_ORIGINATE,
        'cNum',
        'Тестовый Клиент',
        'dNum',
        'Оператор Перехвата',
    ],
];
TestCallsBase::executeTest($sampleCDR, $rules);
