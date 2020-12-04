<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Network;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class NetworkTest extends AbstractUnitTest
{

    public function testUpdateIfSettings()
    {
        $network = new Network();
        $network->udhcpcConfigureDeconfig();
        $this->assertTrue(true);
    }
}
