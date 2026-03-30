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
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;

/**
 * Selectel Cloud provisioning class.
 *
 * Selectel is OpenStack-based and shares the same metadata endpoint (169.254.169.254)
 * as VK Cloud and other OpenStack providers. Detection uses Selectel-specific signals:
 * - DMI sys_vendor = "Selectel" (strongest, no network request)
 * - OpenStack metadata keys with "x_sel_" prefix in meta object
 *
 * @see https://docs.selectel.ru/cloud/servers/manage/metadata/
 */
class SelectelCloud extends CloudProvider
{
    public const string CloudID = 'SelectelCloud';

    /**
     * DMI sys_vendor path for hypervisor vendor detection.
     */
    private const string DMI_SYS_VENDOR_PATH = '/sys/class/dmi/id/sys_vendor';

    /**
     * DMI product_uuid path for instance ID.
     */
    private const string DMI_PRODUCT_UUID_PATH = '/sys/class/dmi/id/product_uuid';

    /**
     * OpenStack metadata endpoint shared by all OpenStack-based providers.
     */
    private const string OPENSTACK_METADATA_URL = 'http://169.254.169.254/openstack/latest/meta_data.json';

    /**
     * AWS-compatible metadata base URL (Selectel supports both APIs).
     */
    private const string METADATA_BASE_URL = 'http://169.254.169.254/latest/meta-data/';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs an asynchronous check to determine if this cloud provider is available.
     *
     * Uses two detection methods:
     * 1. DMI sys_vendor check (instant, no network) — strongest signal
     * 2. OpenStack metadata with x_sel_ prefixed keys — secondary confirmation
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    public function checkAvailability(): PromiseInterface
    {
        // Check DMI first — instant, no network request needed
        if ($this->isDmiSelectel()) {
            return Create::promiseFor(true);
        }

        // Fallback: check OpenStack metadata for Selectel-specific keys
        $promise = $this->client->requestAsync('GET', self::OPENSTACK_METADATA_URL, [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false,
        ]);

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() !== 200) {
                    return false;
                }
                $metadata = json_decode($response->getBody()->getContents(), true) ?? [];
                return $this->hasSelectelMetaKeys($metadata);
            },
            function () {
                return false;
            }
        );
    }

    /**
     * Performs the Selectel Cloud provisioning.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // Get OpenStack metadata for provisioning data
        $metadata = $this->getOpenStackMetadata();

        // Verify this is actually Selectel
        if (!$this->isDmiSelectel() && !$this->hasSelectelMetaKeys($metadata)) {
            return false;
        }

        // Get instance UUID from DMI (preferred) or OpenStack metadata
        $instanceId = $this->getInstanceUuid($metadata);
        if (empty($instanceId)) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get instance UUID");
            return false;
        }

        // Extract hostname from OpenStack metadata
        $hostname = $metadata['name'] ?? ($metadata['hostname'] ?? '');

        // Get external IP from AWS-compatible metadata endpoint
        $extIp = $this->getAwsMetadata('public-ipv4');

        // Get SSH keys
        $sshKey = '';
        $sshKeysIndex = $this->getAwsMetadata('public-keys');
        $sshIdParts = explode('=', $sshKeysIndex);
        $sshId = $sshIdParts[0];
        if ($sshId !== '') {
            $sshKey = $this->getAwsMetadata("public-keys/$sshId/openssh-key");
        }

        // Build config from metadata
        $config = new ProvisioningConfig(
            hostname: $hostname,
            externalIp: $extIp,
            sshKeys: $sshKey,
            sshLogin: 'sel-user',
            instanceId: $instanceId,
            webPassword: $instanceId
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
     * Fetches user-data from the OpenStack-compatible metadata service.
     *
     * @return string|null User-data content or null if not available
     */
    protected function fetchUserData(): ?string
    {
        $userData = $this->getAwsMetadata('../user-data');
        return !empty($userData) ? $userData : null;
    }

    /**
     * Checks DMI sys_vendor for "Selectel" — strongest detection signal.
     *
     * @return bool True if DMI vendor is Selectel
     */
    private function isDmiSelectel(): bool
    {
        if (!is_readable(self::DMI_SYS_VENDOR_PATH)) {
            return false;
        }
        $vendor = trim((string)file_get_contents(self::DMI_SYS_VENDOR_PATH));
        return $vendor === 'Selectel';
    }

    /**
     * Checks if OpenStack metadata contains Selectel-specific keys (x_sel_ prefix).
     *
     * @param array $metadata Parsed OpenStack metadata
     * @return bool True if Selectel-specific keys found
     */
    private function hasSelectelMetaKeys(array $metadata): bool
    {
        if (!isset($metadata['meta']) || !is_array($metadata['meta'])) {
            return false;
        }
        foreach (array_keys($metadata['meta']) as $key) {
            if (str_starts_with($key, 'x_sel_')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the instance UUID from DMI (preferred) or OpenStack metadata.
     *
     * @param array $metadata Parsed OpenStack metadata
     * @return string Instance UUID or empty string
     */
    private function getInstanceUuid(array $metadata): string
    {
        // Prefer DMI product_uuid — available without network
        if (is_readable(self::DMI_PRODUCT_UUID_PATH)) {
            $uuid = trim((string)file_get_contents(self::DMI_PRODUCT_UUID_PATH));
            if (!empty($uuid)) {
                return $uuid;
            }
        }

        // Fallback to OpenStack metadata uuid
        return $metadata['uuid'] ?? '';
    }

    /**
     * Fetches and parses OpenStack metadata.
     *
     * @return array Parsed metadata or empty array on failure
     */
    private function getOpenStackMetadata(): array
    {
        try {
            $response = $this->client->request('GET', self::OPENSTACK_METADATA_URL, [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false,
            ]);

            if ($response->getStatusCode() === 200) {
                return json_decode($response->getBody()->getContents(), true) ?? [];
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get OpenStack metadata: " . $e->getMessage());
        }

        return [];
    }

    /**
     * Retrieves metadata from the AWS-compatible metadata endpoint.
     *
     * @param string $path The metadata path to retrieve
     * @return string The response body or empty string if retrieval failed
     */
    private function getAwsMetadata(string $path): string
    {
        try {
            $response = $this->client->request('GET', self::METADATA_BASE_URL . $path, [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false,
            ]);

            if ($response->getStatusCode() === 200) {
                return trim($response->getBody()->getContents());
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get metadata for '$path': " . $e->getMessage());
        }

        return '';
    }
}
