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
use MikoPBX\Core\System\CloudProvisioning\AlibabaCloud;
use MikoPBX\Core\System\CloudProvisioning\AWSCloud;
use MikoPBX\Core\System\CloudProvisioning\AzureCloud;
use MikoPBX\Core\System\CloudProvisioning\CloudProvider;
use MikoPBX\Core\System\CloudProvisioning\DigitalOceanCloud;
use MikoPBX\Core\System\CloudProvisioning\DockerCloud;
use MikoPBX\Core\System\CloudProvisioning\GoogleCloud;
use MikoPBX\Core\System\CloudProvisioning\LxcCloud;
use MikoPBX\Core\System\CloudProvisioning\NoCloud;
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
     * Applies early overrides that MUST run before Redis/Beanstalkd start.
     *
     * Currently handles port settings (REDIS_PORT, BEANSTALK_PORT, GNATS_PORT, GNATS_HTTP_PORT)
     * from Docker ENV variables. These are written to /etc/inc/mikopbx-settings.json
     * which Redis and Beanstalkd read on startup.
     *
     * No ORM/Redis dependency — safe to call before any services start.
     */
    public static function applyEarlyOverrides(): void
    {
        if (System::isDocker()) {
            DockerCloud::applyPortOverrides();
        }
    }

    /**
     * Starts the cloud provisioning process.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * Docker environment variables are applied on EVERY container start (12-factor app pattern),
     * while cloud provisioning (AWS, GCP, etc.) runs only once per instance (cloud-init pattern).
     *
     * @return array{success: bool, cloudId: string, alreadyDone?: bool} Returns array with 'success' boolean and 'cloudId' string (if successful)
     */
    public static function start(): array
    {
        // Step 1: Container overrides are applied on EVERY start
        // This follows 12-factor app pattern where config should be dynamic
        if (System::isDocker()) {
            DockerCloud::applyEnvironmentOverrides();
        } elseif (System::isLxc()) {
            LxcCloud::applyProxmoxOverrides();
        }

        // Step 2: Cloud provisioning runs only ONCE (cloud-init pattern)
        // Use direct SQLite check - no Redis/ORM dependency
        if (CloudProvider::isProvisioningCompleted()) {
            return ['success' => true, 'cloudId' => 'Previously configured', 'alreadyDone' => true];
        }

        // Lists of possible cloud providers.
        // DockerCloud/LxcCloud are first - container-specific provisioning
        // Cloud providers follow for VM deployments
        $providers = [
            DockerCloud::CloudID => new DockerCloud(),
            LxcCloud::CloudID => new LxcCloud(),
            YandexCloud::CloudID => new YandexCloud(),
            VKCloud::CloudID => new VKCloud(),
            GoogleCloud::CloudID => new GoogleCloud(),
            AzureCloud::CloudID => new AzureCloud(),
            AWSCloud::CloudID => new AWSCloud(),
            DigitalOceanCloud::CloudID => new DigitalOceanCloud(),
            AlibabaCloud::CloudID => new AlibabaCloud(),
            VultrCloud::CloudID => new VultrCloud(),
            // NoCloud is last - fallback for on-premise (VMware, Proxmox, KVM)
            NoCloud::CloudID => new NoCloud()
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
     * After provisioning, perform the following actions:
     * Uses direct SQLite queries to avoid Redis/ORM dependency.
     *
     * @param CloudProvider $provider The provider object.
     * @param string $cloudName The name of the cloud.
     * @return void
     */
    public static function afterProvisioning(CloudProvider $provider, string $cloudName): void
    {
        // Use direct SQLite method to mark provisioning complete
        $provider->markProvisioningCompleteDirect($provider->getHardwareTypeName());
    }
}
