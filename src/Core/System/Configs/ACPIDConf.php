<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use Phalcon\Di\Injectable;

/**
 * Class ACPIDConf
 *
 * Represents the ACPID configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class ACPIDConf extends Injectable
{
    public const PROC_NAME = 'acpid';

    /**
     * Restarts Beanstalk server
     */
    public function reStart(): void
    {
        $conf   = "-c '/etc/acpi/events' -n -f";
        Processes::safeStartDaemon(self::PROC_NAME, $conf);
    }
}