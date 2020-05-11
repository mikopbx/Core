<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;

/**
 * Class Config
 */
class MikoPBXConfig
{


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
            $result = PbxSettings::getAllPbxSettings();
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