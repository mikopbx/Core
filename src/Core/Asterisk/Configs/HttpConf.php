<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Util;

/**
 * Class HttpConf
 *
 * Represents a configuration class for HTTP.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class HttpConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'http.conf';

    /**
     * Generates the configuration for the http.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $isEnable = intval(PbxSettings::getValueByKey(PbxSettings::AJAM_ENABLED)) === 1;
        $port = PbxSettings::getValueByKey(PbxSettings::AJAM_PORT);
        $tlsPort = PbxSettings::getValueByKey(PbxSettings::AJAM_PORT_TLS);
        $enabled = ($isEnable) ? 'yes' : 'no';
        $conf    = "[general]".PHP_EOL .
            "enabled=$enabled".PHP_EOL .
            "bindaddr=0.0.0.0".PHP_EOL .
            "bindport={$port}".PHP_EOL .
            "prefix=asterisk".PHP_EOL .
            "enablestatic=yes".PHP_EOL.PHP_EOL;
        if ( ! empty($tlsPort)) {
            $keys_dir = '/etc/asterisk/keys';
            Util::mwMkdir($keys_dir);
            $publicKey  = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PUBLIC_KEY);
            $privateKey = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PRIVATE_KEY);

            if ( ! empty($publicKey) && ! empty($privateKey)) {
                $s_data = "".$publicKey.PHP_EOL.
                             $privateKey;
            } else {
                // Generate SSL certificate
                $data   = Util::generateSslCert();
                $s_data = implode("\n", $data);
            }
            $conf .= "tlsenable=$enabled" . PHP_EOL.
                "tlsbindaddr=0.0.0.0:{$tlsPort}".PHP_EOL.
                "tlscertfile=$keys_dir/ajam.pem".PHP_EOL.
                "tlsprivatekey=$keys_dir/ajam.pem".PHP_EOL;
            Util::fileWriteContent("$keys_dir/ajam.pem", $s_data);
        }
        $this->saveConfig($conf, $this->description);
    }
}