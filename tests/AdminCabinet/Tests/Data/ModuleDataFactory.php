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
 * Factory class for Module installation test data
 */
class ModuleDataFactory
{
    /**
     * Module data storage
     * @var array
     */
    private static array $moduleData = [
        'autoprovision' => [
            'moduleId' => 'ModuleAutoprovision',
            'enable' => false,
        ],
        'backup' => [
            'moduleId' => 'ModuleBackup',
            'enable' => true,
        ],
        'cti.client' => [
            'moduleId' => 'ModuleCTIClient',
            'enable' => false,
        ],
        'docker' => [
            'moduleId' => 'ModuleDocker',
            'enable' => false,
        ],
        'phonebook' => [
            'moduleId' => 'ModulePhoneBook',
            'enable' => true,
        ],
        'smart.ivr' => [
            'moduleId' => 'ModuleSmartIVR',
            'enable' => true,
        ],
        'telegram.notify' => [
            'moduleId' => 'ModuleTelegramNotify',
            'enable' => false,
        ],
        'users.groups' => [
            'moduleId' => 'ModuleUsersGroups',
            'enable' => true,
        ]
    ];

    public static function getModuleData(string $moduleKey): array
    {
        if (!isset(self::$moduleData[$moduleKey])) {
            throw new \RuntimeException("Module data not found for key: $moduleKey");
        }
        return self::$moduleData[$moduleKey];
    }

    public static function getAllModuleKeys(): array
    {
        return array_keys(self::$moduleData);
    }
}