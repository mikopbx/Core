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

namespace MikoPBX\Core\System\ConsoleMenu\Utilities;

use MikoPBX\Core\System\System;

/**
 * Environment detection helper for console menu
 *
 * Provides centralized environment detection for Docker, LiveCD, and Normal modes.
 * Used to determine menu item availability and feature access.
 */
class EnvironmentHelper
{
    private bool $isDocker;
    private bool $isLiveCd;

    public function __construct()
    {
        $this->isDocker = System::isDocker();
        $this->isLiveCd = file_exists('/offload/livecd');
    }

    /**
     * Check if running in Docker container
     *
     * @return bool True if running in Docker
     */
    public function isDocker(): bool
    {
        return $this->isDocker;
    }

    /**
     * Check if running from LiveCD/Recovery mode
     *
     * @return bool True if running from LiveCD
     */
    public function isLiveCd(): bool
    {
        return $this->isLiveCd;
    }

    /**
     * Check if running in normal installed mode
     *
     * @return bool True if running in normal mode (not Docker, not LiveCD)
     */
    public function isNormal(): bool
    {
        return !$this->isDocker && !$this->isLiveCd;
    }

    /**
     * Check if network configuration is available
     *
     * Network configuration is disabled in Docker mode
     *
     * @return bool True if network configuration is available
     */
    public function canConfigureNetwork(): bool
    {
        return !$this->isDocker;
    }

    /**
     * Check if storage configuration is available
     *
     * Storage configuration is only available in normal mode
     *
     * @return bool True if storage configuration is available
     */
    public function canConfigureStorage(): bool
    {
        return $this->isNormal();
    }

    /**
     * Check if firewall configuration is available
     *
     * Firewall configuration is disabled in LiveCD mode
     *
     * @return bool True if firewall configuration is available
     */
    public function canConfigureFirewall(): bool
    {
        return !$this->isLiveCd;
    }

    /**
     * Check if log viewing is available
     *
     * Log viewing is disabled in LiveCD mode (no storage mounted)
     *
     * @return bool True if log viewing is available
     */
    public function canViewLogs(): bool
    {
        return !$this->isLiveCd;
    }

    /**
     * Check if Asterisk diagnostics are available
     *
     * Asterisk diagnostics are disabled in LiveCD mode
     *
     * @return bool True if diagnostics are available
     */
    public function canRunDiagnostics(): bool
    {
        return !$this->isLiveCd;
    }

    /**
     * Check if password reset is available
     *
     * Password reset is disabled in LiveCD mode
     *
     * @return bool True if password reset is available
     */
    public function canResetPassword(): bool
    {
        return !$this->isLiveCd;
    }

    /**
     * Check if installation/recovery options are available
     *
     * Installation is only available in LiveCD mode
     *
     * @return bool True if installation is available
     */
    public function canInstall(): bool
    {
        return $this->isLiveCd;
    }

    /**
     * Check if recovery configuration exists
     *
     * @return bool True if recovery configuration is available
     */
    public function hasRecoveryConfig(): bool
    {
        return file_exists('/conf.recover/conf');
    }

    /**
     * Get current environment name for display
     *
     * @return string Environment name (Docker, LiveCD, or empty for normal)
     */
    public function getEnvironmentName(): string
    {
        if ($this->isDocker) {
            return 'Docker';
        }
        if ($this->isLiveCd) {
            return 'LiveCD';
        }
        return '';
    }

    /**
     * Check if running on a serial console
     *
     * Serial consoles (ttyS*, ttyAMA*) have limited display capabilities.
     * Graphical consoles (pts/*, tty*, console) support fullscreen banners.
     *
     * @return bool True if running on serial console
     */
    public function isSerialConsole(): bool
    {
        $tty = trim(shell_exec('tty 2>/dev/null') ?? '');

        if (empty($tty) || $tty === 'not a tty') {
            // Not attached to terminal, assume graphical
            return false;
        }

        // Serial console patterns: /dev/ttyS0, /dev/ttyAMA0, /dev/ttyUSB0
        if (preg_match('#/dev/tty(S|AMA|USB)\d+#', $tty)) {
            return true;
        }

        return false;
    }

    /**
     * Check if fullscreen banner should be displayed
     *
     * Returns true for graphical consoles (VM console, SSH) where we can
     * display a rich ASCII-art banner with box drawing characters.
     *
     * @return bool True if fullscreen banner is supported
     */
    public function supportsFullscreenBanner(): bool
    {
        return !$this->isSerialConsole();
    }
}
