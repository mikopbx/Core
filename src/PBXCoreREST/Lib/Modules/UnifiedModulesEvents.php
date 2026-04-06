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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;

class UnifiedModulesEvents extends Injectable
{
    private string $asyncChannelId;
    private string $moduleUniqueId;

    public function __construct(string $asyncChannelId, string $moduleUniqueId)
    {   
        $this->asyncChannelId = $asyncChannelId;
        $this->moduleUniqueId = $moduleUniqueId;
    }

    /**
     * Pushes messages to browser
     * @param string $stage module event stage name
     * @param array $data pushing data
     * @return void
     */
    public function pushMessageToBrowser(string $stage, array $data): void
    {
        $message = [
            'stage' => $stage,
            'moduleUniqueId' => $this->moduleUniqueId,
            'stageDetails' => $data,
            'pid' => posix_getpid()
        ];

        SystemMessages::sysLogMsg(
            __CLASS__,
            json_encode($message, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            LOG_DEBUG
        );
        $this->di->get(EventBusProvider::SERVICE_NAME)->publish($this->asyncChannelId, $message);
    }
}