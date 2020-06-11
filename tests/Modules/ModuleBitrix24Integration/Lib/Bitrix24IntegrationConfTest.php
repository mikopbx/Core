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
use Modules\ModuleBitrix24Integration\Lib\Bitrix24IntegrationConf;
use PHPUnit\Framework\TestCase;

class Bitrix24IntegrationConfTest extends AbstractUnitTest
{

    public function testReloadServices()
    {
    }

    public function testGetModuleWorkers()
    {
    }

    public function testExtensionGenContexts()
    {
    }

    public function testCheckModuleWorkProperly()
    {
        $conf = new Bitrix24IntegrationConf();
        $result = $conf->checkModuleWorkProperly();
        $this->assertIsArray($result);
        $this->assertTrue($result['result']);
    }

    public function testOnAfterPbxStarted()
    {
    }
}
