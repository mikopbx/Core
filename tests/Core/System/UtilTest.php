<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Util;
use Modules\ModuleBitrix24Integration\Lib\WorkerBitrix24IntegrationAMI;
use Modules\ModuleBitrix24Integration\Lib\WorkerBitrix24IntegrationHTTP;
use PHPUnit\Framework\TestCase;

class UtilTest extends TestCase
{

    public function testMwExec()
    {
        $resultCode = 0;
        $output = [];
        $path_asterisk  = Util::which('asterisk');
        Util::mwExec("{$path_asterisk} -rx 'dialplan reload'", $output,$resultCode);
        $this->assertIsArray($output);
        $this->assertIsInt($resultCode);
        $this->assertStringContainsStringIgnoringCase('Dialplan reloaded.', implode(' ', $output));
    }

    public function testkillByName(): void
    {
        $process = WorkerBitrix24IntegrationAMI::class;
        Util::killByName($process);
        $this->assertTrue(true);
    }
}
