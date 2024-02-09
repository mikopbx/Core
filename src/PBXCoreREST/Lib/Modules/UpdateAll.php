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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Util;

/**
 * Class UpdateAll
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class UpdateAll extends \Phalcon\Di\Injectable
{

    /**
     * Update all installed modules
     * @return void
     */
    public static function main(): void
    {
        // Get a list of installed modules
        $parameters=[
            'columns'=>['uniqid']
        ];
        $installedModules = PbxExtensionModules::find($parameters);

        // Calculate total mutex timeout and extra 5 seconds to prevent installing the same module in the second thread
        $installationTimeout = InstallFromRepo::DOWNLOAD_TIMEOUT+InstallFromRepo::INSTALLATION_TIMEOUT+5;
        $mutexTimeout = $installedModules->count()*($installationTimeout);
        // Create a mutex to ensure synchronized access
        $mutex = Util::createMutex('UpdateAll', 'singleThread', $mutexTimeout);

        // Synchronize the update process
        try{
            $mutex->synchronized(
                function () use ($installedModules): void {
                    // Cycle by them and call install from repository
                    foreach ($installedModules as $module) {
                        InstallFromRepo::main($module['uniqid']);
                    }
                });
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }
}