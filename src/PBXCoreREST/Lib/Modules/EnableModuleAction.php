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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 *  Class EnableModule
 *  Enables extension module.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class EnableModuleAction extends \Phalcon\Di\Injectable
{
    /**
     * Enables extension module.
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID): PBXApiResult
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

        return $res;
    }
}