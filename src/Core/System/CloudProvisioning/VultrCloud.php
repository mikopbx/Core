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

namespace MikoPBX\Core\System\CloudProvisioning;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Core\System\SystemMessages;

/**
 * Class VultrCloud
 *
 * Implementation of CloudProvider for VULTR cloud services.
 */
class VultrCloud extends CloudProvider
{
    public const string CloudID = 'VultrCloud';

    /**
     * HTTP client for API requests
     */
    private Client $client;

    /**
     * Metadata endpoint URL for Vultr instances
     */
    private const string METADATA_ENDPOINT = 'http://169.254.169.254/v1.json';

    /**
     * Constructor initializes HTTP client with timeout
     */
    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs the Vultr Cloud provisioning.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        $metadata = $this->retrieveInstanceMetadata();
        if ($metadata === null || empty($metadata['instanceid'])) {
            // If metadata is null or instance ID is unknown, do not proceed with provisioning.
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Extract SSH keys from user-data if available
        $sshKeys = $metadata['public-keys'] ?? '';

        // Extract username from SSH keys or use default
        $username = $this->extractUserNameFromSshKeys($sshKeys);

        // Update SSH keys if available
        $this->updateSSHKeys($sshKeys);

        // Update machine name (hostname)
        $hostname = $metadata['hostname'] ?? '';
        $this->updateHostName($hostname);

        // Update LAN settings with the external IP address
        $extIp = $metadata['public-ipv4'] ?? '';
        $this->updateLanSettings($extIp);

        // Update SSH and WEB passwords using instance ID as unique identifier
        $instanceId = $metadata['instanceid'];
        $this->updateSSHCredentials($username ?? 'vultr-user', $instanceId);
        $this->updateWebPassword($instanceId);

        return true;
    }

    /**
     * Retrieves Vultr instance metadata.
     *
     * @return array|null The instance metadata or null if retrieval failed.
     */
    private function retrieveInstanceMetadata(): ?array
    {
        try {
            // Try to get metadata from Vultr's metadata service
            $response = $this->client->request('GET', self::METADATA_ENDPOINT);

            if ($response->getStatusCode() == 200) {
                $metadata = json_decode($response->getBody()->getContents(), true) ?? [];

                // Verify that this is indeed a Vultr instance
                if ($this->isVultrInstance($metadata)) {
                    return $metadata;
                } else {
                    SystemMessages::sysLogMsg(__CLASS__, "Metadata does not appear to be from a Vultr instance.");
                }
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to retrieve Vultr instance metadata: " . $e->getMessage());

            // Try alternative metadata endpoint if main one fails
            try {
                $response = $this->client->request('GET', 'http://169.254.169.254/latest/meta-data/');
                if ($response->getStatusCode() == 200) {
                    // Process alternative metadata format if needed
                    // This is a simplified approach, you might need to make multiple requests
                    // to build the complete metadata object
                    $metadataRaw = $response->getBody()->getContents();
                    return $this->processAlternativeMetadata($metadataRaw);
                }
            } catch (GuzzleException $e2) {
                SystemMessages::sysLogMsg(__CLASS__, "Failed to retrieve alternative metadata: " . $e2->getMessage());
            }
        }

        return null;
    }

    /**
     * Process alternative metadata format if the primary endpoint fails
     *
     * @param string $metadataRaw Raw metadata string
     * @return array Processed metadata
     */
    private function processAlternativeMetadata(string $metadataRaw): array
    {
        $metadata = [];
        $lines = explode("\n", $metadataRaw);

        // Try to fetch each important piece of metadata separately
        try {
            // Instance ID
            $response = $this->client->request('GET', 'http://169.254.169.254/latest/meta-data/instance-id');
            if ($response->getStatusCode() == 200) {
                $metadata['instanceid'] = trim($response->getBody()->getContents());
            }

            // Hostname
            $response = $this->client->request('GET', 'http://169.254.169.254/latest/meta-data/hostname');
            if ($response->getStatusCode() == 200) {
                $metadata['hostname'] = trim($response->getBody()->getContents());
            }

            // Public IP
            $response = $this->client->request('GET', 'http://169.254.169.254/latest/meta-data/public-ipv4');
            if ($response->getStatusCode() == 200) {
                $metadata['public-ipv4'] = trim($response->getBody()->getContents());
            }

            // Public keys
            $response = $this->client->request('GET', 'http://169.254.169.254/latest/meta-data/public-keys/');
            if ($response->getStatusCode() == 200) {
                $metadata['public-keys'] = trim($response->getBody()->getContents());
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Error fetching individual metadata elements: " . $e->getMessage());
        }

        return $metadata;
    }

    /**
     * Extracts the username from SSH keys.
     *
     * @param string $sshKeys SSH keys string.
     * @return string|null Extracted username or null if not found.
     */
    private function extractUserNameFromSshKeys(string $sshKeys): ?string
    {
        // If the format is "username:ssh-rsa AAAA..."
        if (strpos($sshKeys, ':') !== false) {
            $parts = explode(':', $sshKeys);
            $username = $parts[0];
            if (strlen($username) >= 3 && strlen($username) < 25) {
                return $username;
            }
        }

        // If we have ssh-rsa keys without explicit username
        if (strpos($sshKeys, 'ssh-rsa') !== false) {
            // Try to extract a comment at the end which often contains email or username
            $parts = explode(' ', $sshKeys);
            if (count($parts) >= 3) {
                $possibleUsername = $parts[2];
                // If the comment looks like an email, extract the username part
                if (strpos($possibleUsername, '@') !== false) {
                    $possibleUsername = explode('@', $possibleUsername)[0];
                }

                if (strlen($possibleUsername) >= 3 && strlen($possibleUsername) < 25) {
                    return $possibleUsername;
                }
            }
        }

        return null; // Return null if no username found
    }

    /**
     * Checks if the metadata is from a Vultr instance.
     *
     * @param array $metadata Metadata array from cloud instance.
     * @return bool True if it appears to be a Vultr instance, false otherwise.
     */
    private function isVultrInstance(array $metadata): bool
    {
        // Check for Vultr-specific metadata fields
        if (isset($metadata['provider']) && $metadata['provider'] === 'vultr') {
            return true;
        }

        // Check for Vultr's instance ID format
        if (isset($metadata['instanceid']) && preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $metadata['instanceid'])) {
            return true;
        }

        // Check for Vultr's network interface naming pattern
        if (isset($metadata['interfaces']) && is_array($metadata['interfaces'])) {
            foreach ($metadata['interfaces'] as $interface) {
                if (isset($interface['networkid']) && strpos($interface['networkid'], 'vultr') !== false) {
                    return true;
                }
            }
        }

        return false;
    }
}