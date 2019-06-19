<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Models\SoundFiles;
use Phalcon\Text;

class SoundFilesController extends BaseController {


	/**
	 * Построение списка файлов
	 */
	public function indexAction() {

		$files = SoundFiles::find();

		$this->view->files = $files;

	}


	/**
	 * Открытие карточки редактирования Файла записи
	 *
	 * @param string $id редактируемой записи
	 */
	public function modifyAction( string $id = NULL ) {
		$file = SoundFiles::findFirstById( $id );
		if (!$file) {
			$file = new SoundFiles();
		}

		$form                  = new SoundFilesEditForm( $file );
		$this->view->form      = $form;
		$this->view->audioPath = empty($file->path)?'':"/pbxcore/api/cdr/playback?view={$file->path}";

	}


	/**
	 * Сохранение параметров переопределения системного файла
	 * @return void
	 */
	public function saveAction(){
		if (!$this->request->isPost()) {
			return;
		}
		$data = $this->request->getPost();

		$soundFile = SoundFiles::findFirstById( $data['id'] );
		if ( $soundFile === FALSE ) {
			$soundFile = new SoundFiles();
		}

		foreach ( $soundFile as $name => $value ) {
			switch ($name ) {
				case "id":
					break;
				default:
					if (!array_key_exists($name, $data)) {
						continue;
					}
					$soundFile->$name = $data[ $name];
			}
		}

		if ( $soundFile->save() === FALSE ) {
			$errors = $soundFile->getMessages();
			$this->flash->error(implode('<br>', $errors));
			$this->view->success = false;
		} else {
			$this->flash->success($this->translation->_('ms_SuccessfulSaved'));
			$this->view->success = true;
			// Если это было создание карточки то надо перегрузить страницу с указанием ID
			if ( empty( $data['id'] ) ) {
				$this->view->reload = "sound-files/modify/{$soundFile->id}";
			}
		}
	}

	/**
	 * Удаление файла по его ID
	 *
	 * @param string $id
	 */
	public function deleteAction( string $id = NULL ) {
		$soundFile = SoundFiles::findFirstById( $id );
		$errors   = FALSE;
		if ( $soundFile && ! $soundFile->delete() ) {
			$errors = $soundFile->getMessages();
		}
		if ( $errors ) {
			$this->flash->error( implode( '<br>', $errors ) );
			$this->view->success = FALSE;
		} else {
			$this->view->success = TRUE;
		}
	}

	/**
	 * Получение полного пути к файлу по его ID
	 *
	 * @param string $id
	 */
	public function getPathByIdAction( string $id = NULL ) {
		$soundFile = SoundFiles::findFirstById( $id );
		if ( $soundFile ) {
			$this->view->message = $soundFile->path;
			$this->view->success = TRUE;
		} else {
			$this->view->success = FALSE;
		}
	}

}