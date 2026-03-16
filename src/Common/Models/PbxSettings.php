<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PBXSettings\PbxSettingsConstantsTrait;
use MikoPBX\Common\Models\PBXSettings\PbxSettingsDefaultValuesTrait;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di\Di;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class PbxSettings
 *
 * @method static mixed findFirstByKey(string $string)
 *
 * @package MikoPBX\Common\Models
 */
class PbxSettings extends ModelsBase
{
    use PbxSettingsConstantsTrait;
    use PbxSettingsDefaultValuesTrait;

    private const string CACHE_KEY = 'PbxSettings';

    /**
     * Returns Redis adapter with guaranteed correct database selection.
     *
     * In worker processes, the raw \Redis connection may have been switched
     * to a different database (e.g., DB 1 by RedisClientProvider). This method
     * ensures we always operate on ManagedCacheProvider::DATABASE_INDEX (DB 4).
     *
     * @return \Redis
     */
    private static function getRedisAdapter(): \Redis
    {
        $redis = Di::GetDefault()->getShared(ManagedCacheProvider::SERVICE_NAME)->getAdapter();
        try {
            $redis->select(ManagedCacheProvider::DATABASE_INDEX);
        } catch (\Throwable) {
            // Redis may not be ready during early boot
        }
        return $redis;
    }

    /**
     * Key by which the value is stored
     *
     * @Primary
     * @Column(type="string", nullable=false)
     */
    public string $key = '';

    /**
     * Stored value
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $value = null;


    /**
     *  Returns default or saved values for all predefined keys if it exists on DB
     * 
     * @param bool $useCache true - use cache, false - get from DB
     *
     * @return array
     */
    public static function getAllPbxSettings(bool $useCache = true): array
    {
        $getDefaultArrayValues = self::getDefaultArrayValues();
        $redis = self::getRedisAdapter();
        $currentSettings = [];

        if ($useCache) {
           $currentSettings = $redis->hgetall(self::CACHE_KEY) ?? [];
        }

        // If cache is empty or cache is disabled, load from database
        if ($currentSettings === [] || !$useCache) {
            $dbSettings = PbxSettings::find()->toArray();
            
            // Convert database records to key-value format
            $currentSettings = [];
            foreach ($dbSettings as $record) {
                $currentSettings[$record['key']] = $record['value'];
                // Update cache if using cache
                if ($useCache) {
                    $redis->hset(self::CACHE_KEY, $record['key'], $record['value']);
                }
            }
        }
        
        // Merge with default values (database/cache values override defaults)
        foreach ($currentSettings as $key => $value) {
            if (array_key_exists($key, $getDefaultArrayValues)) {
                $getDefaultArrayValues[$key] = $value;
            }
        }

        return $getDefaultArrayValues;
    }

    /**
     * Returns default or saved value for key if it exists on DB
     *
     * @param $key string value key
     * @param bool $useCache true - use cache, false - get from DB
     * 
     * @return string
     */
    public static function getValueByKey(string $key, bool $useCache = true): string
    {
        $value = 'UNKNOWN KEY ADD IT TO DEFAULT VALUES';
        $keyExistsInRedis = false;
        $keyExistsInDB = false;
        
        try {
            if ($useCache) {
                $redis = self::getRedisAdapter();
                $keyExistsInRedis = $redis->hexists(self::CACHE_KEY, $key);
                
                if ($keyExistsInRedis) {
                    $value = $redis->hget(self::CACHE_KEY, $key);
                }
            }
            
            if (!$keyExistsInRedis) {
                $currentSettings = PbxSettings::findFirstByKey($key);
                
                if ($currentSettings) {
                    $value = $currentSettings->value;
                    $keyExistsInDB = true;
                }
            }
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }
        
        if (!$keyExistsInRedis && !$keyExistsInDB) {
            $arrOfDefaultValues = self::getDefaultArrayValues();
            if (array_key_exists($key, $arrOfDefaultValues)) {
                $value = $arrOfDefaultValues[$key];
            }
        } elseif ($useCache) {
            $redis->hset(self::CACHE_KEY, $key, $value);
        }
        return $value;
    }

    /**
     * Set value for a key
     * @param $key string settings key
     * @param $value string value
     * @param $messages array error messages
     * @return bool Whether the save was successful or not.
     */
    public static function setValueByKey(string $key, string $value, array &$messages = []): bool
    {
        $record = self::findFirstByKey($key);
        if ($record === null) {
            $record = new self();
            $record->key = $key;
        }
        if (isset($record->value) && $record->value === $value) {
            return true;
        }
        $record->value = $value;
        $result = $record->save();
        if (!$result) {
            foreach ($record->getMessages() as $message) {
                $messages[] = $message->getMessage();
            }
        } else {
            $redis = self::getRedisAdapter();
            $redis->hset(self::CACHE_KEY, $key, $value);
        }
        return $result;
    }

     /**
     * Resets a general setting value.
     *
     * @param string $db_key The key of the general setting to be reset.
     *
     * @return bool True if the value was successfully reset to default, false otherwise.
     */
    public static function resetValueToDefault(string $key): bool
    {
        $data = PbxSettings::findFirstByKey($key);
        if (null === $data) {
            return true;
        }
        $data->value = PbxSettings::getDefaultArrayValues()[$key]??'';

        $redis = self::getRedisAdapter();
        
        $result =  $data->update();
        if ($result) {
            $redis->hset(self::CACHE_KEY, $key, $data->value);
        }
        return $result;
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'key',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisKeyMustBeUniqueForPbxSettingsModels'),
                ]
            )
        );

        // Validate port values (must be in range 1-65535)
        $portKeys = [
            self::WEB_PORT,
            self::WEB_HTTPS_PORT,
            self::SSH_PORT,
            self::SIP_PORT,
            self::TLS_PORT,
            self::EXTERNAL_SIP_PORT,
            self::EXTERNAL_TLS_PORT,
            self::IAX_PORT,
            self::AMI_PORT,
            self::AJAM_PORT,
            self::AJAM_PORT_TLS,
            self::RTP_PORT_FROM,
            self::RTP_PORT_TO,
            self::MAIL_SMTP_PORT,
        ];

        if (in_array($this->key, $portKeys, true)) {
            $port = (int)$this->value;
            if ($port < 1 || $port > 65535) {
                $this->appendMessage(
                    new \Phalcon\Messages\Message(
                        "Port value must be between 1 and 65535, got: {$this->value}",
                        'value',
                        'PortRange'
                    )
                );
                return false;
            }
        }

        return $this->validate($validation);
    }
}
