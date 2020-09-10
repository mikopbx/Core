<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleSmartIVR\Lib;

use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleSmartIVR\Lib\SmartIVRConf;

class SmartIVRConfTest extends AbstractUnitTest
{

    public function testOnBeforeModuleEnable()
    {
        $module = new SmartIVRConf();
        $res = $module->onBeforeModuleEnable();
        $this->assertTrue($res);
    }

    public function testOnBeforeModuleDisable()
    {
        $module = new SmartIVRConf();
        $res = $module->onBeforeModuleDisable();
        $this->assertTrue($res);
    }
}
