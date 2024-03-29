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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\CloudProvisioning\AzureCloud;
use MikoPBX\Core\System\CloudProvisioning\GoogleCloud;
use MikoPBX\Core\System\CloudProvisioning\VKCloud;
use MikoPBX\Core\System\CloudProvisioning\YandexCloud;

/**
 * Class CloudProvisioning
 *
 * Handles the provisioning process for cloud solutions.
 *
 * @package MikoPBX\Core\System
 */
class CloudProvisioning
{
    /**
     * Starts the cloud provisioning process.
     */
    public static function start(): void
    {
        if (PbxSettings::findFirst('key="' . PbxSettingsConstants::CLOUD_PROVISIONING . '"')) {
            // Already processed before.
            return;
        }

        // Lists of possible cloud providers.
        $providers = [
            'Yandex Cloud' => new YandexCloud(),
            'VK Cloud' => new VKCloud(),
            'Google Cloud' => new GoogleCloud(),
            'Azure Cloud' => new AzureCloud(),
        ];

        foreach ($providers as $cloudName => $provider) {
            Util::sysLogMsg(__CLASS__, "Attempting to provision on $cloudName... ");
            if ($provider->provision()) {
                self::afterProvisioning($provider, $cloudName);
                Util::sysLogMsg(__CLASS__, "Provisioning on $cloudName has been successfully completed.");
                // Provisioning succeeded, break out of the loop
                break;
            }
            Util::sysLogMsg(__CLASS__, "Provisioning on $cloudName has not been completed. This may be due to being in a different environment or a non-cloud setting.");
        }
    }

    /**
     * After provisioning, perform the following actions:
     * @param $provider mixed The provider object.
     * @param string $cloudName The name of the cloud.
     * @return void
     */
    public static function afterProvisioning($provider, string $cloudName): void
    {
        // Enable firewall and Fail2Ban
        $provider->updatePbxSettings(PbxSettingsConstants::PBX_FIREWALL_ENABLED, '1');
        $provider->updatePbxSettings(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED, '1');

        // Mark provisioning as completed
        $provider->updatePbxSettings(PbxSettingsConstants::CLOUD_PROVISIONING, '1');
        $provider->updatePbxSettings(PbxSettingsConstants::VIRTUAL_HARDWARE_TYPE, $cloudName);

        // Connect storage
        self::checkConnectStorage();
    }

    /**
     * Checks and connects the storage disk automatically.
     */
    private static function checkConnectStorage(): void
    {
        $phpPath = Util::which('php');
        Processes::mwExecBg($phpPath . ' -f /etc/rc/connect.storage auto', '/var/log/storage-connect.log', 5);
    }
}