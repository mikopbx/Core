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

use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class EnableModule
 *  Enables extension module.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class EnableModuleAction extends Injectable
{
    
    /**
     * Enables extension module.
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID, string $asyncChannelId=''): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        return Di::getDefault()->get(MutexProvider::SERVICE_NAME)
            ->synchronized(
                ModuleInstallationBase::MODULE_MANIPULATION_MUTEX_KEY,
                function () use ($moduleUniqueID, $asyncChannelId) {
                    return self::enableModule($moduleUniqueID, $asyncChannelId);
                },
                10,
                30
            );
    }

    /**
     * Enables extension module.
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function enableModule(string $moduleUniqueID, string $asyncChannelId=''): PBXApiResult
    {    
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->enableModule() === false) {
            $res->success = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data = $moduleStateProcessor->getMessages();
            $res->success = true;
        }
        if (!empty($asyncChannelId)) {
            $unifiedModulesEvents = new UnifiedModulesEvents($asyncChannelId, $moduleUniqueID);
            $unifiedModulesEvents->pushMessageToBrowser('Stage_I_ModuleEnable', $res->getResult());
        }

        return $res;
    }
}
