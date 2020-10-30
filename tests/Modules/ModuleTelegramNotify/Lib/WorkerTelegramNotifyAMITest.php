<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleTelegramNotify\Lib;

use Modules\ModuleTelegramNotify\Lib\WorkerTelegramNotifyAMI;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerTelegramNotifyAMITest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerTelegramNotifyAMI();
        $worker->start('start');
        $this->assertTrue(true);
    }
}
