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

use MikoPBX\Core\System\DockerNetworkFilterService;
use MikoPBX\Core\System\System;

/**
 * ReloadDockerNetworkFiltersAction
 * 
 * Updates Docker network filters configurations when NetworkFilters model changes
 */
class ReloadDockerNetworkFiltersAction implements ReloadActionInterface
{
    /**
     * Updates Docker network filters configurations
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Only execute in Docker environments
        if (!System::isDocker()) {
            return;
        }
        
        // Update all configurations (Asterisk ACL and Nginx deny)
        DockerNetworkFilterService::updateAllConfigurations();
    }
}