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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Class SendMetricsAction
 * Sends PBX metrics to the license server.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class SendMetricsAction extends \Phalcon\Di\Injectable
{
    /**
     * Sends PBX metrics to the license server.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $di = Di::getDefault();

        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = 'PBXCoreREST:LicenseManagementProcessor:sendMetricsAction';

        // Retrieve the last sent metrics timestamp from the cache
        $lastSend = $managedCache->get($cacheKey);
        if ($lastSend === null) {

            // License Key
            $licenseKey = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
            if (empty($licenseKey)){
                return $res;
            }

            // Store the current timestamp in the cache to track the last repository check
            $managedCache->set($cacheKey, time(), 86400); // Not often than once a day

            $dataMetrics = [];

            // PBXVersion
            $dataMetrics['PBXname'] = 'MikoPBX@' . PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);

            // SIP Extensions count
            $extensions = Extensions::find('type="' . Extensions::TYPE_SIP . '"');
            $dataMetrics['CountSipExtensions'] = $extensions->count();

            // Interface language
            $dataMetrics['WebAdminLanguage'] = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LANGUAGE);

            // PBX language
            $dataMetrics['PBXLanguage'] = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LANGUAGE);

            // Virtual Hardware Type
            $dataMetrics['VirtualHardwareType'] = PbxSettings::getValueByKey(PbxSettingsConstants::VIRTUAL_HARDWARE_TYPE);

            // Hypervisor
            $restAnswer = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/sysinfo/getHypervisorInfo',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET
            ]);
            if ($restAnswer->success){
                $dataMetrics['Hypervisor'] = $restAnswer->data['Hypervisor'];
            }

            // DMI
            $restAnswer = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/sysinfo/getDMIInfo',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET
            ]);
            if ($restAnswer->success){
                $dataMetrics['DMI'] = $restAnswer->data['DMI'];
            }

            $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
            $license->sendLicenseMetrics($licenseKey, $dataMetrics);
        }

        return $res;
    }
}