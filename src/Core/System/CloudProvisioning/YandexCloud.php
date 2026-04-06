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

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;

class YandexCloud extends CloudProvider
{
    public const string CloudID = 'YandexCloud';

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
        $promise = $this->client->requestAsync('GET', 'http://169.254.169.254/computeMetadata/v1/instance/', [
            'query' => ['recursive' => 'true', 'alt' => 'json'],
            'headers' => ['Metadata-Flavor' => 'Google']
        ]);

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() !== 200) {
                    return false;
                }

                $metadata = json_decode($response->getBody()->getContents(), true) ?? [];

                // Verify that metadata not contains the 'serviceAccounts' with 'gserviceaccount' in any value
                if (empty($metadata['id']) || !$this->notContainsGoogleDomain($metadata)) {
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
     * Performs the Yandex Cloud provisioning.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null || empty($metadata['id'])) {
            // If metadata is null or machine id is unknown, do not proceed with provisioning.
            return false;
        }

        // Extract metadata
        $sshKeys = $metadata['attributes']['ssh-keys'] ?? '';
        $username = $this->extractUserNameFromSshKeys($sshKeys) ?? 'yc-user';
        $hostname = $metadata['name'] ?? '';
        $extIp = $metadata['networkInterfaces'][0]['accessConfigs'][0]['externalIp'] ?? '';
        $vmId = $metadata['id'];

        // Build config from IMDS metadata
        $config = new ProvisioningConfig(
            hostname: $hostname,
            externalIp: $extIp,
            sshKeys: $sshKeys,
            sshLogin: $username,
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
     * Fetches user-data from Yandex Cloud Metadata Service.
     *
     * @return string|null User-data content or null if not available
     */
    protected function fetchUserData(): ?string
    {
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/computeMetadata/v1/instance/attributes/user-data', [
                'headers' => ['Metadata-Flavor' => 'Google'],
                'http_errors' => false
            ]);

            if ($response->getStatusCode() === 200) {
                $userData = $response->getBody()->getContents();
                return !empty($userData) ? $userData : null;
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to fetch user-data: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Retrieves Yandex instance metadata.
     *
     * @return array|null The instance metadata or null if retrieval failed.
     *
     */
    private function retrieveInstanceMetadata(): ?array
    {
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/computeMetadata/v1/instance/', [
                'query' => ['recursive' => 'true', 'alt' => 'json'],
                'headers' => ['Metadata-Flavor' => 'Google']
            ]);

            if ($response->getStatusCode() == 200) {
                $metadata = json_decode($response->getBody()->getContents(), true)??[];
                // Verify that metadata not contains the 'serviceAccounts' with 'gserviceaccount' in any value
                if ($this->notContainsGoogleDomain($metadata)) {
                    return $metadata;
                } else {
                    SystemMessages::sysLogMsg(__CLASS__, "Metadata contain 'gserviceaccount' in service account.");
                }
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to retrieve Yandex Cloud instance metadata: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Extracts the username from user-data script.
     *
     * @param string $sshKeys SSH keys sting.
     * @return string|null Extracted username or null if not found.
     */
    private function extractUserNameFromSshKeys(string $sshKeys): ?string
    {
        $parts = explode(':', $sshKeys);
        $username = $parts[0];
        if (strlen($username) >= 3 && strlen($username) < 25) {
            return $username;
        }
        return null; // Return null if no username found
    }

    /**
     * Checks if the 'serviceAccounts' array contains the word 'gserviceaccount' in any value.
     *
     * @param array $metadata Metadata array from Google Cloud instance.
     * @return bool False if 'gserviceaccount' is found in any service account, true otherwise.
     */
    private function notContainsGoogleDomain(array $metadata): bool
    {
        if (isset($metadata['serviceAccounts'])) {
            foreach ($metadata['serviceAccounts'] as $account) {
                if (str_contains($account['email'], 'gserviceaccount')) {
                    return false;
                }
            }
        }
        return true;
    }
}
