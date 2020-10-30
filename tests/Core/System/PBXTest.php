<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\PBX;
use PHPUnit\Framework\TestCase;

class PBXTest extends TestCase
{

    public function testDialplanReload()
    {
        PBX::dialplanReload();
        $this->assertTrue(true);
    }
}
