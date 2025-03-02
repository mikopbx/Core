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
        if ($metadata === null || empty($metadata['instance-v2-id'])) {
            // If metadata is null or instance ID is unknown, do not proceed with provisioning.
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Extract SSH keys from public-keys if available
        $sshKeys = '';
        if (isset($metadata['public-keys']) && is_array($metadata['public-keys']) && !empty($metadata['public-keys'])) {
            $sshKeys = implode("\n", $metadata['public-keys']);
        }

        // Extract username from SSH keys or use default
        $username = $this->extractUserNameFromSshKeys($sshKeys);

        // Update SSH keys if available
        if (!empty($sshKeys)) {
            $this->updateSSHKeys($sshKeys);
        }

        // Update machine name (hostname)
        $hostname = $metadata['hostname'] ?? '';
        if (!empty($hostname)) {
            $this->updateHostName($hostname);
        }

        // Extract external IP from interfaces array
        $extIp = '';
        if (isset($metadata['interfaces']) && is_array($metadata['interfaces'])) {
            foreach ($metadata['interfaces'] as $interface) {
                if (($interface['network-type'] ?? '') === 'public' && isset($interface['ipv4']['address'])) {
                    $extIp = $interface['ipv4']['address'];
                    break;
                }
            }
        }

        // Update LAN settings with the external IP address if found
        if (!empty($extIp)) {
            $this->updateLanSettings($extIp);
        }

        // Update SSH and WEB passwords using instance ID as unique identifier
        $instanceId = $metadata['instance-v2-id'];
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
        }

        return null;
    }

    /**
     * Extracts the username from SSH keys.
     *
     * @param string $sshKeys SSH keys string.
     * @return string|null Extracted username or null if not found.
     */
    private function extractUserNameFromSshKeys(string $sshKeys): ?string
    {
        // Check if keys are empty
        if (empty($sshKeys)) {
            return null;
        }

        // Split multiple keys if present
        $keyLines = explode("\n", $sshKeys);
        $firstKey = trim($keyLines[0]);

        // Try to extract username from SSH key
        if (strpos($firstKey, ' ') !== false) {
            $keyParts = explode(' ', $firstKey);

            // If we have a comment part (3rd part in ssh-ed25519 KEY COMMENT format)
            if (count($keyParts) >= 3) {
                $comment = $keyParts[2];

                // If comment contains @ (likely an email)
                if (strpos($comment, '@') !== false) {
                    $username = explode('@', $comment)[0];
                    if (strlen($username) >= 3 && strlen($username) < 25) {
                        return $username;
                    }
                } else {
                    // Just use the comment if it's a reasonable length
                    if (strlen($comment) >= 3 && strlen($comment) < 25) {
                        return $comment;
                    }
                }
            }
        }

        // Try to extract from the hostname as fallback
        $hostname = gethostname();
        if (preg_match('/^([a-zA-Z0-9]+)-/', $hostname, $matches)) {
            return $matches[1];
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
        // Check for instance-v2-id which appears to be Vultr-specific
        if (isset($metadata['instance-v2-id']) &&
            preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $metadata['instance-v2-id'])) {
            return true;
        }

        // Check for region structure that matches Vultr
        if (isset($metadata['region']) &&
            isset($metadata['region']['regioncode']) &&
            isset($metadata['region']['countrycode'])) {
            return true;
        }

        return false;
    }
}