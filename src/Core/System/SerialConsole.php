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

namespace MikoPBX\Core\System;

use Closure;
use Throwable;

/**
 * Writes console messages to the serial ports without ever blocking the caller (#1412).
 *
 * A serial port whose output does not drain (hardware flow control with CTS low, XOFF
 * from the peer, an emulated UART without a backend) blocks a plain open()/write()
 * forever, and with it whatever process printed a boot or configuration message.
 * Ports are opened with O_NONBLOCK and kept open for the life of the process: a write
 * either queues the text or is refused at once, and no per-message last close() waits
 * for the queue to drain.
 *
 * A refused write alone is not a dead port: a burst larger than the 4 KiB transmit
 * buffer fills it on a healthy line too. An attempt fails after several refused writes
 * in a row while the port's transmit counter stands still. A failed attempt skips the
 * port for a growing interval; after the last one the port is disabled for the whole
 * system until reboot through a flag file that the shell writers and pbx-env-detect
 * honour as well, and only the process that creates the flag logs a warning.
 *
 * The attempt counter lives in the process, so only long-running processes (workers)
 * reach the flag; a short CLI run costs at most a few refused writes and a debug line.
 * The port list comes from pbx-env-detect, read on the first write and then once per
 * PORTS_TTL; when its own 60 s cache is stale it reads termios under a 2 s timeout per
 * port, so that call is bounded but not instant.
 */
final class SerialConsole
{
    public const string DISABLED_DIR = '/var/run/pbx-serial-disabled';

    private const string PROC_TTY_DRIVER_DIR = '/proc/tty/driver';
    private const string ENV_DETECT = '/sbin/pbx-env-detect';

    /** How long the list of ports is reused before it is read again, seconds. */
    private const int PORTS_TTL = 60;

    /** Refused writes in a row, without transmit progress, that make one failed attempt. */
    private const int REFUSED_WRITES_PER_ATTEMPT = 3;

    /** Seconds a port is skipped after its 1st, 2nd and 3rd failed attempt; the next one disables it. */
    private const array RETRY_DELAYS = [60, 300, 1800];

    private static ?self $default = null;

    /**
     * Every port seen by this process. The entry, with its open handle and counters, stays
     * when the port drops out of the list, so a port that comes and goes neither leaks a
     * descriptor nor starts its attempts from zero. Handles are never closed on purpose:
     * the last close() of a port waits for its unsent output to drain.
     *
     * @var array<string, array{handle: resource|null, listed: bool, refused: int,
     *     txAtRefusal: int|null, attempts: int, skipUntil: int}>
     */
    private array $ports = [];

    /**
     * Ports disabled by this process. True when the flag file exists, so removing it
     * (pbx-serial-check --enable) brings the port back; false when it could not be created.
     *
     * @var array<string, bool>
     */
    private array $disabled = [];

    private ?int $portsLoadedAt = null;

    /** @var Closure(): list<string> */
    private Closure $portsProvider;

    /** @var Closure(): int */
    private Closure $clock;

    /** @var Closure(int, string): void */
    private Closure $logger;

    /**
     * @param (callable(): list<string>)|null $portsProvider Serial devices to write to.
     * @param string $disabledDir Directory of the system-wide "disabled until reboot" flags.
     * @param string $procTtyDriverDir Source of the per-port transmit counters.
     * @param (callable(): int)|null $clock Monotonic time in seconds.
     * @param (callable(int, string): void)|null $logger Receives a syslog level and a message.
     */
    public function __construct(
        ?callable $portsProvider = null,
        private readonly string $disabledDir = self::DISABLED_DIR,
        private readonly string $procTtyDriverDir = self::PROC_TTY_DRIVER_DIR,
        ?callable $clock = null,
        ?callable $logger = null
    ) {
        $this->portsProvider = $portsProvider !== null
            ? Closure::fromCallable($portsProvider)
            : self::detectPorts(...);
        // Monotonic: a wall clock stepped back at boot (NTP) would freeze refreshes and skips.
        $this->clock = $clock !== null
            ? Closure::fromCallable($clock)
            : static fn (): int => intdiv(hrtime(true), 1_000_000_000);
        $this->logger = $logger !== null
            ? Closure::fromCallable($logger)
            : static function (int $level, string $message): void {
                try {
                    SystemMessages::sysLogMsg(self::class, $message, $level);
                } catch (Throwable) {
                    // No logger in this process: losing the line beats failing the caller.
                }
            };
    }

    /**
     * Returns the writer shared by the whole process.
     */
    public static function getDefault(): self
    {
        return self::$default ??= new self();
    }

    /**
     * Writes a message to every serial port that accepts output, never blocking.
     *
     * @param string $message Text to write; ANSI color codes are removed.
     */
    public function write(string $message): void
    {
        $text = preg_replace('/\033\[[0-9;]*m/', '', $message) ?? $message;
        if ($text === '') {
            return;
        }
        $now = ($this->clock)();
        $this->refreshPorts($now);
        foreach ($this->ports as $device => $port) {
            if ($port['listed'] && !isset($this->disabled[$device])) {
                $this->writeToPort($device, $text, $now);
            }
        }
    }

    /**
     * Lists the serial ports the system reports, empty where the process may not use them:
     * containers have no serial console, and only root can open the ports.
     *
     * @return list<string>
     */
    private static function detectPorts(): array
    {
        if (!function_exists('posix_geteuid') || posix_geteuid() !== 0 || System::isContainer()) {
            return [];
        }
        if (!is_executable(self::ENV_DETECT)) {
            return [];
        }
        $output = trim((string)shell_exec(self::ENV_DETECT . ' --serial 2>/dev/null'));
        if ($output === '') {
            return [];
        }
        $ports = [];
        foreach (preg_split('/\s+/', $output) ?: [] as $device) {
            if (str_starts_with($device, '/dev/')) {
                $ports[] = $device;
            }
        }
        return $ports;
    }

    /**
     * Re-reads the port list once per PORTS_TTL: picks up ports that appeared or were
     * re-enabled and drops the ones that another process disabled.
     */
    private function refreshPorts(int $now): void
    {
        if ($this->portsLoadedAt !== null && $now - $this->portsLoadedAt < self::PORTS_TTL) {
            return;
        }
        $this->portsLoadedAt = $now;

        foreach ($this->disabled as $device => $hasFlag) {
            if ($hasFlag && !file_exists($this->flagPath($device))) {
                // Re-enabled by pbx-serial-check --enable: start over, keeping the handle.
                unset($this->disabled[$device]);
                $this->ports[$device]['attempts'] = 0;
                $this->ports[$device]['refused'] = 0;
                $this->ports[$device]['txAtRefusal'] = null;
                $this->ports[$device]['skipUntil'] = 0;
            }
        }

        $listed = [];
        foreach (($this->portsProvider)() as $device) {
            if ($device === '' || isset($this->disabled[$device]) || file_exists($this->flagPath($device))) {
                continue;
            }
            $listed[$device] = true;
        }

        foreach (array_keys($this->ports) as $device) {
            $this->ports[$device]['listed'] = isset($listed[$device]);
        }
        foreach (array_keys($listed) as $device) {
            $this->ports[$device] ??= [
                'handle' => null,
                'listed' => true,
                'refused' => 0,
                'txAtRefusal' => null,
                'attempts' => 0,
                'skipUntil' => 0,
            ];
        }
    }

    /**
     * Writes the text to one port and tracks how the port copes.
     */
    private function writeToPort(string $device, string $text, int $now): void
    {
        if ($this->ports[$device]['skipUntil'] > $now) {
            return;
        }
        $written = $this->writeOnce($device, $text);
        if ($written === null) {
            // Reopened after a hangup (EIO) and still unusable, or it cannot be opened at all.
            $this->failAttempt($device, 'the port cannot be opened or written', $now);
            return;
        }
        if ($written === strlen($text)) {
            $this->ports[$device]['refused'] = 0;
            $this->ports[$device]['txAtRefusal'] = null;
            $this->ports[$device]['attempts'] = 0;
            return;
        }

        // Refused or cut short: the transmit queue is full and the rest of the text is dropped.
        $tx = $this->readTxCounter($device);
        $port = $this->ports[$device];
        if ($port['refused'] > 0 && $tx !== null && $port['txAtRefusal'] !== null && $tx > $port['txAtRefusal']) {
            // The line drains, the queue was only full after a burst.
            $this->ports[$device]['refused'] = 1;
            $this->ports[$device]['txAtRefusal'] = $tx;
            return;
        }
        if ($port['refused'] === 0) {
            $this->ports[$device]['txAtRefusal'] = $tx;
        }
        $this->ports[$device]['refused']++;
        if ($this->ports[$device]['refused'] >= self::REFUSED_WRITES_PER_ATTEMPT) {
            $this->failAttempt($device, 'output does not drain, the transmit queue stays full', $now);
        }
    }

    /**
     * Opens the port if needed and writes the text without blocking.
     *
     * A port that was hung up (its session ended) answers EIO on the old descriptor
     * while a fresh open works, so a failed write reopens the port once.
     *
     * @return int|null Bytes written, or null when the port cannot be opened or written.
     */
    private function writeOnce(string $device, string $text): ?int
    {
        for ($try = 0; $try < 2; $try++) {
            $handle = $this->ports[$device]['handle'];
            if ($handle === null) {
                // 'n' adds O_NONBLOCK: open() does not wait for carrier, write() does not wait for space.
                $handle = @fopen($device, 'an');
                if ($handle === false) {
                    return null;
                }
                $this->ports[$device]['handle'] = $handle;
            }
            $written = @fwrite($handle, $text);
            if ($written !== false) {
                return $written;
            }
            // A failed descriptor has nothing queued that a close could wait for.
            fclose($handle);
            $this->ports[$device]['handle'] = null;
        }
        return null;
    }

    /**
     * Counts a failed attempt: skips the port for the next retry delay or, after the
     * last one, disables it until reboot.
     */
    private function failAttempt(string $device, string $reason, int $now): void
    {
        $this->ports[$device]['refused'] = 0;
        $this->ports[$device]['txAtRefusal'] = null;
        $attempts = ++$this->ports[$device]['attempts'];
        if ($attempts > count(self::RETRY_DELAYS)) {
            $this->disablePort($device, $reason);
            return;
        }
        $delay = self::RETRY_DELAYS[$attempts - 1];
        $this->ports[$device]['skipUntil'] = $now + $delay;
        ($this->logger)(LOG_DEBUG, "Serial console $device skipped for {$delay}s: $reason");
    }

    /**
     * Disables the port for every process until reboot. Only the process that creates
     * the flag logs, so a dead port produces one warning per boot.
     */
    private function disablePort(string $device, string $reason): void
    {
        $flag = $this->flagPath($device);
        if (!is_dir($this->disabledDir)) {
            @mkdir($this->disabledDir, 0755, true);
        }
        $flagHandle = @fopen($flag, 'x');
        if ($flagHandle !== false) {
            fwrite($flagHandle, "reason=$reason\ntime=" . time() . "\nby=php\n");
            fclose($flagHandle);
            ($this->logger)(
                LOG_WARNING,
                "Serial console $device disabled until reboot: $reason. Run pbx-serial-check for details."
            );
        }
        $this->disabled[$device] = file_exists($flag);
    }

    /**
     * Reads how many bytes the UART driver has sent on the port so far.
     *
     * @return int|null Null when the driver does not report the port (or is not readable).
     */
    private function readTxCounter(string $device): ?int
    {
        if (!preg_match('/^(ttyS|ttyAMA)(\d+)$/', basename($device), $matches)) {
            return null;
        }
        $driver = $matches[1] === 'ttyS' ? 'serial' : 'ttyAMA';
        $content = @file_get_contents($this->procTtyDriverDir . '/' . $driver);
        if ($content === false) {
            return null;
        }
        if (!preg_match('/^' . $matches[2] . ':.*\btx:(\d+)/m', $content, $tx)) {
            return null;
        }
        return (int)$tx[1];
    }

    private function flagPath(string $device): string
    {
        return $this->disabledDir . '/' . basename($device);
    }
}
