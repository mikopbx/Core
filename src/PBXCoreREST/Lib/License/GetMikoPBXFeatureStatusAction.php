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

/**
 * Class GetMikoPBXFeatureStatusAction
 * Check for free MikoPBX base license.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class GetMikoPBXFeatureStatusAction extends \Phalcon\Di\Injectable
{
    /**
     * Check for free MikoPBX base license.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $licenseKey = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
        $di = Di::getDefault();
        if ((strlen($licenseKey) === 28
            && Text::startsWith($licenseKey, 'MIKO-')
        )) {
            $cacheKey = 'PBXCoreREST:LicenseManagementProcessor:GetMikoPBXFeatureStatusAction:' . $licenseKey;
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $lastMikoPBXFeatureInfo = $managedCache->get($cacheKey);
            if ($lastMikoPBXFeatureInfo === null) {
                $lastMikoPBXFeatureInfo = [];
                $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
                $checkBaseFeature = $license->featureAvailable(33);
                if ($checkBaseFeature['success'] === false) {
                    $lastMikoPBXFeatureInfo['success'] = false;
                    $textError = (string)($checkBaseFeature['error'] ?? '');
                    $lastMikoPBXFeatureInfo['messages']['license'][] = $license->translateLicenseErrorMessage($textError);
                    $cacheTimeout = 120;
                } else {
                    $lastMikoPBXFeatureInfo['success'] = true;
                    $cacheTimeout = 86400;
                }
                $res->success =  $lastMikoPBXFeatureInfo['success'];
                $res->messages = $lastMikoPBXFeatureInfo['messages']??[];
                $managedCache->set($cacheKey, $lastMikoPBXFeatureInfo, $cacheTimeout); // Check not often than every 2 minutes
            } else {
                $res->success = $lastMikoPBXFeatureInfo['success'];
                $res->messages = $lastMikoPBXFeatureInfo['messages']??[];
            }
        } else {
            $res->success = false;
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['license'][] = $translation->_('lic_WrongLicenseKeyOrEmpty');
        }
        return $res;
    }
}