<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\Workers\Cron;

use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerSafeScriptsCoreTest extends AbstractUnitTest
{

    public function testRestartAllWorkers()
    {
        WorkerSafeScriptsCore::restartAllWorkers();
        $this->assertTrue(true);
    }
}
