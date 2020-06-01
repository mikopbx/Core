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

class CcssConf extends ConfigClass
{
    protected string $description = 'ccss.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "cc_max_requests = 20\n";

        file_put_contents($this->config->path('asterisk.confDir') . '/ccss.conf', $conf);
    }

}