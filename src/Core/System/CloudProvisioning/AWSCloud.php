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
use MikoPBX\Core\System\SystemMessages;

class AWSCloud extends CloudProvider
{
    public const CloudID = 'AWSCloud';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
    }

    /**
     * Performs the Amazon Web Services cloud provisioning.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // Cloud check
        $checkValue = $this->getMetaDataAWS('services/partition');
        if ($checkValue!=='aws'){
            return false;
        }

        // Get host name
        $hostname = $this->getMetaDataAWS('hostname');
        if (empty($hostname)) {
            return false;
        }

        SystemMessages::echoToTeletype(PHP_EOL);

        // Update machine name
        $this->updateHostName($hostname);

        // Update LAN settings with the external IP address
        $extIp = $this->getMetaDataAWS('public-ipv4');
        $this->updateLanSettings($extIp);

        // Update SSH keys, if available
        $sshKey = '';
        $sshKeys = $this->getMetaDataAWS('public-keys');
        $sshId = explode('=', $sshKeys)[0] ?? '';
        if ($sshId !== '') {
            $sshKey = $this->getMetaDataAWS("public-keys/$sshId/openssh-key");
        }
        $this->updateSSHKeys($sshKey);

        // Update SSH and WEB passwords using some unique identifier from the metadata
        $vmId = $this->getMetaDataAWS('instance-id')??'';
        $this->updateSSHCredentials('ec2-user', $vmId);
        $this->updateWebPassword($vmId);

        return true;
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