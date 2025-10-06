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
 * Factory class for IVR menu test data
 */
class IVRMenuDataFactory
{
    /**
     * IVR menu data storage
     * @var array
     */
    private static array $ivrMenuData = [
        'second.ivr.menu' => [
            'description' => 'Second level IVR menu, with extra menu items',
            'name' => 'Second IVR menu',
            'audio_message_id' => '1',
            'menuItems' => [
                '1' => '10003246',
                '2' => '000063',
                '3' => '000064',
            ],
            'number_of_repeat' => 2,
            'timeout' => 15,
            'timeout_extension' => '202',
            'allow_enter_any_internal_extension' => true,
            'extension' => 30021
        ],
        'main.ivr.menu' => [
            'description' => 'First level IVR menu, with agents numbers and another IVR menu included',
            'name' => 'Main IVR menu',
            'audio_message_id' => '1',
            'menuItems' => [
                '1' => '20021',
                '2' => '202',
                '3' => '203',
            ],
            'number_of_repeat' => 3,
            'timeout' => 20,
            'timeout_extension' => '201',
            'allow_enter_any_internal_extension' => false,
            'extension' => 20020
        ]
    ];

    /**
     * Get IVR menu data by key
     *
     * @param string $menuKey Menu identifier
     * @return array Menu data
     * @throws \RuntimeException If menu data not found
     */
    public static function getIVRMenuData(string $menuKey): array
    {
        if (!isset(self::$ivrMenuData[$menuKey])) {
            throw new \RuntimeException("IVR menu data not found for key: $menuKey");
        }
        return self::$ivrMenuData[$menuKey];
    }

    /**
     * Get all menu keys
     *
     * @return array List of menu keys
     */
    public static function getAllMenuKeys(): array
    {
        return array_keys(self::$ivrMenuData);
    }

    /**
     * Get all menu data
     *
     * @return array All menu data
     */
    public static function getAllMenuData(): array
    {
        return self::$ivrMenuData;
    }
}
