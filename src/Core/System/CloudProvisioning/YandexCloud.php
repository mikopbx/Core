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
use MikoPBX\Core\System\SystemMessages;

class YandexCloud extends CloudProvider
{
    public const CloudID = 'YandexCloud';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs the Yandex Cloud provisioning.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null || empty($metadata['id'])) {
            // If metadata is null ot machine id is unknown, do not proceed with provisioning.
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        $sshKeys = $metadata['attributes']['ssh-keys']??'';

        // Extract username
        $username = $this->extractUserNameFromSshKeys($sshKeys);

        // Update SSH keys, if available
        $this->updateSSHKeys($sshKeys);

        // Update machine name
        $hostname = $metadata['name'] ?? '';
        $this->updateHostName($hostname);

        // Update LAN settings with the external IP address
        $extIp = $metadata['networkInterfaces'][0]['accessConfigs'][0]['externalIp'] ?? '';
        $this->updateLanSettings($extIp);

        // Update SSH and WEB passwords using some unique identifier from the metadata
        $vmId = $metadata['id'];
        $this->updateSSHCredentials($username ?? 'yc-user', $vmId);
        $this->updateWebPassword($vmId);

        return true;
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
                $metadata = json_decode($response->getBody()->getContents(), true);
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
                if (strpos($account['email'], 'gserviceaccount') !== false) {
                    return false;
                }
            }
        }
        return true;
    }
}