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

namespace MikoPBX\Tests\Unit\Core\System\RootFS;

use PHPUnit\Framework\TestCase;

/**
 * Guards the boot scripts against the regressions seen on a VMware cloud VM with
 * two CD drives: the boot ISO on sr1 was never probed, and after the failure the
 * serial console stayed silent for ~35 s with nothing to diagnose from.
 */
final class BootScriptsTest extends TestCase
{
    private const ROOTFS = __DIR__ . '/../../../../../src/Core/System/RootFS';

    private function script(string $relativePath): string
    {
        $content = file_get_contents(self::ROOTFS . $relativePath);
        $this->assertIsString($content);

        return $content;
    }

    public function testMountOffloadProbesEveryCdDriveSeparately(): void
    {
        $script = $this->script('/sbin/mountoffload');

        // Each rom device is probed on its own; a multi-line name passed to
        // blkid once made the whole CD branch fall through to hard disks.
        $this->assertStringContainsString('for rom in $(/bin/lsblk', $script);
        $this->assertStringContainsString('if /sbin/blkid "/dev/${rom}" >/dev/null 2>&1; then', $script);
        $this->assertStringContainsString('cddev="${cddev} ${rom}"', $script);
        $this->assertStringNotContainsString('/sbin/blkid "/dev/${cddev}"', $script);
        $this->assertStringNotContainsString('length=', $script);
        $this->assertStringContainsString('if [ -n "$cddev" ]; then', $script);
        $this->assertStringContainsString('if [ "$isLiveCD" = "1" ]; then', $script);
    }

    public function testPbxRebootEjectsTheDriveOffloadWasMountedFrom(): void
    {
        $script = $this->script('/sbin/pbx_reboot');

        // dev.cdrom.info lists drives in reverse order, so its first name is
        // not the drive holding the installation ISO when sr0 also exists.
        $this->assertStringNotContainsString('sysctl -n dev.cdrom.info', $script);
        $this->assertStringContainsString("awk '\$2 == \"/offload\" {print \$1}' /proc/mounts", $script);
        $this->assertStringContainsString('for dev in $cddev; do', $script);
        $this->assertStringContainsString('/bin/busybox eject "$dev"', $script);
    }

    public function testSerialGettyForcesLocalLineAndSkipsHardwareFlowControl(): void
    {
        $script = $this->script('/init');

        // Without CLOCAL a hypervisor serial port that never asserts DCD looks
        // hung up: getty exits and respawns silently while output still shows.
        $this->assertStringContainsString('exec /sbin/agetty -L -a root -t 60 $devName 115200 vt102', $script);
        $this->assertStringNotContainsString('agetty -a root -h', $script);
        $this->assertSame(2, substr_count($script, 'exec /sbin/agetty -L -a root'));
    }

    public function testInitBoundsSerialCloseWaitAndNeverOpensPortsToProbe(): void
    {
        $script = $this->script('/init');

        // A last close() otherwise waits up to 30 s for output that does not drain (#1412).
        $this->assertSame(2, substr_count($script, '/bin/busybox setserial "$dev" closing_wait 100 2> /dev/null;'));
        // A blocking open() of a port without carrier hangs: ttyAMA is checked through sysfs.
        $this->assertStringContainsString('[ -e "/sys/class/tty/${dev#/dev/}/device" ]', $script);
        $this->assertStringNotContainsString('echo -n "" > "$dev"', $script);
    }

    public function testBootFailureDumpsDiagnosticsAndReleasesSerialGettyAtOnce(): void
    {
        $script = $this->script('/sbin/pbx_boot_init');

        $this->assertStringContainsString('bootFailure() {', $script);
        $this->assertStringContainsString('touch /tmp/boot_failed', $script);
        $this->assertStringContainsString('touch /etc/ssh-tty-autologin', $script);
        $this->assertStringContainsString('bootFailure "Failed to mount offload, halting boot process."', $script);
        $this->assertStringContainsString('bootFailure "Failed to mount conf, halting boot process."', $script);
        $this->assertStringNotContainsString('sleep 15', $script);

        // Only initramfs binaries: /usr points into the missing /offload here.
        $this->assertStringContainsString('/bin/lsblk -o NAME,TYPE,SIZE,FSTYPE,LABEL,UUID', $script);
        $this->assertStringContainsString('/sbin/blkid', $script);
        $this->assertStringContainsString('cat /proc/partitions', $script);
        $this->assertStringContainsString('ls /dev', $script);
        $this->assertStringContainsString('/bin/dmesg | /bin/busybox tail -n 30', $script);
        $this->assertStringNotContainsString('/usr/bin/', $script);

        // pbx-message parses leading dashes as options, so neither the titles
        // nor the dumped lines may start with '-'.
        $this->assertStringContainsString('echo_info "=== $1 ==="', $script);
        $this->assertStringContainsString('echo_info " ${line}"', $script);
    }

    public function testPbxInitGivesConsoleShellWhenBootFailed(): void
    {
        $script = $this->script('/sbin/pbx_init');

        $this->assertStringContainsString('if [ -f /tmp/boot_failed ]; then', $script);
        $this->assertLessThan(
            strpos($script, 'if [ ! -f "$freeOffloadFile" ]; then'),
            strpos($script, 'if [ -f /tmp/boot_failed ]; then')
        );
    }

    public function testPbxMessageColorsCarryRealEscapeByte(): void
    {
        $script = $this->script('/sbin/pbx-message');

        // busybox echo prints "\033" literally, and the serial/syslog strip
        // filter matches the ESC byte, so the codes leaked into both outputs.
        $this->assertStringContainsString("COLOR_RED=\"\$(/bin/busybox printf '\\033[31;1m')\"", $script);
        $this->assertStringNotContainsString('COLOR_RED="\033', $script);
        $this->assertStringNotContainsString('COLOR_RESET="\033', $script);
    }

    public function testPbxMessageSkipsSerialPortAlreadyUsedAsStdout(): void
    {
        $script = $this->script('/sbin/pbx-message');

        // Inside the command substitution /proc/self is the subshell with a
        // pipe on fd 1, so the skip never matched and serial got every line twice.
        $this->assertStringContainsString('readlink "/proc/$$/fd/1"', $script);
        $this->assertStringNotContainsString('readlink /proc/self/fd/1', $script);
    }
}
