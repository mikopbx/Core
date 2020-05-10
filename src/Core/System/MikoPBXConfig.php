<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Config\RegisterDIServices;
use PDOException;

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
        if (null == $data) {
            $data = new PbxSettings();
            $data->writeAttribute("key", "$db_key");
        }

        $data->writeAttribute("value", "$value");

        return $data->save();
    }

    /**
     * Удаляет настройку из таблицы PbxSettings.
     *
     * @param $db_key
     *
     * @return bool
     */
    public function deleteGeneralSettings($db_key)
    {
        $data = PbxSettings::findFirst("key = '$db_key'");
        if (null == $data) {
            return true;
        }

        return $data->delete();
    }

    /**
     * Возвращает таймзону из настроек / либо дефолтное значение.
     *
     * @return string
     */
    public function getTimeZone()
    {
        $tz = trim($this->getGeneralSettings('PBXTimezone'));

        return $tz;
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
        $result = '';
        try {
            $result = $this->getGeneralSettingsPrivate($db_key);
        } catch (PDOException $e) {
            if ($e->errorInfo[1] == 17) {
                // Обновляем схему базыданных.
                RegisterDIServices::recreateDBConnections();
                $result = $this->getGeneralSettingsPrivate($db_key);
                // Если и тут будет исключение, то какая то другая, более грубая ошибка. Будем ловить...
            }
        }

        return $result;
    }

    private function getGeneralSettingsPrivate($db_key = '')
    {
        if ($db_key === '') {
            $result = PbxSettings::getAllPbxSettings();
        } else {
            $result = PbxSettings::getValueByKey("$db_key");
        }

        return $result;
    }

    /**
     * Возвращает из настроек адрес NTP сервера.
     *
     * @return string
     */
    public function getServerNTP()
    {
        $value = trim($this->getGeneralSettings('NTPServer'));

        return $value;
    }

}