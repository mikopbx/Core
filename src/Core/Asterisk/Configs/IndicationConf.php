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
use MikoPBX\Core\System\Util;
use function MikoPBX\Common\Config\appPath;

/**
 * Class IndicationConf
 *
 * Represents a configuration class for indications.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class IndicationConf extends AsteriskConfigClass
{
    public const array LANG_ZONE_MAP = [
        'ru-ru' => 'ru',
        'en-en' => 'us',
        'en-gb' => 'uk',
        'de-de' => 'de',
        'da-dk' => 'dk',
        'es-es' => 'es',
        'gr-gr' => 'gr',
        'fr-ca' => 'fr',
        'it-it' => 'it',
        'ja-jp' => 'jp',
        'nl-nl' => 'nl',
        'pl-pl' => 'pl',
        'pt-br' => 'pt',
    ];

    protected string $description = 'indications.conf';

    /**
     * Generates the configuration for the indications.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $lang     = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);
        $country  = self::LANG_ZONE_MAP[$lang] ?? 'ru';
        $filePath = appPath('src/Core/Asterisk/Configs/Samples/indications.conf.sample');
        $data     = file_get_contents($filePath);
        $conf     = str_replace('{country}', $country, $data);
        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/indications.conf', $conf);
    }
}