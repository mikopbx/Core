<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 *
 */

namespace MikoPBX\Tests\Core\System\Configs;

use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class IptablesConfTest extends AbstractUnitTest
{

    public function testApplyConfig()
    {
        $firewall = new IptablesConf();
        $firewall->applyConfig();
    }

    public function testUpdateFirewallRules()
    {
        IptablesConf::updateFirewallRules();
        $this->assertTrue(true);
    }
}
