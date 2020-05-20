<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


class CcssConf extends \MikoPBX\Modules\Config\ConfigClass
{
    protected $description = 'ccss.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "cc_max_requests = 20\n";

        file_put_contents($this->astConfDir . '/ccss.conf', $conf);
    }

}