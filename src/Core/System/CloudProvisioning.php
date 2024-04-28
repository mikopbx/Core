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
use MikoPBX\Core\System\CloudProvisioning\AWSCloud;
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
        if (self::checkItNeedToStartProvisioning() === false) {
            $message = "  |- Provisioning was already completed.";
            SystemMessages::echoToTeletype($message);
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
            return;
        }

        // Lists of possible cloud providers.
        $providers = [
            YandexCloud::CloudID => new YandexCloud(),
            VKCloud::CloudID => new VKCloud(),
            GoogleCloud::CloudID => new GoogleCloud(),
            AzureCloud::CloudID => new AzureCloud(),
            AWSCloud::CloudID => new AWSCloud(),
        ];

        foreach ($providers as $cloudId => $provider) {
            $message = "   |- Attempting to provision on $cloudId";
            SystemMessages::echoToTeletype($message);
            if ($provider->provision()) {
                self::afterProvisioning($provider, $cloudId);
                $message = " - Cloud provisioning on $cloudId...";
                SystemMessages::echoToTeletype($message);
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_DONE);
                // Provisioning succeeded, break out of the loop
                break;
            }
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
        }
    }

    /**
     * Checks if provisioning is needed.
     */
    private static function checkItNeedToStartProvisioning(): bool
    {
        if (PbxSettings::findFirst('key="' . PbxSettingsConstants::CLOUD_PROVISIONING . '"') === null) {
            return true;    // Need provision
        }
        return false;   // Provisioning is already completed
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

    }
}