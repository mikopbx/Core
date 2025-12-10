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

use MikoPBX\Core\System\ConsoleMenu\Utilities\LogViewer;

/**
 * Monitoring-related actions for console menu
 *
 * Provides log viewing and system monitoring capabilities.
 * Acts as a facade for LogViewer utility.
 */
class MonitoringActions
{
    private LogViewer $logViewer;

    public function __construct()
    {
        $this->logViewer = new LogViewer();
    }

    /**
     * View system messages log
     *
     * @param bool $realtime Use tail -f (true) or less +G (false)
     * @return bool Success status
     */
    public function viewSystemLog(bool $realtime = false): bool
    {
        return $realtime
            ? $this->logViewer->viewRealtime('system')
            : $this->logViewer->viewFromEnd('system');
    }

    /**
     * View Asterisk log
     *
     * @param bool $realtime Use tail -f (true) or less +G (false)
     * @return bool Success status
     */
    public function viewAsteriskLog(bool $realtime = true): bool
    {
        return $realtime
            ? $this->logViewer->viewRealtime('asterisk')
            : $this->logViewer->viewFromEnd('asterisk');
    }

    /**
     * View PHP error log
     *
     * @param bool $realtime Use tail -f (true) or less +G (false)
     * @return bool Success status
     */
    public function viewPhpLog(bool $realtime = false): bool
    {
        return $realtime
            ? $this->logViewer->viewRealtime('php')
            : $this->logViewer->viewFromEnd('php');
    }

    /**
     * View Nginx error log
     *
     * @param bool $realtime Use tail -f (true) or less +G (false)
     * @return bool Success status
     */
    public function viewNginxLog(bool $realtime = false): bool
    {
        return $realtime
            ? $this->logViewer->viewRealtime('nginx')
            : $this->logViewer->viewFromEnd('nginx');
    }

    /**
     * View Fail2ban log
     *
     * @param bool $realtime Use tail -f (true) or less +G (false)
     * @return bool Success status
     */
    public function viewFail2banLog(bool $realtime = false): bool
    {
        return $realtime
            ? $this->logViewer->viewRealtime('fail2ban')
            : $this->logViewer->viewFromEnd('fail2ban');
    }
}
