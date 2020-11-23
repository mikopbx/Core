<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Tests\Core\System\Upgrade;

use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class UpdateSystemConfigTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{

    public function testUpdateConfigs()
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $mikoPBXConfig->setGeneralSettings('PBXVersion','2020.2.700');
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
    }
}
