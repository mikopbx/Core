<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleBitrix24Integration\Setup;

use Modules\ModuleBitrix24Integration\Setup\PbxExtensionSetup;
use PHPUnit\Framework\TestCase;

class PbxExtensionSetupTest extends TestCase
{

    public function testInstallDB(): void
    {
        $setup = new PbxExtensionSetup('ModuleBitrix24Integration');
        self::assertTrue($setup->installDB());
    }
}
