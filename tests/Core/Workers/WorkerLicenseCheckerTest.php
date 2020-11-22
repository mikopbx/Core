<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Core\Workers;

use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerLicenseCheckerTest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerLicenseChecker();
        $worker->start(['start']);
        $this->assertTrue(true);
    }
}
