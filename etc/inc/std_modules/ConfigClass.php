<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */

class ConfigClass {
	// Директория конфигурационных файлов Asterisk;
	protected $astConfDir = '/etc/asterisk';
	// Ссылка на глобальные натсройки.
	protected $g;
	// Описание класса (имя конф. файла).
    protected   $description;

    /**
     * ConfigClass constructor.
     * @param $g
     * @param bool $debug
     */
	function __construct(&$g, $debug = false) {
		$this->g = &$g;
		$this->getSettings();
		unset($debug);
	}

	/**
     * Вывод сообщения о генерации конфига.
	 */
    protected function echoGenerateConfig(){
        if($this->g['booting'] == TRUE && $this->description != null)
            echo "   |- generate config {$this->description}... ";
    }

    /**
     * Вывод сообщения об окончании генерации.
     */
    protected function echoDone(){
        if($this->g['booting'] == TRUE && $this->description != null)
            echo "\033[32;1mdone\033[0m \n";
    }

	// Настройки для текущего класса.
	// Метод вызывается при создании объекта. 	
	public function getSettings(){}
	
	// Генерация конфигурационного файла asterisk.
	// $general_settings - массив глобальных настроек. 	
	public function generateConfig($general_settings){
		// Генерация конфигурационных файлов. 
        $this->echoGenerateConfig();
		$this->generateConfigProtected($general_settings);
        $this->echoDone();
	}

    protected function generateConfigProtected($general_settings){

    }
	
	// Получаем строки include для секции internal. 
	public function getIncludeInternal(){
		// Генерация внутреннего номерного плана. 
		$result = '';
		return $result;
	}

	// Получаем строки include для секции internal-transfer. 
	public function getIncludeInternalTransfer(){
		// Генерация внутреннего номерного плана. 
		$result = '';
		return $result;
	}
	
	// Генератор extension для контекста internal.
	public function extensionGenInternal(){
		// Генерация внутреннего номерного плана. 
		$result = '';
		return $result;
	}
	
	// Генератор extension для контекста internal.
	public function extensionGenInternalTransfer(){
		// Генерация внутреннего номерного плана.
		$result = '';
		return $result;
	}

    /**
     * Опираясь на ID учетной записи возвращает имя технологии SIP / IAX2.
     * @param  string $id
     * @return string
     */
    public function getTechByID($id):string {
        unset($id);
        // Генерация внутреннего номерного плана.
        $result = '';
        return $result;
    }
    // Генератор extension для контекста peers.
    public function extensionGenPeerContexts(){
        // Генерация внутреннего номерного плана.
        $result = '';
        return $result;
    }

	// Генератор extensions, дополнительные контексты.	
	public function extensionGenContexts(){
		$result = '';
		return $result;
	}

	// Генератор хинтов для контекста internal-hints
	public function extensionGenHints(){
		// Генерация хинтов. 
		$result = '';
		return $result;
	}

	// Секция global для extensions.conf.
	public function extensionGlobals(){
		// Генерация хинтов. 
		$result = '';
		return $result;
	}
	
	// Секция featuremap для features.conf
	public function getfeaturemap(){
		// Возвращает старкоды. 
		return '';	
	}

    /**
     * Генерация контекста для публичных звонков.
     * @return string
     */
	public function generatePublicContext(){
        // Возвращает старкоды.
        return '';
    }

    /**
     * Проверка работы сервисов.
     */
    public function test(){
        return ['result' => true];
    }

    /**
     * Генерация конфига, рестарт работы модуля.
     * Метод вызывается после рестарта NATS сервера.
     */
    public function on_nats_reload(){
        return true;
    }

    /**
     * Перезапуск сервисов модуля.
     * @return bool
     */
    public function reload_services(){
        return true;
    }

    /**
     * Будет вызван после старта asterisk.
     */
    public function on_after_pbx_started(){

    }

    /**
     * Добавление задач в crond.
     * @param $tasks
     */
    public function create_cron_tasks(& $tasks){

    }

    /**
     * Модули: Выполнение к-либо действия.
     * @param $req_data
     * @return array
     */
    public function custom_action($req_data){
        $result = [
            'result' => 'ERROR',
            'data'   =>  $req_data
        ];
        return $result;
    }

    /**
     * Генератор сеции пиров для sip.conf
     * @return string
     */
    public function generate_peers($param){
        unset($param);
        return '';
    }

    /**
     * Генератор сеции пиров для sip.conf
     * @return string
     */
    public function generate_peers_pj($param){
        unset($param);
        return '';
    }

    /**
     * Генератор сеции пиров для manager.conf
     * @return string
     */
    public function generate_manager($param){
        unset($param);
        return '';
    }

    /**
     * Дополнительные параметры для
     * @param $peer
     * @return string
     */
    public function generate_peer_pj_additional_options($peer):string {

        return '';
    }

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     * @param $peer
     * @return string
     */
    public function generate_out_rout_context($rout):string {

        return '';
    }
    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     * @param $peer
     * @return string
     */
    public function generate_out_rout_after_dial_context($rout):string {

        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     * @param $peer
     * @return string
     */
    public function generate_incoming_rout_after_dial_context($id):string {

        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     * @param $peer
     * @return string
     */
    public function generate_incoming_rout_before_dial($rout_number):string {

        return '';
    }

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     */
    public function models_event_change_data($data):void {

    }

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     * @param $modified_tables
     */
    public function models_event_need_reload($modified_tables):void {

    }

}