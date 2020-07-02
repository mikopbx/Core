<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleTelegramNotify\Lib;

use Modules\ModuleTelegramNotify\Lib\TelegramNotifyConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class TelegramNotifyConfTest extends AbstractUnitTest
{

    public function testReloadServices()
    {
        $worker = new TelegramNotifyConf();
        $worker->reloadServices(true);
        $worker->reloadServices(false);
        $this->assertTrue(true);
    }

    public function testCheckModuleWorkProperly()
    {
    }
}
