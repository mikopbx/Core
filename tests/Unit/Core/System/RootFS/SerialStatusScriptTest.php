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
 * Serial port validation in pbx-env-detect (#1412). The status functions are cut out of
 * the script and run under busybox sh against fixture driver line states and flags, so
 * the classification is checked without a UART. Needs the image's busybox.
 */
final class SerialStatusScriptTest extends TestCase
{
    private const string SBIN = __DIR__ . '/../../../../../src/Core/System/RootFS/sbin';
    private const string BUSYBOX = '/bin/busybox';

    private string $sandbox;

    protected function setUp(): void
    {
        if (!is_executable(self::BUSYBOX)) {
            $this->markTestSkipped('busybox is required (run inside the MikoPBX image)');
        }
        $this->sandbox = sys_get_temp_dir() . '/serial-status-' . getmypid() . '-' . bin2hex(random_bytes(4));
        mkdir($this->sandbox . '/proc', 0700, true);
        mkdir($this->sandbox . '/flags', 0700);
    }

    protected function tearDown(): void
    {
        if (isset($this->sandbox) && is_dir($this->sandbox)) {
            exec('rm -rf ' . escapeshellarg($this->sandbox));
        }
    }

    public function testPortWithAllSignalsIsOkAndTermiosIsNotRead(): void
    {
        $this->fixture('0: uart:16550A port:000003F8 irq:4 tx:1234 rx:5 RTS|CTS|DTR|DSR|CD');

        $this->assertSame(
            '/dev/ttyS0 ok uart=16550A tx=1234 signals=RTS|CTS|DTR|DSR|CD crtscts=- clocal=- reason=-',
            $this->status('/dev/ttyS0', '16550A')
        );
    }

    public function testPortFlaggedByWriterIsDisabledWithItsReason(): void
    {
        $this->fixture('0: uart:16550A port:000003F8 irq:4 tx:7 rx:0 RTS|CTS|DTR|DSR|CD');
        file_put_contents($this->sandbox . '/flags/ttyS0', "reason=write timed out\ntime=1\nby=pbx-message\n");

        $this->assertSame(
            '/dev/ttyS0 disabled uart=16550A tx=7 signals=RTS|CTS|DTR|DSR|CD crtscts=- clocal=- '
            . 'reason=write timed out, until reboot',
            $this->status('/dev/ttyS0', '16550A')
        );
    }

    public function testMissingDriverLineLeavesCountersUnknown(): void
    {
        $this->fixture('1: uart:16550A port:000002F8 irq:3 tx:9 rx:0 RTS|CTS|DTR|DSR|CD');

        // ttyS0 has no line; /dev/null is no tty, so termios stays unknown and nothing blocks it.
        $line = $this->status('/dev/ttyS0', '16550A', '/dev/null');
        $this->assertSame('/dev/ttyS0 ok uart=16550A tx=- signals=- crtscts=- clocal=- reason=-', $line);
    }

    public function testSerialPortsListsOnlyPortsThatAcceptOutput(): void
    {
        $status = implode("\n", [
            '/dev/ttyS0 ok uart=16550A tx=1 signals=- crtscts=- clocal=- reason=-',
            '/dev/ttyS1 blocked uart=16550A tx=1 signals=RTS|DTR crtscts=1 clocal=1 reason=hardware flow control',
            '/dev/ttyS2 disabled uart=16550A tx=1 signals=- crtscts=- clocal=- reason=write timed out, until reboot',
            '/dev/ttyAMA0 ok uart=PL011 tx=- signals=- crtscts=- clocal=- reason=-',
        ]);

        $output = $this->runShell(
            $this->functions('serial_ports')
            . 'serial_status() { cat ' . escapeshellarg($this->writeFile('status', $status)) . '; }' . "\n"
            . 'serial_ports' . "\n"
        );

        $this->assertSame('/dev/ttyS0 /dev/ttyAMA0', $output);
    }

    public function testStatusWorksWithEarlyBootToolsOnly(): void
    {
        // Before /usr is mounted only /bin and /sbin exist: no awk, tr or stat. pbx-message
        // still needs the port list then, e.g. for the boot failure diagnostics.
        $this->fixture('0: uart:16550A port:000003F8 irq:4 tx:1234 rx:5 RTS|CTS|DTR|DSR|CD');
        $status = '/dev/ttyS0 ok uart=16550A tx=1 signals=- crtscts=- clocal=- reason=-' . "\n"
            . '/dev/ttyS1 blocked uart=16550A tx=1 signals=RTS|DTR crtscts=1 clocal=1 reason=flow control';
        $bin = $this->sandbox . '/bin';
        mkdir($bin);
        foreach (['sh', 'sed', 'grep', 'cut', 'cat', 'date', 'mkdir'] as $applet) {
            symlink(self::BUSYBOX, "$bin/$applet");
        }

        $output = $this->runShell(
            'PATH=' . escapeshellarg($bin) . "\n"
            . $this->functions('serial_port_status', 'serial_has_signal', 'serial_log_blocked_once', 'serial_ports')
            . 'SERIAL_PROC_DIR=' . escapeshellarg($this->sandbox . '/proc') . "\n"
            . 'SERIAL_DISABLED_DIR=' . escapeshellarg($this->sandbox . '/flags') . "\n"
            . 'serial_port_status /dev/ttyS0 16550A' . "\n"
            . 'serial_status() { cat ' . escapeshellarg($this->writeFile('status', $status)) . '; }' . "\n"
            . 'echo "ports=[$(serial_ports)]"' . "\n"
        );

        $this->assertSame(
            '/dev/ttyS0 ok uart=16550A tx=1234 signals=RTS|CTS|DTR|DSR|CD crtscts=- clocal=- reason=-' . "\n"
            . 'ports=[/dev/ttyS0]',
            $output
        );
    }

    public function testSerialWriteGivesUpOnBlockedPortOnceEvenWhenSigtermIsIgnored(): void
    {
        // A FIFO without a reader blocks open() like a port waiting for carrier.
        $fifo = $this->sandbox . '/ttyS0';
        $this->assertTrue(posix_mkfifo($fifo, 0600));
        $writer = (string)file_get_contents(self::SBIN . '/pbx-message');
        $this->assertSame(1, preg_match('/^serial_write\(\) \{\n.*?^\}\n/ms', $writer, $function));

        $started = microtime(true);
        $output = $this->runShell(
            "trap '' TERM\n"
            . $function[0]
            . 'SERIAL_DISABLED_DIR=' . escapeshellarg($this->sandbox . '/flags') . "\n"
            . 'serial_write ' . escapeshellarg($fifo) . ' first' . "\n"
            . 'serial_write ' . escapeshellarg($fifo) . ' second' . "\n"
            . 'serial_write ' . escapeshellarg($fifo) . ' third' . "\n"
        );
        $elapsed = microtime(true) - $started;

        $this->assertSame('', $output);
        $this->assertGreaterThan(0.9, $elapsed, 'the first write waits for its timeout');
        $this->assertLessThan(2.5, $elapsed, 'later writes skip the flagged port');
        $flag = (string)file_get_contents($this->sandbox . '/flags/ttyS0');
        $this->assertStringContainsString("reason=write timed out\n", $flag);
        $this->assertStringContainsString("by=pbx-message\n", $flag);
    }

    public function testScriptsNeverOpenPortsBlockingOrChangeTermios(): void
    {
        $detect = (string)file_get_contents(self::SBIN . '/pbx-env-detect');
        $check = (string)file_get_contents(self::SBIN . '/pbx-serial-check');

        // termios is only read: changing it waits for the queue to drain (TCSADRAIN).
        $this->assertStringContainsString('/bin/busybox timeout -s KILL 2 stty -F "$dev" -a 2>/dev/null', $detect);
        $this->assertSame(0, preg_match('/stty -F "\$dev" (?!-a)/', $detect));
        $this->assertStringNotContainsString('SERIAL_PORTS=$(detect_serial_ports)', $detect);
        // The only write of the diagnostics is the bounded probe.
        $this->assertStringContainsString(
            '/bin/busybox timeout -s KILL 1 /bin/sh -c \'printf "\0" >> "$1"\' _ "$dev" 2>/dev/null',
            $check
        );
        $this->assertSame(1, preg_match_all('/>>\s*"\$/', $check));
    }

    private function fixture(string $line): void
    {
        file_put_contents($this->sandbox . '/proc/serial', "serinfo:1.0 driver revision:\n$line\n");
    }

    /**
     * Runs serial_port_status for a port; $termiosDevice is the device stty reads.
     */
    private function status(string $device, string $uart, ?string $termiosDevice = null): string
    {
        $script = $this->functions('serial_port_status', 'serial_has_signal', 'serial_log_blocked_once');
        if ($termiosDevice !== null) {
            // Point stty at a stand-in while keeping the device name used for the lookups.
            $script = str_replace('stty -F "$dev" -a', 'stty -F ' . escapeshellarg($termiosDevice) . ' -a', $script);
        }
        return $this->runShell(
            $script
            . 'SERIAL_PROC_DIR=' . escapeshellarg($this->sandbox . '/proc') . "\n"
            . 'SERIAL_DISABLED_DIR=' . escapeshellarg($this->sandbox . '/flags') . "\n"
            . 'serial_port_status ' . escapeshellarg($device) . ' ' . escapeshellarg($uart) . "\n"
        );
    }

    /**
     * Cuts the named shell functions out of pbx-env-detect.
     */
    private function functions(string ...$names): string
    {
        $script = (string)file_get_contents(self::SBIN . '/pbx-env-detect');
        $code = '';
        foreach ($names as $name) {
            $this->assertSame(1, preg_match('/^' . $name . '\(\) \{\n.*?^\}\n/ms', $script, $match), $name);
            $code .= $match[0];
        }
        return $code;
    }

    private function writeFile(string $name, string $content): string
    {
        $path = $this->sandbox . '/' . $name;
        file_put_contents($path, $content . "\n");
        return $path;
    }

    private function runShell(string $script): string
    {
        $path = $this->writeFile('run.sh', $script);
        // Own process group, killed as a whole at the deadline: a writer that blocks must
        // fail the test, and its blocked children must not keep the output pipe open.
        $process = proc_open(
            [self::BUSYBOX, 'setsid', self::BUSYBOX, 'sh', $path],
            [1 => ['pipe', 'w'], 2 => ['redirect', 1]],
            $pipes
        );
        $this->assertIsResource($process);
        $pid = proc_get_status($process)['pid'];
        $deadline = microtime(true) + 10;
        while (proc_get_status($process)['running'] && microtime(true) < $deadline) {
            usleep(20000);
        }
        $status = proc_get_status($process);
        if ($status['running']) {
            posix_kill(-$pid, SIGKILL);
            proc_close($process);
            $this->fail('the shell script blocked for 10 s');
        }
        $output = (string)stream_get_contents($pipes[1]);
        proc_close($process);
        $this->assertSame(0, $status['exitcode'], $output);
        return trim($output);
    }
}
