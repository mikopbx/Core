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

/**
 * Interface SystemConfigInterface
 *
 * Defines the required methods for system configuration classes that manage services monitored by Monit.
 * Implementing classes must provide logic for restarting services, generating and deleting Monit configurations,
 * and checking the service status.
 */
interface SystemConfigInterface
{
    /**
     * Process name used for identification in Monit and system tools.
     * Should be redefined in implementing classes.
     */
    public const string PROC_NAME = '';

    /**
     * Restarts the service.
     *
     * @return bool True if the restart was successful, false otherwise.
     */
    public function reStart(): bool;

    /**
     * Generates the Monit configuration file for the service.
     *
     * @return bool True if the configuration was successfully generated, false otherwise.
     */
    public function generateMonitConf(): bool;

    /**
     * Deletes the Monit configuration file for the service.
     *
     * @return bool True if the configuration was successfully deleted, false otherwise.
     */
    public function deleteMonitConf(): bool;

    /**
     * Checks whether the service is currently running.
     *
     * @return bool|null True if the service is running, false if not.
     *                   Null may indicate an unknown state or error.
     */
    public function isRunning(): bool;
}