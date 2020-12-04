<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class DateTimeTest extends AbstractUnitTste
{

    public function testSetDate()
    {
    }

    public function testTimezoneConfigure()
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $timezone      = $mikoPBXConfig->getGeneralSettings('PBXTimezone');
        PHPConf::phpTimeZoneConfigure();
        $etcPhpIniPath = '/etc/php.ini';
        $contents = file_get_contents($etcPhpIniPath);
        $this->assertStringContainsStringIgnoringCase($timezone, $contents);
    }
}
