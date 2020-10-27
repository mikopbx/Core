<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Tests\Modules;

use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class PbxExtensionUtilsTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{

    public function testDisableOldModules()
    {
        PbxExtensionUtils::disableOldModules();
        $this->assertTrue(true);
    }
}
