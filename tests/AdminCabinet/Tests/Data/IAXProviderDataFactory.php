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
 * Factory class for IAX provider test data
 */
class IAXProviderDataFactory
{
    /**
     * IAX provider data storage
     * @var array
     */
    private static array $iaxProviderData = [
        'voxlink.iax' => [
            'type' => 'iax',
            'uniqid' => 'IAX-1683372799',
            'description' => 'VoxlinkIAX',
            'host' => 'vox.link.ru',
            'username' => 'line1',
            'password' => 'voxvoxSecret',
            'registration_type' => 'outbound', // Исходящая регистрация
            'noregister' => false,
            'receive_calls_without_auth' => false,
            'manualattributes' => '',
        ],
        'provider.iax.delete' => [
            'type' => 'iax',
            'uniqid' => 'IAX-1683372823',
            'description' => 'Provider IAX for delete',
            'host' => 'iax.delete.ru',
            'username' => 'providerName',
            'password' => 'providerPassword',
            'registration_type' => 'outbound',
            'receive_calls_without_auth' => false,
            'manualattributes' => '',
            'possibleToDelete' => true
        ],
        'provider.iax.inbound' => [
            'type' => 'iax',
            'uniqid' => 'IAX-1683372850',
            'description' => 'Inbound IAX Provider',
            'host' => 'test-INBOUND.miko.ru',
            'username' => 'IAX-TRUNK-93BE1B99',
            'password' => 'inboundSecret123',
            'registration_type' => 'inbound', // Входящая регистрация
            'receive_calls_without_auth' => true,
            'manualattributes' => 'language=ru',
        ],
        'provider.iax.noregistration' => [
            'type' => 'iax',
            'uniqid' => 'IAX-1683372875',
            'description' => 'No Registration IAX Provider',
            'host' => 'no-registration.miko.ru',
            'username' => 'IAX-TRUNK-93BE1B99',
            'password' => 'noRegSecret456',
            'registration_type' => 'none', // Без регистрации (IP аутентификация)
            'receive_calls_without_auth' => true,
            'manualattributes' => 'language=en',
        ]
    ];

    public static function getIAXProviderData(string $providerKey): array
    {
        if (!isset(self::$iaxProviderData[$providerKey])) {
            throw new \RuntimeException("IAX provider data not found for key: $providerKey");
        }
        return self::$iaxProviderData[$providerKey];
    }

    public static function getAllProviderKeys(): array
    {
        return array_keys(self::$iaxProviderData);
    }

    public static function getAllProviderData(): array
    {
        return self::$iaxProviderData;
    }
}