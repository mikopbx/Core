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

class CdrManagerConf extends ConfigClass
{
    protected $description = 'cdr_manager.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "enabled=yes\n" .
            "\n" .
            "[mappings]\n" .
            "linkedid => linkedid\n" .
            "recordingfile => recordingfile\n\n";

        Util::fileWriteContent($this->astConfDir . "/cdr_manager.conf", $conf);
    }
}