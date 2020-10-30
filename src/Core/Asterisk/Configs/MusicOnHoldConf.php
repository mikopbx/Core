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

class MusicOnHoldConf extends ConfigClass
{
    protected string $description = 'musiconhold.conf';

    protected function generateConfigProtected(): void
    {
        $mohpath    = $this->config->path('asterisk.mohdir');

        $conf = "[default]\n" .
            "mode=files\n" .
            "directory=$mohpath\n\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/musiconhold.conf', $conf);
    }
}