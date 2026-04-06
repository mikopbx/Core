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

/**
 * Factory class for Audio Files test data
 */
class AudioFilesDataFactory
{
    private const string AUDIO_BASE_PATH = 'C:\Users\hello\Documents\audio';

    private static array $audioFiles = [
        'first.audio' => [
            'name' => 'The first audio record',
            'filename' => '250Hz_44100Hz_16bit_05sec.wav',
            'description' => '250Hz Test Tone',
            'type' => 'custom',
            'for_delete' => false
        ],
        'second.audio' => [
            'name' => 'The second audio record',
            'filename' => 'blind_willie.mp3',
            'description' => 'Blues Music',
            'type' => 'custom',
            'for_delete' => false
        ],
        'third.audio' => [
            'name' => 'The third audio record',
            'filename' => 'first_noel.mp3',
            'description' => 'Christmas Music',
            'type' => 'custom',
            'for_delete' => false
        ],
        'fourth.audio' => [
            'name' => 'The fourth audio record',
            'filename' => 'first_noel.mp3',
            'description' => 'Christmas Music (For Delete)',
            'type' => 'custom',
            'for_delete' => true
        ],
        'miko_hello.audio' => [
            'id'=>'1',
            'path'=>'/storage/usbdisk1/mikopbx/media/custom/miko_hello',
            'name' => 'miko_hello',
            'filename' => 'blind_willie.mp3',
            'description' => '',
            'type' => 'custom',
            'for_delete' => false
        ]
    ];

    public static function getAudioFileData(string $key): array
    {
        if (!isset(self::$audioFiles[$key])) {
            throw new \RuntimeException("Audio file data not found for key: $key");
        }

        $data = self::$audioFiles[$key];
        $data['path'] = self::AUDIO_BASE_PATH . '\\' . $data['filename'];

        return $data;
    }

    public static function getAllAudioFileKeys(): array
    {
        return array_keys(self::$audioFiles);
    }

    public static function getNonDeleteAudioFileKeys(): array
    {
        return array_keys(array_filter(
            self::$audioFiles,
            fn($data) => !$data['for_delete']
        ));
    }

    public static function getDeleteAudioFileKeys(): array
    {
        return array_keys(array_filter(
            self::$audioFiles,
            fn($data) => $data['for_delete']
        ));
    }
}
