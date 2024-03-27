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
use MikoPBX\Core\System\CloudProvisioning\GoogleCloud;
use MikoPBX\Core\System\CloudProvisioning\AzureCloud;
use MikoPBX\Core\System\CloudProvisioning\YandexCloud;
use MikoPBX\Core\System\CloudProvisioning\VKCloud;


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
        if (PbxSettings::findFirst('key="' . PbxSettingsConstants::CLOUD_PROVISIONING. '"')) {
            // Already processed before.
            return;
        }

        // Similar logic to before, but instantiate and use the new classes
        $providers = [
            new YandexCloud(),
            new VKCloud(),
            new GoogleCloud(),
            new AzureCloud(),
        ];

        foreach ($providers as $provider) {
            Util::sysLogMsg(__CLASS__, 'Try '.$provider::CLOUD_NAME.' provisioning... ');
            if ($provider->provision()) {
                self::afterProvisioning($provider);
                Util::sysLogMsg(__CLASS__, $provider::CLOUD_NAME.' provisioning completed.');
                // Provisioning succeeded, break out of the loop
                break;
            }
        }
    }

    /**
     * After provisioning, perform the following actions:
     * @param $provider mixed The provider object.
     * @return void
     */
    public static function afterProvisioning($provider): void
    {
        // Enable firewall and Fail2Ban
        $provider->updatePbxSettings(PbxSettingsConstants::PBX_FIREWALL_ENABLED, '1');
        $provider->updatePbxSettings(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED, '1');

        // Connect storage
        $provider->checkConnectStorage();

        // Mark provisioning as completed
        $provider->updatePbxSettings(PbxSettingsConstants::CLOUD_PROVISIONING, '1');
        $provider->updatePbxSettings(PbxSettingsConstants::VIRTUAL_HARDWARE_TYPE, $provider::CLOUD_NAME);
    }

}