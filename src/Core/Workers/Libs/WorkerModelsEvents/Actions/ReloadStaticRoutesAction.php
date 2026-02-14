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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\SystemMessages;

class ReloadStaticRoutesAction implements ReloadActionInterface
{
    /**
     * Reloads static routes when NetworkStaticRoutes model changes.
     *
     * Removes previously applied routes from the kernel and applies
     * current routes from the database.
     *
     * @param array $parameters Array of model change data (unused for routes)
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        SystemMessages::sysLogMsg(__METHOD__, 'Static routes changed, reloading routes', LOG_NOTICE);
        Network::reloadStaticRoutes();
    }
}
