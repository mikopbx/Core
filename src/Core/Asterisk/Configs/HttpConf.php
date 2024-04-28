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

use MikoPBX\Common\Models\PbxSettingsConstants;
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
        $enabled = ($this->generalSettings[PbxSettingsConstants::AJAM_ENABLED] === '1') ? 'yes' : 'no';
        $conf    = "[general]\n" .
            "enabled={$enabled}\n" .
            "bindaddr=0.0.0.0\n" .
            "bindport={$this->generalSettings[PbxSettingsConstants::AJAM_PORT]}\n" .
            "prefix=asterisk\n" .
            "enablestatic=yes\n\n";

        if ( ! empty($this->generalSettings[PbxSettingsConstants::AJAM_PORT_TLS])) {
            $keys_dir = '/etc/asterisk/keys';
            Util::mwMkdir($keys_dir);
            $WEBHTTPSPublicKey  = $this->generalSettings[PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY];
            $WEBHTTPSPrivateKey = $this->generalSettings[PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY];

            if ( ! empty($WEBHTTPSPublicKey) && ! empty($WEBHTTPSPrivateKey)) {
                $s_data = "{$WEBHTTPSPublicKey}\n{$WEBHTTPSPrivateKey}";
            } else {
                // Generate SSL certificate
                $data   = Util::generateSslCert();
                $s_data = implode("\n", $data);
            }
            $conf .= "tlsenable=yes\n" .
                "tlsbindaddr=0.0.0.0:{$this->generalSettings[PbxSettingsConstants::AJAM_PORT_TLS]}\n" .
                "tlscertfile={$keys_dir}/ajam.pem\n" .
                "tlsprivatekey={$keys_dir}/ajam.pem\n";
            Util::fileWriteContent("{$keys_dir}/ajam.pem", $s_data);
        }

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/http.conf', $conf);
    }
}