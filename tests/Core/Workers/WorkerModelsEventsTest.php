<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2020
 *
 */

namespace MikoPBX\Tests\Core\Workers;

use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerModelsEventsTest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerModelsEvents();
        $worker->start(['start']);
        $this->assertTrue(true);
    }
}
