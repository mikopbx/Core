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

declare(strict_types=1);


namespace MikoPBX\AdminCabinet\Providers;


use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use Phalcon\Crypt;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Security\Random;

/**
 * Initializes Crypt provider
 *
 * @package MikoPBX\AdminCabinet\Providers
 */
class CryptProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'crypt';

    /**
     * Register elements service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $encryptionKey = self::getEncryptionKey();
                $crypt = new Crypt();
                // Set a global encryption key
                $crypt->setKey(
                    $encryptionKey
                );
                return $crypt;
            }
        );
    }

    /**
     * Retrieve the encryption key from settings.
     * Generate a new one if it doesn't exist.
     *
     * @return string The encryption key.
     */
    private static function getEncryptionKey():string
    {
        $encryptionKey   = PbxSettings::getValueByKey(PbxSettingsConstants::WWW_ENCRYPTION_KEY);
        if (empty($encryptionKey)){
            $record = PbxSettings::findFirstByKey(PbxSettingsConstants::WWW_ENCRYPTION_KEY);
            if ($record===null){
                $random = new Random();
                try {
                    // Try generating a new encryption key.
                    $encryptionKey = $random->base64Safe(16);
                } catch (\Throwable $e) {
                    // If something goes wrong, fall back to a default encryption key.
                    $encryptionKey = md5(microtime());
                }
                $record = new PbxSettings();
                $record->key = PbxSettingsConstants::WWW_ENCRYPTION_KEY;
                $record->value = $encryptionKey;
                $record->save();
            }
        }
        return $encryptionKey;
    }
}