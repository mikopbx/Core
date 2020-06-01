<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class HttpConf extends ConfigClass
{
    protected string $description = 'http.conf';

    protected function generateConfigProtected(): void
    {
        $enabled = ($this->generalSettings['AJAMEnabled'] === '1') ? 'yes' : 'no';
        $conf    = "[general]\n" .
            "enabled={$enabled}\n" .
            "bindaddr=0.0.0.0\n" .
            "bindport={$this->generalSettings['AJAMPort']}\n" .
            "prefix=asterisk\n" .
            "enablestatic=yes\n\n";

        if ( ! empty($this->generalSettings['AJAMPortTLS'])) {
            $keys_dir = '/etc/asterisk/keys';
            if ( ! is_dir($keys_dir) && ! mkdir($keys_dir) && ! is_dir($keys_dir)) {
                Util::sysLogMsg('httpConfGenerate', sprintf('Directory "%s" was not created', $keys_dir));

                return;
            }
            $WEBHTTPSPublicKey  = $this->generalSettings['WEBHTTPSPublicKey'];
            $WEBHTTPSPrivateKey = $this->generalSettings['WEBHTTPSPrivateKey'];

            if ( ! empty($WEBHTTPSPublicKey) && ! empty($WEBHTTPSPrivateKey)) {
                $s_data = "{$WEBHTTPSPublicKey}\n{$WEBHTTPSPrivateKey}";
            } else {
                // Генерируем сертификат ssl.
                $data   = Util::generateSslCert();
                $s_data = implode("\n", $data);
            }
            $conf .= "tlsenable=yes\n" .
                "tlsbindaddr=0.0.0.0:{$this->generalSettings['AJAMPortTLS']}\n" .
                "tlscertfile={$keys_dir}/ajam.pem\n" .
                "tlsprivatekey={$keys_dir}/ajam.pem\n";
            Util::fileWriteContent("{$keys_dir}/ajam.pem", $s_data);
        }
        Util::fileWriteContent($this->config->path('asterisk.confDir') . '/http.conf', $conf);
    }
}