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
use MikoPBX\Core\System\Util;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class AzureCloud extends CloudProvider
{
    public const CloudID = 'AzureCloud';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs the Azure Cloud provisioning using the Metadata Service.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null
            || $metadata['compute']['azEnvironment'] !== 'AzurePublicCloud'
            || empty($metadata['compute']['vmId'])
        ) {
            // If metadata is null or the environment is not AzurePublicCloud, do not proceed with provisioning.
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Extract the admin username from the metadata
        $adminUsername = $metadata['compute']['osProfile']['adminUsername'] ?? 'azureuser';

        // Update machine name
        $hostname = $metadata['compute']['name'] ?? '';
        $this->updateHostName($hostname);

        // Update LAN settings the external IP address
        $extIp = $metadata['network']['interface'][0]['ipv4']['ipAddress'][0]['publicIpAddress'] ?? '';
        $this->updateLanSettings($extIp);

        // Update SSH keys, if available
        $sshKeys = array_column($metadata['compute']['publicKeys'] ?? [], 'keyData');
        $this->updateSSHKeys(implode(PHP_EOL, $sshKeys));

        // Update SSH anf WEB password using some unique identifier from the metadata
        $vmId =$metadata['compute']['vmId'] ;
        $this->updateSSHCredentials($adminUsername, $vmId);
        $this->updateWebPassword($vmId);

        return true;
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
