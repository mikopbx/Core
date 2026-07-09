<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\System;

use PHPUnit\Framework\TestCase;

final class FirmwareUpgradeShellScriptsTest extends TestCase
{
    private const ROOTFS_SBIN = __DIR__ . '/../../../../../src/Core/System/RootFS/sbin';

    public function testFirmwareUpgradeUsesRuntimeGdiskCheckBeforeMbrToGptConversion(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($script);
        $this->assertStringContainsString(
            'if /sbin/gdisk --version >/dev/null 2>&1 && [ -n "$partitionFour" ]; then',
            $script
        );
        $this->assertStringNotContainsString(
            'if command -v gdisk >/dev/null 2>&1 && [ -n "$partitionFour" ]; then',
            $script
        );
    }

    public function testPbxMessageSuppressesBrokenConsoleAndSerialWriteErrors(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx-message');

        $this->assertIsString($script);
        $this->assertStringContainsString('echo "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('echo -n "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ echo "$clean_msg" >> "$port"; } 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ echo -n "$clean_msg" >> "$port"; } 2>/dev/null || true', $script);
    }
}
