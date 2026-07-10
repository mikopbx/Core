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
        $this->assertStringContainsString('SETSERIAL="setserial"', $script);
        $this->assertStringContainsString('busybox setserial', $script);
        $this->assertStringContainsString('serialInfo=$($SETSERIAL -g "$DEV" 2>/dev/null)', $script);
        $this->assertStringContainsString('*unknown*) continue ;;', $script);
        $this->assertStringContainsString('[ -e "/sys/class/tty/${DEV#/dev/}/device" ] || continue', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$DEV"/', $script));
        $this->assertStringContainsString('echo "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('echo -n "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ echo "$clean_msg" >> "$port"; } 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ echo -n "$clean_msg" >> "$port"; } 2>/dev/null || true', $script);
    }

    public function testShellFunctionsFallbackDoesNotProbeSerialPortsByWritingToThem(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/shell_functions.sh');

        $this->assertIsString($script);
        $this->assertStringContainsString('SETSERIAL="setserial"', $script);
        $this->assertStringContainsString('busybox setserial', $script);
        $this->assertStringContainsString('serialInfo=$($SETSERIAL -g "$dev" 2>/dev/null)', $script);
        $this->assertStringContainsString('*unknown*) continue ;;', $script);
        $this->assertStringContainsString('[ -e "/sys/class/tty/${dev#/dev/}/device" ] || continue', $script);
        $this->assertStringContainsString('local prefixed_message="  - $message"', $script);
        $this->assertStringContainsString('echo "$prefixed_message" 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ echo "$prefixed_message" >> "$dev"; } 2>/dev/null || true', $script);
        $this->assertStringNotContainsString('echo -n "" > "$dev" 2>/dev/null', $script);
        $this->assertStringNotContainsString('[ -w "$dev" ] &&', $script);
        $this->assertStringNotContainsString('echo "$1" >> "$dev"', $script);
    }

    public function testPbxFirmwareDoesNotProbeSerialPortsByWritingToThem(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($script);
        $this->assertStringContainsString('SETSERIAL="setserial"', $script);
        $this->assertStringContainsString('busybox setserial', $script);
        $this->assertStringContainsString('serialInfo=$($SETSERIAL -g "$DEV" 2>/dev/null)', $script);
        $this->assertStringContainsString('*unknown*) continue ;;', $script);
        $this->assertStringContainsString('[ -e "/sys/class/tty/${DEV#/dev/}/device" ] || continue', $script);
        $this->assertStringContainsString('echo "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ printf "%s\n" "$msg" > "$SERIAL_PORT"; } 2>/dev/null || true', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$DEV"/', $script));
        $this->assertStringNotContainsString('echo -n "" > "$DEV" 2>/dev/null', $script);
        $this->assertStringNotContainsString('printf "%s\n" "$msg" > "$SERIAL_PORT" 2>/dev/null', $script);
    }

    public function testFirmwareUpgradeConsoleOutputIsCompactAndQuiet(): void
    {
        $firmware = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');
        $upgrade = file_get_contents(self::ROOTFS_SBIN . '/firmware_upgrade.sh');
        $part4 = file_get_contents(self::ROOTFS_SBIN . '/initial_storage_part_four');
        $message = file_get_contents(self::ROOTFS_SBIN . '/pbx-message');
        $boot = file_get_contents(self::ROOTFS_SBIN . '/pbx_boot_init');

        $this->assertIsString($firmware);
        $this->assertIsString($upgrade);
        $this->assertIsString($part4);
        $this->assertIsString($message);
        $this->assertIsString($boot);

        $this->assertStringContainsString('PREFIX="  - "', $message);
        $this->assertStringContainsString('local msg="  - $1"', $firmware);
        $this->assertStringContainsString('local _msg="  - $*"', $upgrade);
        $this->assertStringContainsString('{ echo "  - MikoPBX firmware upgrade" > /dev/console; } 2>/dev/null', $upgrade);
        $this->assertStringContainsString('_echo "Starting upgrade to version $versionNumber..."', $upgrade);
        $this->assertStringNotContainsString('_echo " - Starting upgrade', $upgrade);
        $this->assertStringNotContainsString('{ echo "MikoPBX firmware upgrade" > /dev/console; }', $upgrade);

        $this->assertStringContainsString('/sbin/e2fsck -f -y "$partition" > /dev/null 2>&1', $firmware);
        $this->assertStringNotContainsString('/sbin/e2fsck -f -y "$partition";', $firmware);
        $this->assertStringContainsString('detailVerbose=$("$mdadmPath" --detail --scan --verbose 2>/dev/null)', $boot);
        $this->assertStringContainsString('arrList=$("$mdadmPath" --detail --scan 2>/dev/null | /bin/busybox cut -d \' \' -f 2)', $boot);

        $this->assertStringContainsString('Reserve 1 MiB for GPT backup on $partition...', $firmware);
        $this->assertStringContainsString('Skipping GPT conversion: gdisk unavailable.', $firmware);
        $this->assertStringContainsString('Backup part4 superblock: $FS_BACKUP_PART4 ($partitionFour)', $firmware);
        $this->assertStringContainsString('Part4 start saved: ${PART4_START}s (preserve ON)', $firmware);
        $this->assertStringNotContainsString('At the end of the 4th partition', $firmware);
        $this->assertStringNotContainsString('firmware image write will replace the partition table', $firmware);
        $this->assertStringNotContainsString('Single-disk storage: partition 4 start sector captured', $firmware);

        $this->assertStringContainsString('Preserve: create part4 at ${PART4_START}s...', $part4);
        $this->assertStringContainsString('Preserve: grow partition table to disk size', $part4);
        $this->assertStringContainsString('parted result ${resultParted}...', $part4);
        $this->assertStringContainsString('Preserve: Storage UUID verified.', $part4);
        $this->assertStringContainsString('Preserve: ext4 on $partitionFour, skip mkfs.', $part4);
        $this->assertStringContainsString('Check filesystem on ${partitionFour}', $part4);
        $this->assertStringNotContainsString('creating partition 4 at original start', $part4);
        $this->assertStringNotContainsString('Fix the partition table and use all the space (preserve)', $part4);
        $this->assertStringNotContainsString('Storage UUID verified ($actualUuid)', $part4);
        $this->assertStringNotContainsString('existing ext4 detected on $partitionFour', $part4);
        $this->assertStringNotContainsString('check filesystem on ${partitionFour}', $part4);
    }

    public function testRaidShutdownScansSuppressMdadmNoArraysNoise(): void
    {
        $reboot = file_get_contents(self::ROOTFS_SBIN . '/pbx_reboot');
        $shutdown = file_get_contents(self::ROOTFS_SBIN . '/shutdown');

        $this->assertIsString($reboot);
        $this->assertIsString($shutdown);
        $this->assertStringContainsString('"$mdadmPath" --detail --scan 2>/dev/null |', $reboot);
        $this->assertStringContainsString('"$mdadmPath" --detail   --scan 2>/dev/null |', $shutdown);
        $this->assertStringNotContainsString('"$mdadmPath" --detail --scan |', $reboot);
        $this->assertStringNotContainsString('"$mdadmPath" --detail   --scan |', $shutdown);
    }

    public function testFirmwareUpgradeDoesNotProbeSerialPortsByWritingToThem(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/firmware_upgrade.sh');

        $this->assertIsString($script);
        $this->assertStringContainsString('_SETSERIAL="setserial"', $script);
        $this->assertStringContainsString('busybox setserial', $script);
        $this->assertStringContainsString('_serialInfo=$($_SETSERIAL -g "$_DEV" 2>/dev/null)', $script);
        $this->assertStringContainsString('*unknown*) continue ;;', $script);
        $this->assertStringContainsString('[ -e "/sys/class/tty/${_DEV#/dev/}/device" ] || continue', $script);
        $this->assertStringContainsString('{ echo "  - MikoPBX firmware upgrade" > /dev/console; } 2>/dev/null', $script);
        $this->assertStringContainsString('echo "$@" 2>/dev/null || true', $script);
        $this->assertStringContainsString('{ printf "%s\n" "$*" > "$_SERIAL"; } 2>/dev/null || true', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$_DEV"/', $script));
        $this->assertStringNotContainsString('echo -n "" > "$_DEV" 2>/dev/null', $script);
        $this->assertStringNotContainsString('printf "%s\n" "$*" > "$_SERIAL" 2>/dev/null', $script);
    }
}
