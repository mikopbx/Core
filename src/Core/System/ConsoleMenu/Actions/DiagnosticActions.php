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
     */
    public function runFileManager(): void
    {
        $mcPath = Util::which('mc');
        if ($mcPath) {
            $this->runNcursesApp($mcPath);
        }
    }

    /**
     * Run sngrep for SIP packet capture
     */
    public function runSngrep(): void
    {
        $sngrepPath = Util::which('sngrep');
        if ($sngrepPath) {
            $this->runNcursesApp($sngrepPath);
        }
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
     */
    public function runMtr(string $host): void
    {
        $mtrPath = Util::which('mtr');
        if ($mtrPath) {
            $this->runNcursesApp($mtrPath . ' ' . escapeshellarg($host));
        }
    }

    /**
     * Run ncurses application via wrapper script
     *
     * Creates a temporary shell script that properly initializes terminal
     * before running the application. This is necessary because PHP passthru()
     * doesn't properly pass terminal control for commands like 'reset'.
     *
     * @param string $command Command to run
     */
    private function runNcursesApp(string $command): void
    {
        $term = $this->getOptimalTerm();
        $tty = exec('tty 2>/dev/null') ?: '/dev/console';
        $wrapper = "/tmp/ncurses_" . getmypid() . ".sh";

        // Create wrapper script that explicitly reopens the terminal
        // This ensures proper terminal control after CliMenu closes
        $script = "#!/bin/sh\n";
        $script .= "exec <$tty >$tty 2>&1\n";
        $script .= "export TERM=$term\n";
        $script .= "reset\n";
        $script .= "exec $command\n";

        file_put_contents($wrapper, $script);
        chmod($wrapper, 0755);
        passthru($wrapper);

        // Cleanup and clear screen
        @unlink($wrapper);
        echo "\033[2J\033[H";
    }

    /**
     * Determine optimal TERM value based on console type
     *
     * Serial consoles (ttyS*, ttyAMA*) use TERM=linux for proper VGA charset
     * PTY/SSH sessions use TERM=xterm-256color for full color and Unicode support
     * System console (/dev/console) preserves current TERM from environment
     *
     * @return string Terminal type
     */
    private function getOptimalTerm(): string
    {
        $tty = @exec('tty 2>/dev/null');

        // Serial console (ttyS0, ttyS1, ttyAMA0 for ARM) or virtual console (tty1, tty2, etc.)
        if (preg_match('#/dev/tty(S|AMA)?\d+#', $tty)) {
            return 'linux';
        }

        // System console or unknown - preserve current TERM from environment
        if ($tty === '/dev/console' || empty($tty) || $tty === 'not a tty') {
            $currentTerm = getenv('TERM');
            return $currentTerm ?: 'linux';
        }

        // PTY (SSH, telnet) - use xterm-256color as recommended for sngrep
        return 'xterm-256color';
    }
}
