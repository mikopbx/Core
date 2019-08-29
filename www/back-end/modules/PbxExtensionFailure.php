<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2019
 */

namespace Modules;
use Util;


class PbxExtensionFailure extends PbxExtensionBase {

	/**
	 * PbxExtensionSetup constructor.
	 * @param $moduleUniqID string - ID модуля, файлы которого удалены, или недоступны
	 */
	public function __construct($moduleUniqID){
		$this->version     		= '';
		$this->min_pbx_version 	= '7.0.0.0'; // Меняем руками если появляются явные зависимости от версии PBX
		$this->module_uniqid 	= $moduleUniqID;
		$this->developer	 	= '';
		$this->support_email 	= '';
		parent::__construct();
	}


	/**
	 * Создает структуру для хранения настроек модуля в своей модели
	 * и заполняет настройки по-умолчанию если таблицы не было в системе
	 * см (unInstallDB)
	 *
	 * Регистрирует модуль в PbxExtensionModules
	 *
	 * @return bool результат установки
	 */
	protected function installDB() :bool{
		return TRUE;
	}

	/**
	 * Выполняет копирование необходимых файлов, в папки системы
	 *
	 * @return bool результат установки
	 */
	protected function installFiles() :bool{
		return TRUE;
	}

	/**
	 * Удаляет запись о модуле из PbxExtensionModules
	 * Удаляет свою модель
	 *
	 * @param  $keepSettings - оставляет таблицу с данными своей модели
	 *
	 * @return bool результат очистки
	 */
	protected function unInstallDB( $keepSettings = FALSE ) :bool{

		return $this->unregisterModule();
	}

	/**
	 * Выполняет удаление своих файлов с остановной процессов
	 * при необходимости
	 *
	 * @return bool результат удаления
	 */
	protected function unInstallFiles() :bool{
		Util::mwexec("rm -rf {$this->moduleDir}");
		return TRUE;
	}

	/**
	 * Выполняет активацию триалов, проверку лицензионного клчюча
	 *
	 * @return bool результат активации лицензии
	 */
	protected function activateLicense() :bool{
		return TRUE;
	}

}