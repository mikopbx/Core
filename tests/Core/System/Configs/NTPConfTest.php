<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Tests\Core\System\Configs;

use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class NTPConfTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{

    public function testConfigure()
    {
        NTPConf::configure();
        $this->assertTrue(true);
    }
}
