<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleTelegramNotify\Lib;

use Modules\ModuleTelegramNotify\Lib\WorkerTelegramMenu;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerTelegramMenuTest extends AbstractUnitTest
{

    public function testStart()
    {
        $worker = new WorkerTelegramMenu();
        $worker->start('start');
        $this->assertTrue(true);
    }
}
