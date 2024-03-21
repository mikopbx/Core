<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\Core\System\Upgrade;

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class UpdateSystemConfigTest extends AbstractUnitTest
{

    public function testUpdateConfigs()
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::PBX_VERSION,'2020.2.700');
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
    }
}
