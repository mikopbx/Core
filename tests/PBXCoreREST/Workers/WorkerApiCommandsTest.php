<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\PBXCoreREST\Workers;

use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerApiCommandsTest extends AbstractUnitTest
{

    public function testStart()
    {
        $workerClassname = WorkerApiCommands::class;
        $worker = new $workerClassname();
        $worker->start([]);
    }
}
