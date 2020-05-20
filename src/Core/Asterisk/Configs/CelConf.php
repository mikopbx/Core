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

class CelConf extends ConfigClass
{
    protected $description = 'cel.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "enable=yes\n" .
            //"apps=all\n".
            "events=BRIDGE_ENTER,BRIDGE_EXIT\n" .
            "dateformat = %F %T\n\n" .
            "[manager]\n" .
            "enabled = yes\n\n";
        Util::fileWriteContent($this->astConfDir . '/cel.conf', $conf);
    }
}