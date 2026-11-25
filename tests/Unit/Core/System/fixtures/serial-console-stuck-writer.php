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

// Child of SerialConsoleTest: writes a burst to a FIFO whose reader never reads. Run in a
// separate process so that a write which blocks shows up as a timeout, not a hung suite.
// Args: fifo, flags directory, proc directory. Prints the log lines as JSON.

use MikoPBX\Core\System\SerialConsole;

require __DIR__ . '/../../../../../vendor/autoload.php';

[, $fifo, $flags, $proc] = $argv;
$reader = fopen($fifo, 'rn');
$log = [];
$console = new SerialConsole(
    static fn (): array => [$fifo],
    $flags,
    $proc,
    static fn (): int => 1_000_000,
    static function (int $level, string $message) use (&$log): void {
        $log[] = [$level, $message];
    }
);
for ($i = 0; $i < 64; $i++) {
    $console->write(str_repeat('x', 4096));
}
echo json_encode($log), "\n";
fclose($reader);
