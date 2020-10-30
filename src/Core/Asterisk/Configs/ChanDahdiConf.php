<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Modules\Config\ConfigClass;

class ChanDahdiConf extends ConfigClass
{
    protected string $description = 'chan_dahdi.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[trunkgroups]\n" .
            "[channels]\n" .
            "";

        file_put_contents($this->config->path('asterisk.astetcdir') . '/chan_dahdi.conf', $conf);
    }

}