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
use GuzzleHttp;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;

/**
 * VKCloud provisioning class for VK Cloud Solutions
 */
class VKCloud extends CloudProvider
{
    public const string CloudID = 'VKCloud';

    /**
     * HTTP client for API requests
     */
    private Client $client;

    /**
     * Constructor initializes HTTP client with timeout
     */
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
        // Try OpenStack metadata endpoint first (VK Cloud specific)
        $promise = $this->client->requestAsync('GET', 'http://169.254.169.254/openstack/latest/meta_data.json', [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false
        ]);

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() === 200) {
                    $metadata = json_decode($response->getBody()->getContents(), true) ?? [];

                    // Check for VK Cloud specific fields in OpenStack metadata
                    if (isset($metadata['project_id']) ||
                        (isset($metadata['meta']) && isset($metadata['meta']['vkcloud_project_id']))) {
                        return true;
                    }
                }
                return false;
            },
            function () {
                return false;
            }
        );
    }

    /**
     * Performs the VK Cloud Solutions provisioning.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // More strict check for VK Cloud
        if (!$this->isVKCloudInstance()) {
            return false;
        }

        // Update machine name
        $hostname = $this->getMetaDataVCS('hostname');
        if (empty($hostname)) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get hostname from metadata");
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        $this->updateHostName($hostname);

        // Update LAN settings with the external IP address
        $extIp = $this->getMetaDataVCS('public-ipv4');
        $this->updateLanSettings($extIp);

        // Update SSH keys, if available
        $sshKey = '';
        $sshKeys = $this->getMetaDataVCS('public-keys');
        $sshId = explode('=', $sshKeys)[0] ?? '';
        if ($sshId !== '') {
            $sshKey = $this->getMetaDataVCS("public-keys/$sshId/openssh-key");
        }
        $this->updateSSHKeys($sshKey);

        // Update SSH and WEB passwords using some unique identifier from the metadata
        $vmId = $this->getMetaDataVCS('instance-id') ?? '';
        $this->updateSSHCredentials('vk-user', $vmId);
        $this->updateWebPassword($vmId);

        return true;
    }

    /**
     * Checks if the instance is running on VK Cloud
     *
     * @return bool True if running on VK Cloud, false otherwise
     */
    private function isVKCloudInstance(): bool
    {
        // Check 1: VK Cloud specific service partition check
        $servicePartition = $this->getMetaDataVCS('services/partition');
        if ($servicePartition === 'aws') {
            return false; // It is AWS, not VK
        }

        // Check 2: Try to get VK Cloud specific metadata
        try {
            // Check the product-codes field which should be specific to VK Cloud
            $productCodes = $this->getMetaDataVCS('product-codes');
            if (!empty($productCodes) && strpos($productCodes, 'vkcloud') !== false) {
                return true;
            }

            // Check instance-id format (VK Cloud typically has a specific format)
            $instanceId = $this->getMetaDataVCS('instance-id');
            if ($instanceId !== '' && strlen($instanceId) > 10) {
                // Check for Vultr specific instance ID format (numeric)
                if (is_numeric($instanceId)) {
                    return false; // Likely Vultr, not VK Cloud
                }

                // Check if available AMI ID contains VK Cloud references
                $amiId = $this->getMetaDataVCS('ami-id');
                if (!empty($amiId) && (stripos($amiId, 'vk') !== false || stripos($amiId, 'mail') !== false)) {
                    return true;
                }
            }

            // Check 3: Try to get VK metadata in a different format
            $response = $this->client->request('GET', 'http://169.254.169.254/openstack/latest/meta_data.json', [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false
            ]);

            if ($response->getStatusCode() === 200) {
                $metadata = json_decode($response->getBody()->getContents(), true)??[];

                // Check for VK Cloud specific fields in OpenStack metadata
                if (isset($metadata['project_id']) ||
                    (isset($metadata['meta']) && isset($metadata['meta']['vkcloud_project_id']))) {
                    return true;
                }
            }
        } catch (GuzzleException $e) {
            // Failed to get metadata, continue with other checks
        }

        // Check 4: Network checks for VK Cloud
        try {
            // Check the network connectivity to VK Cloud services
            $response = $this->client->request('GET', 'http://mcs.mail.ru', [
                'timeout' => 2,
                'http_errors' => false
            ]);

            if ($response->getStatusCode() < 400) {
                // Could connect to VK Cloud faster than normal - might be in their network
                return true;
            }
        } catch (GuzzleException $e) {
            // Failed network check
        }

        // Check 5: Examine network interfaces for VK Cloud specific patterns
        try {
            // Get MAC addresses of network interfaces
            $macs = $this->getMetaDataVCS('network/interfaces/macs/');
            $macAddresses = array_filter(explode("\n", $macs));

            foreach ($macAddresses as $mac) {
                $mac = trim($mac, '/');
                // Check for VK Cloud VPC CIDRs or other network identifiers
                $vpcId = $this->getMetaDataVCS("network/interfaces/macs/$mac/vpc-id");
                if (!empty($vpcId) && (strpos($vpcId, 'vpc-') === 0)) {
                    // Check if the VPC ID matches VK Cloud format
                    // Vultr doesn't use vpc-* format for its identifiers
                    return true;
                }
            }
        } catch (GuzzleException $e) {
            // Failed network interface check
        }

        // Check 6: Check for Vultr-specific metadata to rule out Vultr
        try {
            $response = $this->client->request('GET', 'http://169.254.169.254/v1.json', [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false
            ]);

            if ($response->getStatusCode() === 200) {
                $vultrMetadata = json_decode($response->getBody()->getContents(), true);

                // If this succeeds and contains typical Vultr fields, it's Vultr not VK Cloud
                if (isset($vultrMetadata['instanceid']) ||
                    isset($vultrMetadata['instance-v2-id']) ||
                    isset($vultrMetadata['region']['regioncode'])) {
                    SystemMessages::sysLogMsg(__CLASS__, "Found Vultr-specific metadata, not VK Cloud");
                    return false;
                }
            }
        } catch (GuzzleException $e) {
            // Failed Vultr check, that's good for VK Cloud
        }

        // Default to false if no VK Cloud specific identifiers were found
        SystemMessages::sysLogMsg(__CLASS__, "Couldn't definitively identify as VK Cloud");
        return false;
    }

    /**
     * Retrieves metadata from the VK Cloud metadata endpoint.
     *
     * @param string $url The URL path of the metadata to retrieve.
     * @return string The response body or empty string if retrieval failed.
     */
    private function getMetaDataVCS(string $url): string
    {
        $baseUrl = 'http://169.254.169.254/latest/meta-data';
        $headers = [];
        $params = [];
        $options = [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false,
            'headers' => $headers
        ];

        $fullUrl = "$baseUrl/$url?" . http_build_query($params);
        try {
            $res = $this->client->request('GET', $fullUrl, $options);
            $code = $res->getStatusCode();
        } catch (GuzzleHttp\Exception\ConnectException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Connection error getting metadata: " . $e->getMessage());
            $code = 0;
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Error getting metadata: " . $e->getMessage());
            $code = 0;
        }
        $body = '';
        if ($code === 200 && isset($res)) {
            $body = $res->getBody()->getContents();
        }
        return $body;
    }
}