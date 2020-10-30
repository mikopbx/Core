<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModulePT1CCore\Setup;

use Modules\ModulePT1CCore\Setup\PbxExtensionSetup;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class PbxExtensionSetupTest extends AbstractUnitTest
{

    public function testInstallDB()
    {
        $setup = new PbxExtensionSetup('ModulePT1CCore');
        self::assertTrue($setup->installDB());
    }
}
