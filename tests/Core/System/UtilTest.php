<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleBitrix24Integration\Lib\WorkerBitrix24IntegrationAMI;

class UtilTest extends AbstractUnitTest
{

    public function testMwExec()
    {
        $resultCode = 0;
        $output = [];
        $path_asterisk  = Util::which('asterisk');
        Processes::mwExec("{$path_asterisk} -rx 'dialplan reload'", $output,$resultCode);
        $this->assertIsArray($output);
        $this->assertIsInt($resultCode);
        $this->assertStringContainsStringIgnoringCase('Dialplan reloaded.', implode(' ', $output));
    }

    public function testkillByName(): void
    {
        $process = WorkerBitrix24IntegrationAMI::class;
        Processes::killByName($process);
        $this->assertTrue(true);
    }

    public function testProcessPHPWorker(): void
    {
        $process = WorkerBitrix24IntegrationAMI::class;
        Processes::processPHPWorker($process);
        $this->assertTrue(true);
    }

    public function testMwMkdir(): void
    {
        $parameters = '/tmp/1 /tmp/2 ';
        Util::mwMkdir($parameters);

        $parameters = '/tmp/1';
        Util::mwMkdir($parameters);
        $this->assertTrue(true);

    }

    public function testGetFilePathByClassName(): void
    {
        $process = WorkerSafeScriptsCore::class;
        $path = Util::getFilePathByClassName($process);

        $this->assertFileExists($path);
    }

}
