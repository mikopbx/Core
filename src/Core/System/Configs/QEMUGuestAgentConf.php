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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class QEMUGuestAgentConf
 *
 * Represents the QEMU Guest Agent configuration for KVM/QEMU virtualization platforms.
 *
 * QEMU Guest Agent (qemu-ga) provides communication between the host and guest systems,
 * enabling features like graceful shutdown, time synchronization, and file system freezing
 * for consistent backups in cloud environments (AWS, GCP, DigitalOcean, etc.).
 *
 * @package MikoPBX\Core\System\Configs
 */
class QEMUGuestAgentConf
{
    /**
     * Process name for QEMU Guest Agent
     */
    public const string PROC_NAME = 'qemu-ga';

    /**
     * Command to start the QEMU Guest Agent process
     */
    public string $startCommand = '';

    /**
     * QEMUGuestAgentConf constructor.
     *
     * Initializes the start command for qemu-ga with proper PID file location.
     * If qemu-ga binary is not found in PATH, the start command will be empty.
     */
    public function __construct()
    {
        $binPath = Util::which(self::PROC_NAME);
        if (!empty($binPath)) {
            // Standard qemu-ga startup with daemonization and PID file
            $this->startCommand = "$binPath --daemon --pidfile=/var/run/" . self::PROC_NAME . ".pid";
        }
    }

    /**
     * Start the QEMU Guest Agent service.
     *
     * Executes the qemu-ga daemon in background during system boot.
     * The process will run with default configuration, listening on
     * the virtio-serial channel for host communications.
     *
     * @return bool True if started successfully or start command is available, false if binary not found.
     */
    public function start(): bool
    {
        if (empty($this->startCommand)) {
            // Binary not found, cannot start
            return false;
        }

        if (System::isBooting()) {
            Processes::mwExecBg($this->startCommand);
        }
        return true;
    }

    /**
     * Configure QEMU Guest Agent.
     *
     * QEMU Guest Agent typically doesn't require explicit configuration file.
     * It auto-detects the virtio-serial channel and uses default settings.
     *
     * This method is provided for consistency with the VM tools pattern
     * and can be extended in the future if custom configuration is needed.
     *
     * @return bool Always returns true as no configuration file is required.
     */
    public function configure(): bool
    {
        // QEMU Guest Agent works with default settings in most cases.
        // The virtio-serial channel is auto-detected.
        // No explicit configuration file needed.
        return true;
    }

    /**
     * Generates a Monit configuration block for QEMU Guest Agent monitoring.
     *
     * This method returns a string containing the full Monit configuration
     * for monitoring the qemu-ga process, including:
     * - PID file path
     * - Command to start the process with daemonization
     * - Command to stop the process using BusyBox killall
     * - Execution permissions (as root user/group)
     *
     * @param string $procName The name of the process to use in the Monit configuration (usually 'vm-tools').
     *
     * @return string The generated Monit configuration block as a string, or empty string if binary not found.
     */
    public function getMonitConf(string $procName): string
    {
        if (empty($this->startCommand)) {
            // Binary not found, return empty config
            return '';
        }

        $this->configure();
        $busyboxPath = Util::which('busybox');

        return 'check process ' . $procName . ' with pidfile "/var/run/' . self::PROC_NAME . '.pid"' . PHP_EOL .
            '    start program = "' . $this->startCommand . '"' . PHP_EOL .
            '        as uid root and gid root' . PHP_EOL .
            '    stop program = "' . $busyboxPath . ' killall ' . self::PROC_NAME . '"' . PHP_EOL .
            '        as uid root and gid root';
    }
}
