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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;
use Phalcon\Text;
use SimpleXMLElement;

/**
 * Class GetLicenseInfoAction
 * Returns license info from license server by key.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class GetLicenseInfoAction extends \Phalcon\Di\Injectable
{
    /**
     * Returns license info from license server by key.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        // Retrieve the last get license request from the cache
        $licenseKey = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
        if ((strlen($licenseKey) === 28
            && Text::startsWith($licenseKey, 'MIKO-')
        )) {
            $cacheKey = 'PBXCoreREST:LicenseManagementProcessor:getLicenseInfoAction:'.$licenseKey;
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $lastGetLicenseInfo = $managedCache->get($cacheKey);
            if ($lastGetLicenseInfo === null) {
                $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
                $licenseInfo =  $license->getLicenseInfo($licenseKey);
                if ($licenseInfo instanceof SimpleXMLElement) {
                    $res->success = true;
                    $res->data['licenseInfo'] = json_encode($licenseInfo);
                }
                $managedCache->set($cacheKey, $res->data['licenseInfo'], 120); // Check not often than every 2 minutes
            } else {
                $res->data['licenseInfo']=$lastGetLicenseInfo;
                $res->success = true;
            }
        } else {
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('lic_WrongLicenseKeyOrEmpty');
        }
        return $res;
    }
}