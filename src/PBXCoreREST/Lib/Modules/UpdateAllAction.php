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
class UpdateAllAction extends \Phalcon\Di\Injectable
{

    /**
     * Update all installed modules
     * @param string $asyncChannelId Pub/sub nchan channel id to send response to frontend
     * @param array $modulesForUpdate The list of module unique ID for update.
     * @return void
     */
    public static function main(string $asyncChannelId, array $modulesForUpdate): void
    {
        // Get a list of installed modules
        $parameters=[
            'columns'=>[
                'uniqid'
            ],
            'conditions'=>'uniqid IN ({uniqid:array})',
            'bind'=>
                [
                    'uniqid'=>$modulesForUpdate
                ]
        ];
        $installedModules = PbxExtensionModules::find($parameters)->toArray();

        // Calculate total mutex timeout and extra 5 seconds to prevent installing the same module in the second thread
        $installationTimeout = InstallFromRepoAction::DOWNLOAD_TIMEOUT+ ModuleInstallationBase::INSTALLATION_TIMEOUT+5;
        $mutexTimeout = count($installedModules)*($installationTimeout);
        // Create a mutex to ensure synchronized access
        $mutex = Util::createMutex('UpdateAll', 'singleThread', $mutexTimeout);

        // Synchronize the update process
        try{
            $mutex->synchronized(
                function () use ($installedModules, $asyncChannelId): void {
                    // Cycle by them and call install from repository
                    foreach ($installedModules as $module) {
                        $moduleUniqueID = $module['uniqid'];
                        $releaseId = 0;
                        $installer = new InstallFromRepoAction($asyncChannelId, $moduleUniqueID, $releaseId);
                        $installer->start();
                    }
                });
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }
}