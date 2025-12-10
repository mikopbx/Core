<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\ConsoleMenu\Actions;

use MikoPBX\Core\System\Util;

/**
 * Diagnostic tool actions for console menu
 *
 * Handles launching of:
 * - mc (Midnight Commander file manager)
 * - sngrep (SIP packet capture)
 * - mtr (network diagnostics)
 * - Asterisk commands (channels, endpoints)
 */
class DiagnosticActions
{
    /**
     * Run Midnight Commander file manager
     *
     * @return void
     */
    public function runFileManager(): void
    {
        $mcPath = Util::which('mc');
        if (empty($mcPath)) {
            echo "mc not found\n";
            return;
        }

        // Reset terminal to sane state before running mc (required after CliMenu closes)
        passthru('stty sane 2>/dev/null');

        // Run mc and clear screen when done
        passthru($mcPath);
        echo "\033[2J\033[H";
    }

    /**
     * Run sngrep for SIP packet capture
     *
     * @return void
     */
    public function runSngrep(): void
    {
        $sngrepPath = Util::which('sngrep');
        if (empty($sngrepPath)) {
            echo "sngrep not found\n";
            return;
        }

        // Reset terminal to sane state before running sngrep (required after CliMenu closes)
        passthru('stty sane 2>/dev/null');

        // Run sngrep and clear screen when done
        passthru($sngrepPath);
        echo "\033[2J\033[H";
    }

    /**
     * Show active Asterisk channels with paging
     *
     * @return void
     */
    public function showActiveChannels(): void
    {
        $this->showAsteriskCommand('core show channels verbose');
    }

    /**
     * Show PJSIP endpoints status with paging
     *
     * @return void
     */
    public function showPjsipEndpoints(): void
    {
        $this->showAsteriskCommand('pjsip show endpoints');
    }

    /**
     * Show PJSIP registrations status (provider registrations) with paging
     *
     * @return void
     */
    public function showPjsipRegistrations(): void
    {
        $this->showAsteriskCommand('pjsip show registrations');
    }

    /**
     * Execute Asterisk command and display output in vi for paging
     *
     * @param string $command Asterisk CLI command
     * @return void
     */
    private function showAsteriskCommand(string $command): void
    {
        $asteriskPath = Util::which('asterisk');
        if (empty($asteriskPath)) {
            echo "asterisk not found\n";
            return;
        }

        $viPath = Util::which('vi');
        if (empty($viPath)) {
            // Fallback to direct output if vi not available
            passthru("$asteriskPath -rx " . escapeshellarg($command));
            return;
        }

        // Write output to temp file (BusyBox vi can't read from pipe)
        $tempFile = '/tmp/asterisk_output_' . getmypid() . '.txt';
        exec("$asteriskPath -rx " . escapeshellarg($command) . " > " . escapeshellarg($tempFile) . " 2>&1");

        // Reset terminal state for vi
        passthru('stty sane 2>/dev/null');

        // Open temp file in vi read-only mode
        passthru("$viPath -R " . escapeshellarg($tempFile));

        // Cleanup
        @unlink($tempFile);
    }

    /**
     * Run mtr for network diagnostics
     *
     * @param string $host Target host
     * @return void
     */
    public function runMtr(string $host): void
    {
        $mtrPath = Util::which('mtr');
        if (empty($mtrPath)) {
            echo "mtr not found\n";
            return;
        }

        passthru("$mtrPath " . escapeshellarg($host));

        // Reset terminal to sane state after ncurses application
        passthru('stty sane 2>/dev/null');
        echo "\033[2J\033[H";
    }
}
