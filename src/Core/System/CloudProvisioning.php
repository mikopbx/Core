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

namespace MikoPBX\Core\System;

use GuzzleHttp\Promise\Utils;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\CloudProvisioning\AlibabaCloud;
use MikoPBX\Core\System\CloudProvisioning\AWSCloud;
use MikoPBX\Core\System\CloudProvisioning\AzureCloud;
use MikoPBX\Core\System\CloudProvisioning\CloudProvider;
use MikoPBX\Core\System\CloudProvisioning\DigitalOceanCloud;
use MikoPBX\Core\System\CloudProvisioning\GoogleCloud;
use MikoPBX\Core\System\CloudProvisioning\VKCloud;
use MikoPBX\Core\System\CloudProvisioning\YandexCloud;
use MikoPBX\Core\System\CloudProvisioning\VultrCloud;

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
     * @return array{success: bool, cloudId: string, alreadyDone?: bool} Returns array with 'success' boolean and 'cloudId' string (if successful)
     */
    public static function start(): array
    {
        if (self::checkItNeedToStartProvisioning() === false) {
            $message = "   |- Provisioning was already completed.";
            SystemMessages::echoToTeletype($message);
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
            return ['success' => true, 'cloudId' => 'Previously configured', 'alreadyDone' => true];
        }

        // Lists of possible cloud providers.
        $providers = [
            YandexCloud::CloudID => new YandexCloud(),
            VKCloud::CloudID => new VKCloud(),
            GoogleCloud::CloudID => new GoogleCloud(),
            AzureCloud::CloudID => new AzureCloud(),
            AWSCloud::CloudID => new AWSCloud(),
            DigitalOceanCloud::CloudID => new DigitalOceanCloud(),
            AlibabaCloud::CloudID => new AlibabaCloud(),
            VultrCloud::CloudID => new VultrCloud()
        ];

        $message = PHP_EOL."   |- Checking cloud providers in parallel...";
        SystemMessages::echoToTeletype($message);

        // Create promises for parallel availability checking
        $promises = [];
        foreach ($providers as $cloudId => $provider) {
            $promises[$cloudId] = $provider->checkAvailability();
        }

        // Wait for all promises to settle
        try {
            $results = Utils::settle($promises)->wait();
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Error during parallel cloud check: " . $e->getMessage());
            $results = [];
        }

        SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_DONE);

        // Find the first available cloud provider
        $provisioningSuccessful = false;
        $successfulCloudId = '';

        foreach ($results as $cloudId => $result) {
            if ($result['state'] === 'fulfilled' && $result['value'] === true) {
                $message = "   |- Attempting to provision on $cloudId";
                SystemMessages::echoToTeletype($message);

                $provider = $providers[$cloudId];
                if ($provider->provision()) {
                    self::afterProvisioning($provider, $cloudId);
                    SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_DONE);
                    $provisioningSuccessful = true;
                    $successfulCloudId = $cloudId;
                    break;
                }
                SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
            }
        }

        return ['success' => $provisioningSuccessful, 'cloudId' => $successfulCloudId];
    }

    /**
     * Checks if provisioning is needed.
     */
    private static function checkItNeedToStartProvisioning(): bool
    {
        if (PbxSettings::findFirst('key="' . PbxSettings::CLOUD_PROVISIONING . '"') === null) {
            return true;    // Need provision
        }
        return false;   // Provisioning is already completed
    }

    /**
     * After provisioning, perform the following actions:
     * @param CloudProvider $provider The provider object.
     * @param string $cloudName The name of the cloud.
     * @return void
     */
    public static function afterProvisioning(CloudProvider $provider, string $cloudName): void
    {
        // Enable firewall and Fail2Ban
        $provider->updatePbxSettings(PbxSettings::PBX_FIREWALL_ENABLED, '1');
        $provider->updatePbxSettings(PbxSettings::PBX_FAIL2BAN_ENABLED, '1');

        // Mark provisioning as completed
        $provider->updatePbxSettings(PbxSettings::CLOUD_PROVISIONING, '1');
        $provider->updatePbxSettings(PbxSettings::VIRTUAL_HARDWARE_TYPE, $cloudName);
    }
}
