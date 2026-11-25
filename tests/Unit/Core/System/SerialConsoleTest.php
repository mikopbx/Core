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

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\SerialConsole;
use PHPUnit\Framework\TestCase;

/**
 * SerialConsole (#1412) must never block on a port whose output does not drain, must not
 * give up on a port that only had a full queue after a burst, and must disable a dead port
 * for every process with a single warning instead of logging it again and again.
 *
 * A FIFO stands in for the serial device: with a reader that never reads, its buffer fills
 * and a non-blocking write is refused exactly like a tty whose transmit queue is stuck.
 */
final class SerialConsoleTest extends TestCase
{
    private const string FILL_BYTE = 'x';
    private const int CHUNK = 4096;
    private const string STUCK_WRITER = __DIR__ . '/fixtures/serial-console-stuck-writer.php';

    private string $sandbox;
    private string $device;
    private string $flags;
    private string $proc;
    private int $now = 1_000_000;

    /** @var list<array{int, string}> */
    private array $log = [];

    /** @var list<resource> */
    private array $readers = [];

    protected function setUp(): void
    {
        if (!function_exists('posix_mkfifo')) {
            $this->markTestSkipped('ext-posix is required');
        }
        $this->sandbox = sys_get_temp_dir() . '/serial-console-' . getmypid() . '-' . bin2hex(random_bytes(4));
        mkdir($this->sandbox . '/dev', 0700, true);
        mkdir($this->sandbox . '/proc', 0700);
        $this->device = $this->sandbox . '/dev/ttyS0';
        $this->flags = $this->sandbox . '/disabled';
        $this->proc = $this->sandbox . '/proc';
        $this->assertTrue(posix_mkfifo($this->device, 0600));
    }

    protected function tearDown(): void
    {
        foreach ($this->readers as $reader) {
            if (is_resource($reader)) {
                fclose($reader);
            }
        }
        if (isset($this->sandbox) && is_dir($this->sandbox)) {
            exec('rm -rf ' . escapeshellarg($this->sandbox));
        }
    }

    public function testStuckQueueNeverBlocksAndSkipsPortWithoutWarning(): void
    {
        // In a child process: a write that blocks must fail the test, not hang the suite.
        $process = proc_open(
            [PHP_BINARY, self::STUCK_WRITER, $this->device, $this->flags, $this->proc],
            [1 => ['pipe', 'w'], 2 => ['file', '/dev/null', 'w']],
            $pipes
        );
        $this->assertIsResource($process);
        $deadline = microtime(true) + 10;
        while (proc_get_status($process)['running'] && microtime(true) < $deadline) {
            usleep(20000);
        }
        if (proc_get_status($process)['running']) {
            proc_terminate($process, 9);
            proc_close($process);
            $this->fail('writes to a stuck port blocked the writer');
        }
        $log = json_decode((string)stream_get_contents($pipes[1]), true);
        proc_close($process);

        $this->assertIsArray($log);
        $this->assertSame([LOG_DEBUG], array_column($log, 0), 'one failed attempt, logged at debug only');
        $this->assertStringContainsString('skipped for 60s', $log[0][1]);
        $this->assertFileDoesNotExist($this->flags . '/ttyS0');
    }

    public function testPortThatComesAndGoesKeepsItsHandleAndStillGetsDisabled(): void
    {
        $this->openReader($this->device);
        $listed = true;
        $console = new SerialConsole(
            function () use (&$listed): array {
                return $listed ? [$this->device] : [];
            },
            $this->flags,
            $this->proc,
            fn (): int => $this->now,
            function (int $level, string $message): void {
                $this->log[] = [$level, $message];
            }
        );
        $descriptors = count(scandir('/dev/fd'));

        // The port drops out of the list and comes back on every refresh while its queue stays full.
        for ($i = 0; $i < 400; $i++) {
            $listed = !$listed;
            $this->now += 120;
            for ($j = 0; $j < 3; $j++) {
                $console->write(str_repeat(self::FILL_BYTE, self::CHUNK));
            }
        }

        $this->assertLessThanOrEqual($descriptors + 1, count(scandir('/dev/fd')), 'no descriptor leak');
        $this->assertSame([LOG_DEBUG, LOG_DEBUG, LOG_DEBUG, LOG_WARNING], $this->levels());
        $this->assertFileExists($this->flags . '/ttyS0');
    }

    public function testRetriesBackOffThenDisableOnceForEveryProcess(): void
    {
        $this->openReader($this->device);
        $console = $this->console();

        foreach ([60, 300, 1800] as $delay) {
            $this->fillUntilAttemptFails($console);
            $this->now += $delay - 1;
            $console->write('still skipped');
            $this->now += 1;
        }
        $this->fillUntilAttemptFails($console);

        $this->assertSame([LOG_DEBUG, LOG_DEBUG, LOG_DEBUG, LOG_WARNING], $this->levels());
        $this->assertStringContainsString('disabled until reboot', $this->log[3][1]);
        $this->assertStringContainsString("reason=", (string)file_get_contents($this->flags . '/ttyS0'));

        // The disabled port is left alone: no more writes, no more log lines.
        for ($i = 0; $i < 10; $i++) {
            $this->now += 3600;
            $console->write(str_repeat(self::FILL_BYTE, self::CHUNK));
        }
        $this->assertCount(4, $this->log);

        // Another process reads the same flag and never opens the port, nor logs it.
        $other = $this->sandbox . '/other';
        mkdir($other);
        $otherDevice = $other . '/ttyS0';
        $this->assertTrue(posix_mkfifo($otherDevice, 0600));
        $reader = $this->openReader($otherDevice);
        $otherLog = [];
        $second = new SerialConsole(
            fn (): array => [$otherDevice],
            $this->flags,
            $this->proc,
            fn (): int => $this->now,
            function (int $level, string $message) use (&$otherLog): void {
                $otherLog[] = [$level, $message];
            }
        );
        $second->write("hello\n");
        $this->assertSame('', (string)fread($reader, 100));
        $this->assertSame([], $otherLog);
    }

    public function testDrainingLineIsNotCountedAsFailure(): void
    {
        $this->openReader($this->device);
        $console = $this->console();

        // The transmit counter grows between refusals: the queue was only full after a burst.
        for ($tx = 100; $tx < 2000; $tx += 100) {
            $this->setTxCounter($tx);
            $console->write(str_repeat(self::FILL_BYTE, self::CHUNK * 4));
        }
        $this->assertSame([], $this->log);

        // The counter stops: the port does not drain any more.
        for ($i = 0; $i < 3; $i++) {
            $console->write(str_repeat(self::FILL_BYTE, self::CHUNK));
        }
        $this->assertSame([LOG_DEBUG], $this->levels());
    }

    public function testPortWithoutReaderIsSkippedAndRecovers(): void
    {
        $console = $this->console();

        // No reader: a non-blocking open of the FIFO fails at once (ENXIO).
        $started = microtime(true);
        $console->write("lost\n");
        $this->assertLessThan(0.5, microtime(true) - $started);
        $this->assertSame([LOG_DEBUG], $this->levels());

        // After the retry delay the port works again and the attempt counter resets.
        $reader = $this->openReader($this->device);
        $this->now += 60;
        $console->write("back\n");
        $this->assertSame("back\n", fread($reader, 100));
    }

    public function testFailedWriteReopensThePort(): void
    {
        $reader = $this->openReader($this->device);
        $console = $this->console();
        $console->write("first\n");
        $this->assertSame("first\n", fread($reader, 100));

        // The reader goes away: the old descriptor fails (EPIPE) and the reopen finds no reader.
        fclose($reader);
        $console->write("lost\n");
        $this->assertSame([LOG_DEBUG], $this->levels());

        $reader = $this->openReader($this->device);
        $this->now += 60;
        $console->write("again\n");
        $this->assertSame("again\n", fread($reader, 100));
    }

    public function testAnsiColorCodesAreStripped(): void
    {
        $reader = $this->openReader($this->device);
        $this->console()->write("Start \033[32;1mDONE\033[0m \n");

        $this->assertSame("Start DONE \n", fread($reader, 100));
    }

    public function testRemovingTheFlagReEnablesThePort(): void
    {
        $this->openReader($this->device);
        $console = $this->console();
        foreach ([60, 300, 1800] as $delay) {
            $this->fillUntilAttemptFails($console);
            $this->now += $delay;
        }
        $this->fillUntilAttemptFails($console);
        $this->assertFileExists($this->flags . '/ttyS0');

        // pbx-serial-check --enable removes the flag; the next port refresh picks it up.
        unlink($this->flags . '/ttyS0');
        foreach ($this->readers as $stale) {
            fclose($stale);
        }
        $this->readers = [];
        // The parked write handle keeps the old pipe alive: drain what it queued.
        $reader = $this->openReader($this->device);
        while (fread($reader, 65536) !== '') {
            continue;
        }
        $this->now += 60;
        $console->write("enabled\n");

        $this->assertSame("enabled\n", fread($reader, 100));
    }

    private function console(): SerialConsole
    {
        return new SerialConsole(
            fn (): array => [$this->device],
            $this->flags,
            $this->proc,
            fn (): int => $this->now,
            function (int $level, string $message): void {
                $this->log[] = [$level, $message];
            }
        );
    }

    /**
     * Writes until one more failed attempt is logged.
     */
    private function fillUntilAttemptFails(SerialConsole $console): void
    {
        $logged = count($this->log);
        for ($i = 0; $i < 64 && count($this->log) === $logged; $i++) {
            $console->write(str_repeat(self::FILL_BYTE, self::CHUNK));
        }
        $this->assertCount($logged + 1, $this->log, 'the stuck port must fail an attempt');
    }

    /**
     * @return resource
     */
    private function openReader(string $fifo)
    {
        $reader = fopen($fifo, 'rn');
        $this->assertIsResource($reader);
        $this->readers[] = $reader;
        return $reader;
    }

    private function setTxCounter(int $tx): void
    {
        file_put_contents(
            $this->proc . '/serial',
            "serinfo:1.0 driver revision:\n0: uart:16550A port:000003F8 irq:4 tx:$tx rx:0 RTS|DTR\n"
        );
    }

    /**
     * @return list<int>
     */
    private function levels(): array
    {
        return array_map(static fn (array $entry): int => $entry[0], $this->log);
    }
}
