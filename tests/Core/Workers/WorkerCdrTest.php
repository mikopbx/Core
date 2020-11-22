<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2020
 *
 */

namespace MikoPBX\Tests\Core\Workers;

use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerCdrTest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerCdr();
        $worker->start(['start']);
        $this->assertTrue(true);
    }
}
