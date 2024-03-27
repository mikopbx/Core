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

use MikoPBX\Core\System\Util;

class YandexCloud extends CloudProvider
{
    const CLOUD_NAME='YandexCloud';

    /**
     * Performs the Yandex Cloud provisioning.
     *
     * @return bool True if the provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        Util::sysLogMsg(__CLASS__, 'Try '.self::CLOUD_NAME.' provisioning... ');

        $curl = curl_init();
        $url = 'http://169.254.169.254/computeMetadata/v1/instance/?recursive=true';
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, self::HTTP_TIMEOUT);
        curl_setopt($curl, CURLOPT_HTTPHEADER, ['Metadata-Flavor:Google']);
        $resultRequest = curl_exec($curl);

        $http_code = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        if ($http_code !== 200 || !is_string($resultRequest)) {
            return false;
        }
        $data = json_decode($resultRequest, true);

        // Update SSH keys, if available
        $this->updateSSHKeys($data['attributes']['ssh-keys'] ?? '');

        // Update LAN settings with hostname and external IP address
        $hostname = $data['name'] ?? '';
        $extIp = $data['networkInterfaces'][0]['accessConfigs'][0]['externalIp'] ?? '';
        $this->updateLanSettings($hostname, $extIp);

        // Update SSH and WEB passwords using some unique identifier from the metadata
        $vmId = $data['id'] ?? '';
        $this->updateSSHPassword($vmId);
        $this->updateWebPassword($vmId);

        return true;
    }
}