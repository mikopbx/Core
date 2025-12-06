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

namespace MikoPBX\Core\System\CloudProvisioning;

use MikoPBX\Core\System\SystemMessages;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Promise\PromiseInterface;

class AzureCloud extends CloudProvider
{
    public const string CloudID = 'AzureCloud';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs an asynchronous check to determine if this cloud provider is available.
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    public function checkAvailability(): PromiseInterface
    {
        $promise = $this->client->requestAsync('GET', 'http://169.254.169.254/metadata/instance', [
            'query' => ['api-version' => '2020-09-01', 'format' => 'json'],
            'headers' => ['Metadata' => 'true']
        ]);

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() !== 200) {
                    return false;
                }

                $metadata = json_decode($response->getBody()->getContents(), true);

                // Verify Azure specific metadata
                if (empty($metadata['compute']['vmId']) ||
                    ($metadata['compute']['azEnvironment'] ?? '') !== 'AzurePublicCloud') {
                    return false;
                }

                return true;
            },
            function () {
                return false;
            }
        );
    }

    /**
     * Performs the Azure Cloud provisioning using the Metadata Service.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if (
            $metadata === null
            || $metadata['compute']['azEnvironment'] !== 'AzurePublicCloud'
            || empty($metadata['compute']['vmId'])
        ) {
            // If metadata is null or the environment is not AzurePublicCloud, do not proceed with provisioning.
            return false;
        }

        // Extract metadata
        $adminUsername = $metadata['compute']['osProfile']['adminUsername'] ?? 'azureuser';
        $hostname = $metadata['compute']['name'] ?? '';
        $extIp = $metadata['network']['interface'][0]['ipv4']['ipAddress'][0]['publicIpAddress'] ?? '';
        $sshKeys = array_column($metadata['compute']['publicKeys'] ?? [], 'keyData');
        $vmId = $metadata['compute']['vmId'];

        // Build config from IMDS metadata
        $config = new ProvisioningConfig(
            hostname: $hostname,
            externalIp: $extIp,
            sshKeys: implode(PHP_EOL, $sshKeys),
            sshLogin: $adminUsername,
            instanceId: $vmId,
            webPassword: $vmId
        );

        // Fetch and merge user-data if available
        $userData = $this->fetchUserData();
        if ($userData !== null) {
            $userConfig = $this->parseUserData($userData);
            if ($userConfig !== null && !$userConfig->isEmpty()) {
                SystemMessages::sysLogMsg(__CLASS__, "Applying user-data configuration");
                $config = $config->merge($userConfig);
            }
        }

        // Apply configuration using direct SQLite (no Redis/ORM)
        return $this->applyConfigDirect($config);
    }

    /**
     * Fetches user-data from Azure Instance Metadata Service.
     * Azure returns user-data as base64-encoded string.
     *
     * @return string|null User-data content or null if not available
     */
    protected function fetchUserData(): ?string
    {
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/metadata/instance/compute/userData', [
                'query' => ['api-version' => '2021-01-01', 'format' => 'text'],
                'headers' => ['Metadata' => 'true'],
                'http_errors' => false
            ]);

            if ($response->getStatusCode() === 200) {
                $encodedData = $response->getBody()->getContents();
                if (!empty($encodedData)) {
                    // Azure returns base64-encoded user-data
                    $decoded = base64_decode($encodedData, true);
                    return $decoded !== false ? $decoded : null;
                }
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to fetch user-data: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Retrieves Azure instance metadata.
     *
     * @return array|null The instance metadata or null if retrieval failed.
     *
     */
    private function retrieveInstanceMetadata(): ?array
    {
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/metadata/instance', [
                'query' => ['api-version' => '2020-09-01', 'format' => 'json'],
                'headers' => ['Metadata' => 'true']
            ]);

            if ($response->getStatusCode() == 200) {
                return json_decode($response->getBody()->getContents(), true);
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to retrieve Azure instance metadata: " . $e->getMessage());
        }

        return null;
    }
}
