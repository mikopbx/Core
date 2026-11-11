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

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Encryption\Crypt;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Encryption\Security\Random;

/**
 * Initializes Crypt provider for cookie and session encryption
 *
 * Shared between AdminCabinet and REST API contexts.
 * Uses encryption key from PbxSettings database.
 *
 * @package MikoPBX\Common\Providers
 */
class CryptProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'crypt';

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
     * Retrieve the per-installation encryption key, generating and storing it on first use.
     *
     * WWW_ENCRYPTION_KEY has no default value, so getValueByKey() answers with the non-empty
     * PbxSettings::UNKNOWN_KEY_VALUE for a missing key. That placeholder must never be used as
     * the key: it is the same on every installation and published in the sources.
     *
     * @return string The encryption key.
     */
    private static function getEncryptionKey(): string
    {
        $encryptionKey = PbxSettings::getValueByKey(PbxSettings::WWW_ENCRYPTION_KEY);
        if (self::isUsableKey($encryptionKey)) {
            return $encryptionKey;
        }

        // 32 hex chars = 32 bytes, the key length of Crypt's default aes-256 cipher.
        // random_bytes() throws instead of degrading; a predictable fallback key is worse than a failure.
        $candidateKey = (new Random())->hex(16);
        $storedKey = self::storeKeyIfMissing($candidateKey);
        if ($storedKey !== null) {
            return $storedKey;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'Could not persist ' . PbxSettings::WWW_ENCRYPTION_KEY
            . '; auth cookies issued by this request will not be readable by the next one',
            LOG_ERR
        );
        return $candidateKey;
    }

    /**
     * Store the key unless a usable one is already there, then return the stored key.
     *
     * Compare-and-swap in SQL instead of PbxSettings::setValueByKey(): a model save() turns
     * into an UPDATE once a concurrent request has inserted the row, so the second of two
     * first requests would overwrite the key the first one already used for its cookie.
     *
     * @param string $candidateKey Freshly generated key.
     * @return string|null The key now stored in the database, or null if none could be stored.
     */
    private static function storeKeyIfMissing(string $candidateKey): ?string
    {
        $model = new PbxSettings();
        $table = $model->getSource();
        $bind = [
            'key' => PbxSettings::WWW_ENCRYPTION_KEY,
            'value' => $candidateKey,
            'placeholder' => PbxSettings::UNKNOWN_KEY_VALUE,
        ];
        try {
            $connection = $model->getWriteConnection();
            $connection->execute(
                "INSERT OR IGNORE INTO $table (\"key\", value) VALUES (:key, :value)",
                ['key' => $bind['key'], 'value' => $bind['value']]
            );
            $connection->execute(
                "UPDATE $table SET value = :value WHERE \"key\" = :key"
                . " AND (value IS NULL OR value = '' OR value = :placeholder)",
                $bind
            );
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to store encryption key: ' . $e->getMessage(), LOG_ERR);
        }

        $storedKey = PbxSettings::getValueByKey(PbxSettings::WWW_ENCRYPTION_KEY, false);
        if (!self::isUsableKey($storedKey)) {
            return null;
        }
        // The value is unchanged here, so this only refreshes the Redis settings cache.
        PbxSettings::setValueByKey(PbxSettings::WWW_ENCRYPTION_KEY, $storedKey);
        return $storedKey;
    }

    /**
     * Check that a stored value is a real key, not empty and not the missing-key placeholder.
     *
     * @param string $key Value read from PbxSettings.
     * @return bool
     */
    private static function isUsableKey(string $key): bool
    {
        return $key !== '' && $key !== PbxSettings::UNKNOWN_KEY_VALUE;
    }
}
