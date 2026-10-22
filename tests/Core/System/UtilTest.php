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

use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleBitrix24Integration\bin\WorkerBitrix24IntegrationAMI;

class UtilTest extends AbstractUnitTest
{

    public function testMwExec()
    {
        $resultCode = 0;
        $output = [];
        $path_asterisk  = Util::which(PBX::PROC_NAME);
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

    /**
     * Issue #1193: a single 'set_var' under [endpoint] must still come back as
     * an array so pjsip.conf rendering treats it as repeatable, not a scalar.
     */
    public function testParseIniSettingsSingleSetVarIsArray(): void
    {
        $result = Util::parseIniSettings("[endpoint]\nset_var=MIKO_CALLERID_NUM=1001");

        $this->assertSame(['set_var' => ['MIKO_CALLERID_NUM=1001']], $result['endpoint']);
    }

    public function testParseIniSettingsMultipleSetVarAreCollected(): void
    {
        $result = Util::parseIniSettings(
            "[endpoint]\nset_var=MIKO_CALLERID_NUM=1001\nset_var=MIKO_TEST_VAR=hello"
        );

        $this->assertSame(
            ['set_var' => ['MIKO_CALLERID_NUM=1001', 'MIKO_TEST_VAR=hello']],
            $result['endpoint']
        );
    }

    /**
     * PJSIP only understands 'set_var'; the legacy chan_sip 'setvar' spelling
     * (no underscore) must be normalized to it, not written through verbatim.
     */
    public function testParseIniSettingsSetvarSpellingIsNormalizedToSetVar(): void
    {
        $result = Util::parseIniSettings("[endpoint]\nsetvar=MIKO_CALLERID_NUM=1001");

        $this->assertArrayNotHasKey('setvar', $result['endpoint']);
        $this->assertSame(['set_var' => ['MIKO_CALLERID_NUM=1001']], $result['endpoint']);
    }

    public function testParseIniSettingsMixedSetVarSpellingsAreMerged(): void
    {
        $result = Util::parseIniSettings(
            "[endpoint]\nset_var=MIKO_CALLERID_NUM=1001\nsetvar=MIKO_TEST_VAR=hello"
        );

        $this->assertSame(
            ['set_var' => ['MIKO_CALLERID_NUM=1001', 'MIKO_TEST_VAR=hello']],
            $result['endpoint']
        );
    }

}
