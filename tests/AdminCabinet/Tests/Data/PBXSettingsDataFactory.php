<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

use MikoPBX\Common\Models\PbxSettings;

/**
 * Factory class for PBX settings test data
 */
class PBXSettingsDataFactory
{
    private static array $settings = [
        'default' => [
            PbxSettings::PBX_NAME => 'Тестовая 72',
            PbxSettings::PBX_DESCRIPTION => 'log: admin  pass: 123456789MikoPBX#1 last test:{date}',
            PbxSettings::PBX_LANGUAGE => 'en-en',
            PbxSettings::PBX_RECORD_CALLS => true,
            PbxSettings::SEND_METRICS => false,
            PbxSettings::SSH_AUTHORIZED_KEYS => '{SSH_RSA_KEYS_SET}',
            'codec_alaw' => true,
            'codec_ulaw' => false,
            'codec_g726' => true,
            'codec_gsm' => false,
            'codec_adpcm' => true,
            'codec_g722' => false,
            'codec_ilbc' => true,
            'codec_opus' => false,
            'codec_h264' => true,
            'codec_h263' => false,
            'codec_h263p' => true,
            PbxSettings::PBX_RECORD_SAVE_PERIOD => '90'
        ]
    ];

    public static function getSettings(string $key = 'default'): array
    {
        $settings = self::$settings[$key] ?? [];

        // Replace {date} placeholder with current date
        array_walk_recursive($settings, function (&$value) {
            if (is_string($value)) {
                $value = str_replace('{date}', date("Y-m-d H:i:s"), $value);
                $value = str_replace('{SSH_RSA_KEYS_SET}', $GLOBALS['SSH_RSA_KEYS_SET'], $value);
            }
        });

        return $settings;
    }
}
