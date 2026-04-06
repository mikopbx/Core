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

class AWSCloud extends CloudProvider
{
    public const string CloudID = 'AWSCloud';

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
        $url = 'http://169.254.169.254/latest/meta-data/services/partition';
        $promise = $this->client->requestAsync('GET', $url, [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false
        ]);

        return $promise->then(
            function ($response) {
                if ($response->getStatusCode() === 200) {
                    $body = $response->getBody()->getContents();
                    return $body === 'aws';
                }
                return false;
            },
            function () {
                return false;
            }
        );
    }

    /**
     * Performs the Amazon Web Services cloud provisioning.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // Cloud check
        $checkValue = $this->getMetaDataAWS('services/partition');
        if ($checkValue !== 'aws') {
            return false;
        }

        // Get host name
        $hostname = $this->getMetaDataAWS('hostname');
        if (empty($hostname)) {
            return false;
        }

        // Get instance metadata
        $extIp = $this->getMetaDataAWS('public-ipv4');
        $vmId = $this->getMetaDataAWS('instance-id');

        // Get SSH keys
        $sshKey = '';
        $sshKeys = $this->getMetaDataAWS('public-keys');
        $sshIdParts = explode('=', $sshKeys);
        $sshId = $sshIdParts[0];
        if ($sshId !== '') {
            $sshKey = $this->getMetaDataAWS("public-keys/$sshId/openssh-key");
        }

        // Build config from IMDS metadata
        $config = new ProvisioningConfig(
            hostname: $hostname,
            externalIp: $extIp,
            sshKeys: $sshKey,
            sshLogin: 'ec2-user',
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
     * Fetches user-data from AWS IMDS.
     *
     * @return string|null User-data content or null if not available
     */
    protected function fetchUserData(): ?string
    {
        $userData = $this->getMetaDataAWS('../user-data');
        return !empty($userData) ? $userData : null;
    }

    /**
     * Retrieves metadata from the MCS endpoint.
     *
     * @param string $url The URL of the metadata endpoint.
     * @return string The response body.
     */
    private function getMetaDataAWS(string $url): string
    {
        $baseUrl = 'http://169.254.169.254/latest/meta-data/';
        $headers = [];
        $params = [];
        $options = [
            'timeout' => self::HTTP_TIMEOUT,
            'http_errors' => false,
            'headers' => $headers
        ];

        $url = "$baseUrl/$url?" . http_build_query($params);
        try {
            $res = $this->client->request('GET', $url, $options);
            $code = $res->getStatusCode();
        } catch (GuzzleHttp\Exception\ConnectException $e) {
            $code = 0;
        } catch (GuzzleException $e) {
            $code = 0;
        }
        $body = '';
        if ($code === 200 && isset($res)) {
            $body = $res->getBody()->getContents();
        }
        return $body;
    }
}
