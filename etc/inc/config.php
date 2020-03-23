<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once("globals.php");

/**
 * Class Config
 */
class Config{

    /**
     * Возвращает массив общих настроек АТС.
     * @param string $db_key
     * @return array|string
     */
    public function get_general_settings($db_key = ''){
        $result = '';
        try{
            $result = $this->get_general_settings_private($db_key);
        }catch (PDOException $e){
            if($e->errorInfo[1]==17 ){
                // Обновляем схему базыданных.
                init_db($GLOBALS['g']['m_di'], $GLOBALS['g']['phalcon_settings']);
                $result = $this->get_general_settings_private($db_key);
                // Если и тут будет исключение, то какая то другая, более грубая ошибка. Будем ловить...
            }
        }
        return $result;
	}

    private function get_general_settings_private($db_key = ''){
        if($db_key == ''){
            $result = Models\PbxSettings::getAllPbxSettings();
        }else{
            $result = Models\PbxSettings::getValueByKey("$db_key");
        }
        return $result;
    }

        /**
     * Сохранение основных настроек станции.
     * @param $db_key
     * @param $value
     * @return mixed
     */
	public function set_general_settings($db_key, $value){
        $data = Models\PbxSettings::findFirst("key = '$db_key'");
        if(null == $data){
            $data = new Models\PbxSettings();
            $data->writeAttribute("key", "$db_key");
        }

        $data->writeAttribute("value", "$value");
        return $data->save();
    }

    /**
     * Удаляет настройку из таблицы PbxSettings.
     * @param $db_key
     * @return bool
     */
    public function delete_general_settings($db_key){
        $data = Models\PbxSettings::findFirst("key = '$db_key'");
        if(null == $data){
            return true;
        }
        return $data->delete();

    }

    /**
     * Возвращает таймзону из настроек / либо дефолтное значение.
     * @return string
     */
    public function getTimeZone(){
        $tz = trim($this->get_general_settings('PBXTimezone'));
        return $tz;
    }

    /**
     * Возвращает из настроек адрес NTP сервера.
     * @return string
     */
    public function getServerNTP(){
        $value = trim($this->get_general_settings('NTPServer'));
		return $value;
	}

    static function get_pickupexten(){
        return '*8';
    }

    static function get_voicemail_exten(){
        return '*001';
    }

}