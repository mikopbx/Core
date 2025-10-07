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
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class SystemConfigClass
 *
 * Base class for managing system service configurations monitored by Monit.
 * Provides common methods for restarting services, checking their status,
 * generating configuration files, and validating Monit config syntax.
 */
class SystemConfigClass extends Injectable implements SystemConfigInterface
{
    /**
     * Process name used for identification in Monit and system tools.
     * Should be redefined in child classes.
     */
    public const string PROC_NAME = '';

    /**
     * Priority level used to sort configuration objects when generating configs.
     * Lower values mean higher priority.
     */
    public int $priority = 50;

    /**
     * Path to the Monit executable.
     */
    private string $monitPath = '';

    /**
     * Path to the BusyBox binary, used for system commands like grep, killall, etc.
     */
    public string $busyBoxPath = '';

    /**
     * Start command.
     */
    public string $startCommand = '';

    /**
     * Constructor.
     *
     * Initializes paths to Monit and BusyBox binaries.
     */
    public function __construct()
    {
        $this->monitPath    = Util::which('monit');
        $this->busyBoxPath  = Util::which('busybox');
    }

    /**
     * Returns the method execution priority.
     *
     * @return int The priority value.
     */
    public function getMethodPriority(): int
    {
        return $this->priority;
    }

    /**
     * Restart the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function reStart(): bool
    {
        return true;
    }

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        return true;
    }

    /**
     * Generate Monit configuration for the current service.
     *
     * @return bool True if configuration was generated successfully.
     */
    public function generateMonitConf(): bool
    {
        return true;
    }

    /**
     * Delete Monit configuration file for the current service.
     *
     * @return bool True if deletion was successful.
     */
    public function deleteMonitConf(): bool
    {
        $confPath = $this->getMainMonitConfFile();
        if (file_exists($confPath)) {
            unlink($confPath);
        }
        return true;
    }

    /**
     * Generates the full path to the main Monit configuration file for this service.
     *
     * The configuration filename is prefixed with a zero-padded priority number
     * to ensure correct loading order in Monit.
     *
     * @return string The full path to the Monit configuration file.
     */
    public function getMainMonitConfFile():string
    {
        $priority = str_pad("$this->priority", 3, '0', STR_PAD_LEFT);
        return MonitConf::CONF_DIR_PATH.'/'.$priority.'_'.$this::PROC_NAME.'.cfg';
    }

    /**
     * Saves content to a file and sets secure permissions.
     *
     * @param string $confPath The path to the target file.
     * @param string $conf     The content to write into the file.
     */
    public function saveFileContent(string $confPath, string $conf): void
    {
        if(!file_exists(MonitConf::CONF_DIR_PATH)){
            Util::mwMkdir(MonitConf::CONF_DIR_PATH);
            chmod(MonitConf::CONF_DIR_PATH, 0700);
        }
        file_put_contents($confPath, $conf);
        chmod($confPath, 0700);

    }

    /**
     * Checks whether the process is currently running.
     *
     * @param bool $ignorePending Whether to ignore processes marked as "pending".
     * @return bool True if the process is running, false otherwise.
     */
    public function isRunning(bool $ignorePending = false): bool
    {
        $additionalGrep = '';
        if ($ignorePending) {
            $additionalGrep = "| $this->busyBoxPath grep -v pending";
        }
        $command = "$this->monitPath -B summary " . self::PROC_NAME .
            " | $this->busyBoxPath grep " . $this::PROC_NAME .
            " $additionalGrep | $this->busyBoxPath awk -F ' ' '{print \$2}'";

        $pid = Processes::getPidOfProcess($this::PROC_NAME);
        return 'OK' === trim((string)shell_exec($command)) || !empty($pid);
    }

    /**
     * Restarts the service via Monit.
     *
     * @param bool $waitStart Whether to wait until the service starts again.
     * @return bool True if restart succeeded.
     */
    public function monitRestart(bool $waitStart = true): bool
    {
        shell_exec("$this->monitPath restart " . $this::PROC_NAME);
        if ($waitStart) {
            return $this->monitWaitStart();
        }
        return true;
    }

    /**
     * Stops the service via Monit.
     *
     * @return bool True if stop command was executed successfully.
     */
    public function monitStop(): bool
    {
        shell_exec("$this->monitPath stop " . $this::PROC_NAME);
        return true;
    }

    /**
     * Reload monit configs
     *
     * @return void
     */
    public function monitReload(): void
    {
        shell_exec("$this->monitPath reload");
    }
    /**
     * Reload monit configs
     *
     * @return void
     */
    public function monitValidate(): void
    {
        shell_exec("$this->monitPath validate");
    }

    /**
     * Waits for the service to start within a timeout period.
     *
     * @param int $timeout Maximum number of seconds to wait.
     * @return bool True if the service started within the timeout.
     */
    public function monitWaitStart(int $timeout = 20): bool
    {
        $isRunning = false;
        do {
            if ($this->isRunning(true)) {
                $isRunning = true;
                break;
            }
            $this->monitFailStartAction();
            sleep(1);
            $timeout--;
        } while ($timeout > 0);

        return $isRunning;
    }

    /**
     * Attempts to start the service via Monit when a failure is detected.
     *
     * This method is typically used as a fallback action to manually restart
     * the service using Monit if it fails unexpectedly. The current implementation
     * does not wait for the service to fully start, but the timeout parameter
     * may be used in extended implementations.
     *
     * @return void
     */
    public function monitFailStartAction(): void
    {
        shell_exec("$this->monitPath start " . $this::PROC_NAME);
    }


    /**
     * Validates the Monit configuration syntax.
     *
     * @return bool True if the configuration is valid.
     */
    public function monitConfigIsValid(): bool
    {
        return Processes::mwExec("$this->monitPath -t") === 0;
    }
}