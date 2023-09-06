<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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


use MikoPBX\Core\System\Util;
use function MikoPBX\Common\Config\appPath;

class IndicationConf extends CoreConfigClass
{
    protected string $description = 'indications.conf';

    protected function generateConfigProtected(): void
    {
        $country = 'ru';//TODO:: Добавить в интерфейс если это важная опция
        $filePath = appPath('src/Core/Asterisk/Configs/Samples/indications.conf.sample');
        $data     = file_get_contents($filePath);
        $conf     = str_replace('{country}', $country, $data);
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/indications.conf', $conf);
    }

}