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

use RuntimeException;

/**
 * Runs a shell command while periodically returning control to its caller.
 */
final class HeartbeatProcessRunner
{
    public function __construct(private readonly int $pollIntervalMicroseconds = 500_000)
    {
        if ($this->pollIntervalMicroseconds < 1) {
            throw new RuntimeException('Poll interval must be positive');
        }
    }

    /**
     * @param callable(): void $heartbeat
     */
    public function run(string $command, callable $heartbeat): int
    {
        if (trim($command) === '') {
            throw new RuntimeException('Command must not be empty');
        }

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $pipes = [];
        $process = Processes::openProcess($command, $descriptors, $pipes);
        if (!is_resource($process)) {
            throw new RuntimeException('Unable to start heartbeat-aware process');
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $exitCode = -1;

        try {
            while (true) {
                $heartbeat();
                stream_get_contents($pipes[1]);
                stream_get_contents($pipes[2]);

                $status = proc_get_status($process);
                if (!$status['running']) {
                    $exitCode = (int)$status['exitcode'];
                    break;
                }

                usleep($this->pollIntervalMicroseconds);
            }
        } finally {
            fclose($pipes[1]);
            fclose($pipes[2]);
            $closeCode = proc_close($process);
            if ($exitCode < 0 && $closeCode >= 0) {
                $exitCode = $closeCode;
            }
        }

        return $exitCode;
    }
}
