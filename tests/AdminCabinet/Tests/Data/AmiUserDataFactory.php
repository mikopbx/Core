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
 * Factory class for AMI user test data
 */
class AmiUserDataFactory
{
    /**
     * AMI user data storage
     * @var array
     */
    private static array $amiUserData = [
        'first.ami.user' => [
            'description' => 'The first ami user',
            'username' => 'firstAmiUser4Test',
            'secret' => 'theBigBigSecretWith#And%',
            'permissions' => [
                'call' => 'read',
                'originate' => 'readwrite',
                'agent' => 'write',
                'dialplan' => 'readwrite',
                'log' => 'read',
                'user' => 'readwrite',
                'cdr' => 'read',
                'reporting' => 'readwrite',
                'config' => 'readwrite',
                'dtmf' => 'readwrite',
                'system' => 'readwrite',
                'command' => 'readwrite',
                'verbose' => 'read'
            ]
        ],
        'second.ami.user' => [
            'description' => 'The second one user',
            'username' => 'secondAmiUser4Test',
            'secret' => 'theBigBigSecretWith#And%and$',
            'permissions' => [
                'call' => '',
                'originate' => 'readwrite',
                'agent' => 'write',
                'dialplan' => 'write',
                'log' => 'readwrite',
                'user' => 'read',
                'cdr' => '',
                'reporting' => 'read',
                'config' => 'read',
                'dtmf' => 'read',
                'system' => 'read',
                'command' => 'read',
                'verbose' => 'read'
            ]
        ]
    ];

    public static function getAmiUserData(string $userKey): array
    {
        if (!isset(self::$amiUserData[$userKey])) {
            throw new \RuntimeException("AMI user data not found for key: $userKey");
        }
        return self::$amiUserData[$userKey];
    }

    public static function getAllUserKeys(): array
    {
        return array_keys(self::$amiUserData);
    }

    public static function getAllUserData(): array
    {
        return self::$amiUserData;
    }
}
