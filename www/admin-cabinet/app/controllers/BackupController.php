<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\BackupRules;

class BackupController extends BaseController {

	private $whatBackupTpl;

	/**
	 * Инициализация базового класса
	 */
	public function initialize() {
		$this->whatBackupTpl = [
			'backup-config'      => '1',
			'backup-cdr'         => '1',
			'backup-records'     => '1',
			'backup-sound-files' => '1',
		];
		parent::initialize();
	}

	/**
	 * Список доступных для скачивания бекапов
	 *
	 */
	public function indexAction() {

	}

	/**
	 * Форма мгновенного создания бекапа
	 *
	 */
	public function createAction() {
		$whatBackup             = $this->whatBackupTpl;
		$this->view->form       = new BackupCreateForm( NULL, $whatBackup );
		$this->view->whatBackup = $whatBackup;
		$this->view->submitMode = NULL;
	}

	/**
	 * Форма восстановления из бекапа
	 *
	 */
	public function restoreAction() {
		$this->view->form = new BackupRestoreForm();
		$this->view->submitMode = NULL;
	}

	/**
	 * Форма настройки автоматического бекапа
	 *
	 */
	public function automaticAction() {
		$entity = BackupRules::findFirst();
		if ( $entity === FALSE ) {
			$entity                      = new BackupRules();
			$entity->what_backup         = json_encode( $this->whatBackupTpl );
			$entity->at_time             = "0:00";
			$entity->keep_older_versions = 3;
		}

		$weekDays = [ '0' => $this->translation->_( "bkp_EveryDay" ) ];
		for ( $i = "1"; $i <= 7; $i ++ ) {
			$weekDays[ $i ] = $this->translation->_( date( 'D',
				strtotime( "Sunday +{$i} days" ) ) );
		}
		$this->view->form = new BackupAutomaticForm( $entity,
			[ 'week-days' => $weekDays ] );
		$whatBackup       = json_decode( $entity->what_backup, TRUE );
		foreach ( $this->whatBackupTpl as $key => $value ) {
			if ( ! key_exists( $key, $whatBackup ) ) {
				$whatBackup[ $key ] = $value;
			}
		}
		$this->view->formbackup = new BackupCreateForm( NULL, $whatBackup );
		$this->view->whatBackup = $whatBackup;
		$this->view->submitMode = NULL;
	}

	/**
	 * Удаление файла бекпапа
	 *
	 */
	public function deleteAction() {

	}

	/**
	 * Скачивание бекапа через браузер
	 *
	 */
	public function downloadAction() {

	}

	/**
	 * Сохранение настроек автоматического резервного копирования
	 *
	 */
	public function saveAction() {
		if ( ! $this->request->isPost() ) {
			return $this->forward( 'backup/automatic' );
		}

		$data = $this->request->getPost();
		$rule = BackupRules::findFirst();
		if ( ! $rule ) {
			$rule = new BackupRules();
		}
		// Пройдемся по полям базы данных
		foreach ( $rule as $name => $value ) {
			switch ( $name ) {
				case "id":
				case "what_backup":
					break;
				case "enabled":
				case "ftp_sftp_mode":
					if ( array_key_exists( $name, $data ) ) {
						$rule->$name = ( $data[ $name ] == 'on' ) ? "1" : "0";
					} else {
						$rule->$name = "0";
					}
					break;
				default:
					$rule->$name = $data[ $name ];
			}
		}
		// Пройдемся по чекбоксам того что нужно сохранять и сформируем JSON
		$what_backup = [];
		foreach ( $data as $name => $value ) {
			if ( strpos( $name, 'backup-' ) === 0 ) {
				$what_backup[ $name ] = ( $data[ $name ] == 'on' ) ? "1" : "0";
			}
		}
		$rule->what_backup = json_encode( $what_backup );
		if ( ! $rule->save() ) {
			$errors = $rule->getMessages();
			$this->flash->error( implode( '<br>', $errors ) );
		}
	}
}