<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;


/**
 * Class ResetLicenseAction
 * Reset license key.
 *
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider license
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class ResetLicenseAction extends \Phalcon\Di\Injectable
{
    /**
     * Reset license key.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $mikoPBXConfig->resetGeneralSettings(PbxSettingsConstants::PBX_LICENSE);
        $res->success = true;
        $di = Di::getDefault();
        $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
        $license->changeLicenseKey('');
        return $res;
    }
}