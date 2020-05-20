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

class IndicationConf extends ConfigClass
{
    protected $description = 'indications.conf';

    protected function generateConfigProtected(): void
    {
        $country = 'ru';//TODO:: Добавить в интерфейс если это важная опция
        $rootPath = $this->config->path('core.rootPath');
        $data     = file_get_contents(
            "{$rootPath}/src/Core/Asterisk/Configs/Samples/indications.conf.sample"
        );
        $conf     = str_replace('{country}', $country, $data);
        Util::fileWriteContent($this->config->path('asterisk.confDir') . '/indications.conf', $conf);

    }

}