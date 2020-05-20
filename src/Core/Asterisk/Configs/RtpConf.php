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

class RtpConf extends ConfigClass
{
    protected $description = 'rtp.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "rtpstart={$this->generalSettings['RTPPortFrom']}\n" .
            "rtpend={$this->generalSettings['RTPPortTo']}\n\n";

        Util::fileWriteContent($this->config->path('asterisk.confDir') . '/rtp.conf', $conf);
    }
}