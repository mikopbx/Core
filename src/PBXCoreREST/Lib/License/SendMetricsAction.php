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
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Core\System\LicenseV2\LicenseV2;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Sysinfo\GetDMIInfoAction;
use MikoPBX\PBXCoreREST\Lib\Sysinfo\GetHypervisorInfoAction;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Class SendMetricsAction
 * Sends PBX metrics to the license server.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class SendMetricsAction extends Injectable
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
        $license = $di->get(MarketPlaceProvider::SERVICE_NAME);
        // LicenseV2 carries the metrics inside its signed request once a day. Follow the service the
        // provider actually registered (it falls back to the legacy class when LicenseV2 can not be
        // built), not the setting alone.
        if ($license instanceof LicenseV2) {
            return $res;
        }
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = 'PBXCoreREST:LicenseManagementProcessor:sendMetricsAction';

        // Retrieve the last sent metrics timestamp from the cache
        $lastSend = $managedCache->get($cacheKey);
        if ($lastSend === null) {
            $licenseKey = PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);
            if (empty($licenseKey)) {
                return $res;
            }
            $managedCache->set($cacheKey, time(), 86400); // Not often than once a day
            $license->sendLicenseMetrics($licenseKey, self::collect());
        }

        return $res;
    }

    /**
     * Daily metrics of this PBX, shared by the legacy send.metrika path and the LicenseV2 request.
     * Root workers call it at boot, before the local REST is up, so the platform facts are read
     * directly instead of through the REST client. Each field is probed on its own: one that fails
     * is left out and logged, the rest still go.
     *
     * @return array<string, mixed>
     */
    public static function collect(): array
    {
        $probes = [
            'PBXname' => static fn(): string => 'MikoPBX@' . PbxSettings::getValueByKey(PbxSettings::PBX_VERSION),
            'CountSipExtensions' => static fn(): int =>
                Extensions::find('type="' . Extensions::TYPE_SIP . '"')->count(),
            'WebAdminLanguage' => static fn(): string => PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE),
            'PBXLanguage' => static fn(): string => PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE),
            'VirtualHardwareType' => static fn(): string =>
                PbxSettings::getValueByKey(PbxSettings::VIRTUAL_HARDWARE_TYPE),
            'Architecture' => static fn(): mixed => System::getArchitecture(),
            'BoardType' => static fn(): mixed => System::getBoardType(),
            'EnvironmentType' => static fn(): mixed => System::getEnvironmentType(),
            'Hypervisor' => static function (): mixed {
                $result = GetHypervisorInfoAction::main();
                return $result->success ? $result->data['Hypervisor'] : null;
            },
            'DMI' => static function (): mixed {
                $result = GetDMIInfoAction::main();
                return $result->success ? $result->data['DMI'] : null;
            },
        ];
        $metrics = [];
        foreach ($probes as $field => $probe) {
            try {
                $value = $probe();
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(__METHOD__, "Metric $field left out: " . $e->getMessage(), LOG_WARNING);
                continue;
            }
            if ($value !== null) {
                $metrics[$field] = $value;
            }
        }
        return $metrics;
    }
}
