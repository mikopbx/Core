<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Modules\Setup;

use MikoPBX\Modules\Setup\PbxExtensionSetupBase;
use PHPUnit\Framework\TestCase;

class PbxExtensionSetupBaseTest extends TestCase
{

    public function testCreateSettingsTableByModelsAnnotations():void
    {
        $sut = $this->getMockForAbstractClass(PbxExtensionSetupBase::class,['ModuleBitrix24Integration']);
        $result = $sut->createSettingsTableByModelsAnnotations();

        self::assertTrue($result);
    }
}
