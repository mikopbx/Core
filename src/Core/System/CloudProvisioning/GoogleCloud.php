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

class GoogleCloud extends CloudProvider
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    public const CloudID = 'GoogleCloud';

    /**
     * Performs the Google Cloud provisioning using the Metadata Service.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null || empty($metadata['id'])) {
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Extract SSH keys and primary SSH user
        $sshKeys = $metadata['attributes']['ssh-keys'] ?? '';
        $adminUsername = $this->extractPrimaryUser($sshKeys);

        // Update machine name
        $hostname = $metadata['name'] ?? '';
        $this->updateHostName($hostname);

        // Update LAN settings with the external IP address
        $extIp = $metadata['networkInterfaces'][0]['accessConfigs'][0]['externalIp'] ?? '';
        $this->updateLanSettings($extIp);

        // Update SSH and WEB passwords using some unique identifier from the metadata
        $vmId = $metadata['id'];
        $this->updateSSHCredentials($adminUsername, $vmId);
        $this->updateWebPassword($vmId);

        return true;
    }

    /**
     * Retrieves Google Cloud instance metadata.
     *
     * @return array|null The instance metadata or null if retrieval failed.
     */
    private function retrieveInstanceMetadata(): ?array
    {
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/computeMetadata/v1/instance/', [
                'query' => ['recursive' => 'true'],
                'headers' => ['Metadata-Flavor' => 'Google']
            ]);

            if ($response->getStatusCode() == 200) {
                $metadata = json_decode($response->getBody()->getContents(), true);
                // Verify that metadata contains the 'serviceAccounts' with 'gserviceaccount' in any value
                if ($this->containsGoogleDomain($metadata)) {
                    return $metadata;
                } else {
                    SystemMessages::sysLogMsg(__CLASS__, "Metadata does not contain 'gserviceaccount' in any service account.");
                }
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to retrieve Google Cloud instance metadata: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Extracts the primary username from SSH keys.
     *
     * @param string $sshKeys SSH keys string from metadata.
     * @return string The primary SSH username extracted from SSH keys.
     */
    private function extractPrimaryUser(string $sshKeys): string
    {
        $lines = explode("\n", $sshKeys);
        foreach ($lines as $line) {
            $parts = explode(" ", $line);
            if (count($parts) > 2) {
                // The username usually follows the key, after the email or comment.
                $usernamePart = explode(":", $parts[2]);
                return $usernamePart[0];
            }
        }
        return 'root'; // Fallback username if no valid line was found
    }

    /**
     * Checks if the 'serviceAccounts' array contains the word 'gserviceaccount' in any value.
     *
     * @param array $metadata Metadata array from Google Cloud instance.
     * @return bool True if 'gserviceaccount' is found in any service account, false otherwise.
     */
    private function containsGoogleDomain(array $metadata): bool
    {
        if (isset($metadata['serviceAccounts'])) {
            foreach ($metadata['serviceAccounts'] as $account) {
                if (strpos($account['email'], 'gserviceaccount') !== false) {
                    return true;
                }
            }
        }
        return false;
    }
}