<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules;

use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class PbxExtensionStateTest extends AbstractUnitTest
{

    public function testDisableModule()
    {
        $state = new PbxExtensionState('ModuleBitrix24Integration');
        $result = $state->disableModule();
        $this->assertTrue($result);
    }

    public function test__construct()
    {
    }

    public function testEnableModule()
    {
        $state = new PbxExtensionState('ModuleBitrix24Integration');
        $result = $state->enableModule();
        $this->assertTrue($result);

    }

    public function testGetMessages()
    {
    }
}

