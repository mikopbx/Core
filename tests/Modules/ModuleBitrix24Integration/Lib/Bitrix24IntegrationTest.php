<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleBitrix24Integration\Lib;

use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleBitrix24Integration\Lib\Bitrix24Integration;


class Bitrix24IntegrationTest extends AbstractUnitTest
{

    public function testStartAllServices()
    {
        $module = new Bitrix24Integration();
        $module->startAllServices(true);
        $this->assertTrue(true);
    }

    public function test__construct()
    {
    }
}
