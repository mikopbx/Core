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
    protected $state;

    public function testDisableModule():void
    {
        $this->state = new PbxExtensionState('ModuleSmartIVR');
        $result = $this->state->disableModule();
        if ($result===true){
            $this->assertTrue(true);
        } else {
           $this->assertTrue(false, $this->testGetMessages());
        }
    }

    public function testEnableModule():void
    {
        $this->state = new PbxExtensionState('ModuleSmartIVR');
        $result = $this->state->enableModule();
        if ($result===true){
            $this->assertTrue(true);
        } else {
            $this->assertTrue(false, $this->testGetMessages());
        }

    }

    public function testGetMessages():string
    {
        $this->state = new PbxExtensionState('ModuleTelegramNotify');
        return implode(' ', $this->state->getMessages());
    }

}

