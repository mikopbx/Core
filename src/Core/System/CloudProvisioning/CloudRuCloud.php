<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;

/**
 * Cloud.ru Evolution provisioning through OpenStack metadata.
 */
class CloudRuCloud extends CloudProvider
{
    public const string CloudID = 'CloudRuCloud';

    private const string METADATA_URL = 'http://169.254.169.254/openstack/latest/';
    private const string EC2_METADATA_URL = 'http://169.254.169.254/latest/meta-data/';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    public function checkAvailability(): PromiseInterface
    {
        return $this->client->requestAsync('GET', self::METADATA_URL . 'vendor_data2.json', [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false,
        ])->then(
            static function ($response): bool {
                if ($response->getStatusCode() !== 200) {
                    return false;
                }

                $data = json_decode($response->getBody()->getContents(), true);
                $vendor = $data['vmmmetadata'] ?? null;
                if (!is_array($vendor)) {
                    return false;
                }

                // Cloud.ru's vendor data contains these agent fields even when their values are empty.
                return isset($vendor['token'], $vendor['projectId'], $vendor['instanceId'],
                    $vendor['monaasUrl'], $vendor['logaasUrl'], $vendor['collectDefaultLogs'])
                    && is_string($vendor['token'])
                    && is_string($vendor['projectId'])
                    && is_string($vendor['instanceId'])
                    && is_string($vendor['monaasUrl'])
                    && is_string($vendor['logaasUrl'])
                    && is_bool($vendor['collectDefaultLogs']);
            },
            static fn (): bool => false
        );
    }

    public function provision(): bool
    {
        if (!$this->checkAvailability()->wait()) {
            return false;
        }

        $metadata = json_decode($this->getMetadata(self::METADATA_URL . 'meta_data.json'), true);
        $instanceUuid = $metadata['uuid'] ?? null;
        $instanceName = $metadata['name'] ?? null;
        // Cloud.ru displays the ID in "name"; OpenStack's UUID is a separate, hidden ID.
        if (
            !is_string($instanceUuid)
            || !preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i', $instanceUuid)
            || !is_string($instanceName)
            || !preg_match('/^Vm ([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i', $instanceName, $matches)
        ) {
            SystemMessages::sysLogMsg(__CLASS__, 'Missing instance UUID or Cloud.ru VM ID in OpenStack metadata');
            return false;
        }

        $instanceId = $matches[1];
        $config = new ProvisioningConfig(
            hostname: 'mikopbx-' . strtolower(substr($instanceUuid, 0, 8)),
            externalIp: $this->getMetadata(self::EC2_METADATA_URL . 'public-ipv4'),
            instanceId: $instanceId,
            webPassword: $instanceId
        );

        $userData = $this->fetchUserData();
        if ($userData !== null) {
            $userConfig = $this->parseUserData($userData);
            if ($userConfig !== null && !$userConfig->isEmpty()) {
                $config = $config->merge($userConfig);
            }
        }

        return $this->applyConfigDirect($config);
    }

    protected function fetchUserData(): ?string
    {
        $data = $this->getMetadata(self::METADATA_URL . 'user_data');
        return $data !== '' ? $data : null;
    }

    private function getMetadata(string $url): string
    {
        try {
            $response = $this->client->request('GET', $url, [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false,
            ]);
            if ($response->getStatusCode() === 200) {
                return trim($response->getBody()->getContents());
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get metadata: " . $e->getMessage());
        }

        return '';
    }
}
