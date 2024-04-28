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

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class DateTimeTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{

    public function testSetDate()
    {
    }

    public function testTimezoneConfigure()
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $timezone      = $mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::PBX_TIMEZONE);
        PHPConf::phpTimeZoneConfigure();
        $etcPhpIniPath = '/etc/php.ini';
        $contents = file_get_contents($etcPhpIniPath);
        $this->assertStringContainsStringIgnoringCase($timezone, $contents);
    }
}
