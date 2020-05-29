<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di;

/**
 * Class Config
 */
class MikoPBXConfig
{
    private $di;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di = Di::getDefault();
    }


    public function getPickupExten(): string
    {
        return '*8';
    }

    public function getVoicemailExten(): string
    {
        return '*001';
    }

    /**
     * Сохранение основных настроек станции.
     *
     * @param $db_key
     * @param $value
     *
     * @return mixed
     */
    public function setGeneralSettings($db_key, $value)
    {
        $data = PbxSettings::findFirst("key = '$db_key'");
        if (null === $data) {
            $data = new PbxSettings();
            $data->writeAttribute("key", $db_key);
        }

        $data->writeAttribute("value", $value);

        return $data->save();
    }

    /**
     * Удаляет настройку из таблицы PbxSettings.
     *
     * @param $db_key
     *
     * @return bool
     */
    public function deleteGeneralSettings($db_key): bool
    {
        $data = PbxSettings::findFirst("key = '$db_key'");
        if (null === $data) {
            return true;
        }

        return $data->delete();
    }

    /**
     * Возвращает таймзону из настроек / либо дефолтное значение.
     *
     * @return string
     */
    public function getTimeZone(): string
    {
        return trim($this->getGeneralSettings('PBXTimezone'));
    }

    /**
     * Возвращает массив общих настроек АТС.
     *
     * @param string $db_key
     *
     * @return array|string
     */
    public function getGeneralSettings($db_key = '')
    {
        if ($db_key === '') {
            $cacheKey = 'PbxSettings.getGeneralSettings';
            $managedCache = $this->di->getShared('managedCache');
            $settings = $managedCache->get($cacheKey);
            if ($settings!==null && is_array($settings)){
                return $settings;
            }
            $result = PbxSettings::getAllPbxSettings();
            if ($cacheKey) {
                $managedCache->set($cacheKey, $result, 3600);
            }
        } else {
            $result = PbxSettings::getValueByKey($db_key);
        }
        return $result;
    }

    /**
     * Возвращает из настроек адрес NTP сервера.
     *
     * @return string
     */
    public function getServerNTP(): string
    {
        return trim($this->getGeneralSettings('NTPServer'));
    }

}