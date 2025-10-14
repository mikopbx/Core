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

class AlibabaCloud extends CloudProvider
{
    // Cloud provider identifier
    public const string CloudID = 'AlibabaCloud';

    // Base URL for Alibaba Cloud metadata service
    private const string METADATA_BASE_URL = 'http://100.100.100.200/latest/meta-data/';

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
        $promise = $this->client->requestAsync('GET', self::METADATA_BASE_URL . 'instance-id');

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() === 200) {
                    $instanceId = trim($response->getBody()->getContents());
                    return !empty($instanceId);
                }
                return false;
            },
            function () {
                return false;
            }
        );
    }

    /**
     * Performs the Alibaba Cloud provisioning using the Metadata Service.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // Verify we're running on Alibaba Cloud by checking metadata
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null || empty($metadata['instance-id'])) {
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Update machine hostname
        $hostname = $metadata['hostname'] ?? '';
        $this->updateHostName($hostname);

        // Update LAN settings with the EIP (public IP) if available, otherwise use private IP
        $publicIp = $metadata['eipv4'] ?? '';
        $privateIp = $metadata['private-ipv4'] ?? '';
        $this->updateLanSettings(
            empty($publicIp) ? $privateIp : $publicIp
        );

        // Update SSH keys if available
        $sshKeys = $this->retrieveSSHKeys();
        if (!empty($sshKeys)) {
            $this->updateSSHKeys($sshKeys);
        }

        // Update SSH and Web credentials using instance ID
        $instanceId = $metadata['instance-id'];
        $this->updateSSHCredentials('root', $instanceId);
        $this->updateWebPassword($instanceId);

        // Log successful provisioning with instance details
        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                "Provisioned Alibaba Cloud instance: %s, Private IP: %s, Public IP: %s",
                $instanceId,
                $privateIp,
                $publicIp
            )
        );

        return true;
    }

    /**
     * Retrieves metadata for the Alibaba Cloud instance.
     *
     * @return array|null The instance metadata or null if retrieval failed.
     */
    private function retrieveInstanceMetadata(): ?array
    {
        try {
            $metadata = [];

            // List of metadata endpoints to fetch
            $endpoints = [
                'instance-id',
                'hostname',
                'private-ipv4',
                'eipv4',
                'vpc-id',
                'region-id',
                'owner-account-id',
                'vpc-cidr-block',
                'vswitch-id'
            ];

            // Fetch metadata from each endpoint
            foreach ($endpoints as $endpoint) {
                $response = $this->client->request('GET', self::METADATA_BASE_URL . $endpoint);
                if ($response->getStatusCode() === 200) {
                    $metadata[$endpoint] = trim($response->getBody()->getContents());
                }
            }

            // Validate essential metadata
            if (empty($metadata['instance-id']) || empty($metadata['private-ipv4'])) {
                return null;
            }

            return $metadata;

        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to retrieve Alibaba Cloud metadata: " . $e->getMessage()
            );
            return null;
        }
    }

    /**
     * Retrieves SSH public key from the metadata service.
     *
     * @return string SSH public key or empty string if not available
     */
    private function retrieveSSHKeys(): string
    {
        try {
            $response = $this->client->request(
                'GET',
                self::METADATA_BASE_URL . 'public-keys/0/openssh-key'
            );

            if ($response->getStatusCode() === 200) {
                return trim($response->getBody()->getContents());
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to retrieve SSH key: " . $e->getMessage()
            );
        }

        return '';
    }
}