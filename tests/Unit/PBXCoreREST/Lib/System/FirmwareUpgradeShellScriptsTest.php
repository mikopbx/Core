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

    public function testFirmwareUpgradeShrinksMbrPart4BeforeAnyGdiskConversionAttempt(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($script);
        $this->assertStringContainsString('shrink_msdos_part4_for_gpt_backup()', $script);
        $this->assertStringNotContainsString('print free', $script);
        $this->assertStringContainsString('disk_end_sector=$((disk_sectors - 1))', $script);
        $this->assertStringContainsString('tail_free_sectors=$((disk_end_sector - part4_end_sector))', $script);
        $this->assertStringContainsString('if [ "$tail_free_sectors" -ge "$sectors_in_mib" ]; then', $script);
        $this->assertStringContainsString(
            'shrink_msdos_part4_for_gpt_backup "$DISK" "$partitionFour"',
            $script
        );
        $this->assertStringContainsString('if [ "$SINGLE_DISK_STORAGE" = "1" ]; then', $script);
        $this->assertStringContainsString('/sbin/gdisk --version >/dev/null 2>&1', $script);
        $this->assertStringNotContainsString(
            'command -v gdisk',
            $script
        );
        $this->assertStringNotContainsString('\\s*', $script);
        $this->assertStringContainsString('awk -v partition="$partition" -v new_size="$new_size"', $script);
        $this->assertStringContainsString('sub(/size=[[:space:]]*[0-9]+/, "size=" new_size)', $script);
        $this->assertStringContainsString('post_e2fsck_result=$?', $script);
        $this->assertStringContainsString('if [ "$post_e2fsck_result" -gt 1 ]; then', $script);
        $this->assertLessThan(
            strpos($script, '/sbin/gdisk --version >/dev/null 2>&1'),
            strpos($script, 'shrink_msdos_part4_for_gpt_backup "$DISK" "$partitionFour"')
        );
    }

    public function testFirmwareUpgradeStopsAfterStoragePreservationFailure(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($script);
        $this->assertStringContainsString('STORAGE PRESERVATION FAILED (code $part4Result)', $script);
        $this->assertStringContainsString('PS1=\'[recovery]# \' /bin/sh -i', $script);
        $this->assertStringContainsString('exit "$part4Result"', $script);
        $this->assertStringNotContainsString(
            'wait_for_user_input "Storage preservation failed',
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
