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
use MikoPBX\Core\System\SslCertificateService;

/**
 * Class RtpConf
 *
 * This class represents the rtp.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class RtpConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'rtp.conf';

    /**
     * Generates the content for the rtp.conf file based on the provided general settings and writes it to the file.
     *
     */
    protected function generateConfigProtected(): void
    {
        $stunConfig = '';
        $stun = trim(PbxSettings::getValueByKey(PbxSettings::RTP_STUN_SERVER));
        if(!empty($stun)){
            $stunConfig = "stunaddr=$stun".PHP_EOL;
        }

        $rtpStart = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_FROM);
        $rtpEnd = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_TO);

        $conf = "[general]\n" .
            $stunConfig.
            "rtpstart={$rtpStart}".PHP_EOL.
            "rtpend={$rtpEnd}".PHP_EOL;
            
        // Add DTLS configuration for WebRTC if enabled
        $useWebRTC = PbxSettings::getValueByKey(PbxSettings::USE_WEB_RTC);
        if ($useWebRTC === '1') {
            // Prepare certificates for DTLS
            $certs = SslCertificateService::prepareAsteriskCertificates('asterisk-rtp-dtls');
            
            if (!empty($certs['certPath']) && !empty($certs['keyPath'])) {
                $conf .= PHP_EOL .
                    "; DTLS configuration for WebRTC\n" .
                    "dtlsenable=yes".PHP_EOL.
                    "dtlscertfile={$certs['certPath']}".PHP_EOL.
                    "dtlsprivatekey={$certs['keyPath']}".PHP_EOL.
                    "dtlssetup=actpass".PHP_EOL.
                    "dtlsverify=no".PHP_EOL;
            }
        }
        
        $conf .= PHP_EOL;

        // Write the configuration content to the file
        $this->saveConfig($conf, $this->description);
    }
}