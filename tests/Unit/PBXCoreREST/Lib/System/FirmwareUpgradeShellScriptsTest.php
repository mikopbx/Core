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
        // Assertions about pbx_firmware's own code must ignore the embedded
        // initial_storage_part_four heredoc: its parted "print free" usage is
        // legitimate there.
        $withoutEmbedded = preg_replace(
            "/<<'MIKOPBX_PART4_SCRIPT_EOF'\n.*?\nMIKOPBX_PART4_SCRIPT_EOF\n/s",
            '',
            $script
        );
        $this->assertIsString($withoutEmbedded);
        $this->assertStringContainsString('shrink_msdos_part4_for_gpt_backup()', $script);
        $this->assertStringNotContainsString('print free', $withoutEmbedded);
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

    /**
     * GitHub #1417: sgdisk -e leaves the last usable LBA 1 MiB short of the disk end,
     * so the GPT must be grown before part4 is recreated with "100%", and a partition
     * still shorter than the ext4 superblock claims must abort before fsck/mount.
     */
    public function testPreservedPart4IsRecreatedAfterGptGrowAndCheckedAgainstExt4Size(): void
    {
        $part4 = file_get_contents(self::ROOTFS_SBIN . '/initial_storage_part_four');
        $firmware = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($part4);
        $this->assertIsString($firmware);

        $grow = strpos(
            $part4,
            'echo "fix" | /sbin/parted "$dev" print free ---pretend-input-tty >> "$logFile" 2>&1;'
        );
        $mkpart = strpos($part4, '"mkpart primary ext4 ${PART4_START}s 100%"');
        $restore = strpos($part4, 'dd if="$FS_BACKUP_PART4" of="$partitionFour" bs=1M count=1');
        $this->assertIsInt($grow);
        $this->assertIsInt($mkpart);
        $this->assertIsInt($restore);
        $this->assertLessThan($mkpart, $grow);
        $removeImagePart4 = strpos($part4, '/sbin/parted --script "${dev}" rm 4 2>/dev/null;');
        $this->assertIsInt($removeImagePart4);
        $this->assertLessThan($removeImagePart4, $grow);
        $this->assertLessThan($restore, $mkpart);
        $this->assertSame(1, substr_count($part4, 'Preserve: grow partition table to disk size'));

        $mkpartFailed = strpos($part4, 'Preserve mode: could not recreate partition 4 at ${PART4_START}s');
        $sizeCheck = strpos($part4, 'if [ "$partBytes" -lt "$fsBytes" ]; then');
        $mount = strpos($part4, 'mount -t "$type" "${partitionFour}" "$tmp_dir"');
        $this->assertIsInt($mkpartFailed);
        $this->assertIsInt($sizeCheck);
        $this->assertIsInt($mount);
        $this->assertLessThan($sizeCheck, $restore);
        $this->assertLessThan($mkpartFailed, $mkpart);
        $this->assertLessThan($restore, $mkpartFailed);
        $this->assertStringContainsString("case \"\${fsBytes:-x}:\${partBytes:-x}\" in", $part4);
        $this->assertLessThan($mount, $sizeCheck);
        $this->assertStringContainsString('/sbin/dumpe2fs -h "$partitionFour"', $part4);
        $this->assertStringContainsString('exit 11;', $part4);
        $this->assertStringContainsString('exit 12;', $part4);
        $this->assertStringContainsString('    7|8|9|10|11|12)', $firmware);
    }

    public function testFirmwareUpgradeSkipsSystemDiskPart4SetupForSeparateStorageDisk(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');

        $this->assertIsString($script);
        $this->assertStringContainsString('SKIP_SYSTEM_PART4_SETUP=0', $script);
        $this->assertStringContainsString('SKIP_SYSTEM_PART4_SETUP=1', $script);
        $this->assertStringContainsString('if [ "$SKIP_SYSTEM_PART4_SETUP" = "1" ]; then', $script);
        $this->assertStringContainsString('/bin/sh "$part4Script" "$part4Action" "$DISK";', $script);
        $this->assertStringContainsString('else', $script);
        $this->assertStringContainsString('part4Result=0', $script);
        $this->assertStringContainsString('Skip system disk part4 setup: Storage is on a separate disk.', $script);
        $this->assertStringNotContainsString('if [ "$SINGLE_DISK_STORAGE" = "1" ]; then' . PHP_EOL
            . '    /sbin/initial_storage_part_four "$part4Action" "$DISK";', $script);
    }

    /**
     * GitHub #1418: the upgrade payload is unpacked by the OLD system, which
     * extracts only firmware_upgrade.sh, pbx_firmware and version — so
     * /sbin/initial_storage_part_four during an update is the OLD system's
     * copy, and fixes to it would need a second upgrade to apply.
     * pbx_firmware must therefore carry the script itself and prefer that
     * embedded copy.
     */
    public function testPbxFirmwareShipsAndRunsEmbeddedPart4Script(): void
    {
        $firmware = file_get_contents(self::ROOTFS_SBIN . '/pbx_firmware');
        $part4 = file_get_contents(self::ROOTFS_SBIN . '/initial_storage_part_four');

        $this->assertIsString($firmware);
        $this->assertIsString($part4);

        $matched = preg_match(
            "/<<'MIKOPBX_PART4_SCRIPT_EOF'\n(.*?)\nMIKOPBX_PART4_SCRIPT_EOF\n/s",
            $firmware,
            $matches
        );
        $this->assertSame(1, $matched, 'pbx_firmware must embed initial_storage_part_four in a heredoc');
        // Byte-identical to the canonical file (the regex group ends before
        // the terminator, hence the appended newline) so the two copies cannot
        // drift apart.
        $this->assertSame(
            $part4,
            $matches[1] . "\n",
            'The heredoc in pbx_firmware differs from initial_storage_part_four. '
            . 'Edit the script, then re-embed it between the MIKOPBX_PART4_SCRIPT_EOF markers.'
        );
        $this->assertStringStartsWith('#!/bin/sh', $matches[1]);

        // The embedded copy must be preferred, with the old /sbin location
        // kept only as a fallback when writing the payload fails.
        $this->assertStringContainsString('writeEmbeddedPart4Script() {', $firmware);
        $this->assertStringContainsString(
            'if writeEmbeddedPart4Script "$embeddedPart4Script" '
            . '&& [ -s "$embeddedPart4Script" ]; then',
            $firmware
        );
        $this->assertStringContainsString('part4Script=/sbin/initial_storage_part_four', $firmware);
        $this->assertStringContainsString('part4Script="$embeddedPart4Script"', $firmware);
        $fallback = strpos($firmware, 'part4Script=/sbin/initial_storage_part_four');
        $prefer = strpos($firmware, 'part4Script="$embeddedPart4Script"');
        $call = strpos($firmware, '/bin/sh "$part4Script" "$part4Action" "$DISK";');
        $this->assertIsInt($fallback);
        $this->assertIsInt($prefer);
        $this->assertIsInt($call);
        $this->assertLessThan($prefer, $fallback);
        $this->assertLessThan($call, $prefer);
    }

    public function testPbxMessageSuppressesBrokenConsoleAndSerialWriteErrors(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/pbx-message');

        $this->assertIsString($script);
        // Port detection and validation live in pbx-env-detect only (#1412).
        $this->assertStringContainsString('/sbin/pbx-env-detect --serial 2>/dev/null', $script);
        $this->assertStringNotContainsString('setserial', $script);
        $this->assertStringNotContainsString('.pbx_serial_ports', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$DEV"/', $script));
        $this->assertStringContainsString('echo "$msg" 2>/dev/null || true', $script);
        $this->assertStringContainsString('echo -n "$msg" 2>/dev/null || true', $script);
        // Serial writes never block the caller (#1412): bounded by a timeout, a port that
        // timed out is flagged as disabled until reboot and only the flag's creator logs.
        $this->assertStringContainsString(
            '/bin/busybox timeout -s KILL 1 /bin/sh -c \'printf "%s" "$1" >> "$2"\' _ "$text" "$port" 2>/dev/null',
            $script
        );
        $this->assertStringContainsString('[ -e "$flag" ] && return 0', $script);
        $this->assertStringContainsString('if [ "$rc" -eq 137 ]; then', $script);
        $this->assertStringContainsString('( set -C; printf \'reason=%s\\ntime=%s\\nby=%s\\n\'', $script);
        $this->assertStringContainsString('serial_write "$port" "$clean_msg"', $script);
        $this->assertStringNotContainsString('>> "$port"; }', $script);
    }

    public function testShellFunctionsLeaveSerialPortsToPbxMessage(): void
    {
        $script = file_get_contents(self::ROOTFS_SBIN . '/shell_functions.sh');

        $this->assertIsString($script);
        // Only pbx-message writes to serial ports, with a timeout (#1412); the old
        // fallback wrote to them directly and could block forever.
        $this->assertStringContainsString('/sbin/pbx-message -t info "$1"', $script);
        $this->assertStringContainsString('echo "  - $1" 2>/dev/null || true', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$dev"/', $script));
        $this->assertStringNotContainsString('setserial', $script);
        $this->assertStringNotContainsString('/dev/ttyS0', $script);
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
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$DEV"/', $script));
        $this->assertStringNotContainsString('echo -n "" > "$DEV" 2>/dev/null', $script);

        // The write and the drain run under a timeout and a timed-out port is dropped (#1412).
        $this->assertSame(2, substr_count($script, '$SETSERIAL "$DEV" closing_wait 100 >/dev/null 2>&1'));
        $this->assertStringContainsString('SERIAL_TIMEOUT="-s KILL 1"', $script);
        $this->assertStringContainsString('SERIAL_TIMEOUT="-t 1 -s KILL"', $script);
        $this->assertStringContainsString(
            '/bin/busybox timeout $SERIAL_TIMEOUT /bin/sh -c \'printf "%s\\n" "$1" > "$2"\' _ "$1" "$SERIAL_PORT"',
            $script
        );
        $this->assertStringContainsString('flag="/var/run/pbx-serial-disabled/${SERIAL_PORT##*/}"', $script);
        $this->assertStringContainsString('if [ "$rc" -eq 137 ]; then', $script);
        $this->assertSame(2, substr_count($script, 'serial_write_line "$msg"'));
        $this->assertStringNotContainsString('> "$SERIAL_PORT"; }', $script);
        $this->assertStringNotContainsString('stty -F "$SERIAL_PORT" drain', $script);
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
        $this->assertStringContainsString('if [ "$partedResult" -ne 0 ] && [ -n "$partedOutput" ]; then', $firmware);
        $this->assertStringNotContainsString('if [ -n "$partedOutput" ]; then echo "$partedOutput"', $firmware);
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
        $this->assertStringContainsString('echo "$_msg" 2>/dev/null || true', $script);
        $this->assertSame(0, preg_match('/[<>]{1,2}\s*"\$_DEV"/', $script));
        $this->assertStringNotContainsString('echo -n "" > "$_DEV" 2>/dev/null', $script);

        // The write runs under a timeout and a timed-out port is dropped (#1412).
        $this->assertSame(2, substr_count($script, '$_SETSERIAL "$_DEV" closing_wait 100 >/dev/null 2>&1'));
        $this->assertStringContainsString('_SERIAL_TIMEOUT="-s KILL 1"', $script);
        $this->assertStringContainsString(
            '/bin/busybox timeout $_SERIAL_TIMEOUT /bin/sh -c \'printf "%s\\n" "$1" > "$2"\' _ "$_msg" "$_SERIAL"',
            $script
        );
        $this->assertStringContainsString('_flag="/var/run/pbx-serial-disabled/${_SERIAL##*/}"', $script);
        $this->assertStringContainsString('if [ "$_rc" -eq 137 ]; then', $script);
        $this->assertStringNotContainsString('> "$_SERIAL"; }', $script);
    }
}
