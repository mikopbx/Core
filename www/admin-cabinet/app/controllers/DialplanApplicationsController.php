<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Models\DialplanApplications,
	Models\Extensions;


class DialplanApplicationsController extends BaseController {


	/**
	 * Построение списка файлов
	 */
	public function indexAction () {
		$apps = DialplanApplications::find();

		$this->view->apps = $apps;
	}

	/**
	 * Форма настроек DialplanApplications
	 *
	 * @param string $uniqid идентификатор редактируемого Dialplan Application
	 */
	public function modifyAction ( string $uniqid = NULL ) {
		$app = DialplanApplications::findFirstByUniqid( $uniqid );
		if ( ! $app ) {
			$app            = new DialplanApplications();
			$app->uniqid    = strtoupper( 'DIALPLAN-APP-' . md5( $app->id . time() ) );
			$app->type      = "php";
			$app->extension = Extensions::getNextFreeApplicationNumber();
		}

		$form                         = new DialplanApplicationEditForm( $app );
		$this->view->applicationLogic = $app->getApplicationlogic();
		$this->view->form             = $form;
		$this->view->represent        = $app->getRepresent();

	}


	/**
	 * Сохраенение настроек Dialplan Applications
	 */
	public function saveAction () {
		if ( ! $this->request->isPost() ) {
			return;
		}

		$this->db->begin();

		$data      = $this->request->getPost();
		$appRecord = DialplanApplications::findFirstByUniqid( $data['uniqid'] );
		if ($appRecord == FALSE ) {
			$appRecord = new DialplanApplications();

			$extension                    = new Extensions();
			$extension->type              = "DIALPLAN APPLICATION";
			$extension->number            = $data["extension"];
			$extension->callerid          = parent::transliterate( $data["name"] );
			$extension->userid            = NULL;
			$extension->show_in_phonebook = 0;
			$extension->public_access     = 0;

		} else {
			$extension = $appRecord->Extensions;
		}

		// Заполним параметры внутреннего номера
		if ( ! $this->updateExtension( $extension, $data ) ) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры пользователя
		if ( ! $this->updateDialplanApplication( $appRecord, $data ) ) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		$this->flash->success( $this->translation->_( 'ms_SuccessfulSaved' ) );
		$this->view->success = TRUE;
		$this->db->commit();

		// Если это было создание карточки то надо перегрузить страницу с указанием ID
		if ( empty( $data['id'] ) ) {
			$this->view->reload = "dialplan-applications/modify/{$data['uniqid']}";
		}
	}

	/**
	 * Удаление приложения
	 *
	 * @param string|NULL $uniqid идентификатор редактируемого Dialplan Application
	 */
	public function deleteAction ( string $uniqid = NULL ) {
		$this->db->begin();
		$appRecord = DialplanApplications::findFirstByUniqid( $uniqid );

		$errors = FALSE;
		if ( $appRecord->Extensions && ! $appRecord->Extensions->delete() ) {
			$errors = $appRecord->Extensions->getMessages();
		}

		if ( $errors ) {
			$this->flash->warning( implode( '<br>', $errors ) );
			$this->db->rollback();
		} else {
			$this->db->commit();
		}

		return $this->forward( 'dialplan-applications/index' );
	}


	/**
	 * Обновление параметров приложения
	 *
	 * @param \Models\DialplanApplications $application
	 * @param array                        $data массив полей из POST запроса
	 *
	 * @return bool update result
	 */
	private function updateDialplanApplication ( DialplanApplications $application, array $data ) {

		// Заполним параметры записи
		foreach ( $application as $name => $value ) {
			switch ( $name ) {
				case "extension":
					$application->$name = $data[ $name ];
					break;
				case "name":
					$application->$name = $data[ $name ];
					break;
				case "applicationlogic":
					$application->setApplicationlogic( $data[ $name ] );
					break;
				default:
					if ( ! array_key_exists( $name, $data ) ) {
						continue;
					}
					$application->$name = $data[ $name ];
			}
		}

		if ( $application->save() === FALSE ) {
			$errors = $application->getMessages();
			$this->flash->error( implode( '<br>', $errors ) );

			return FALSE;
		}

		return TRUE;

	}

	/**
	 * Обновление параметров внутреннего номера
	 *
	 * @param \Models\Extensions $extension
	 * @param array              $data массив полей из POST запроса
	 *
	 * @return bool update result
	 */
	private function updateExtension ( Extensions $extension, array $data ) {

		$extension->number   = $data['extension'];
		$extension->callerid = parent::transliterate( $data['name'] );
		if ( $extension->save() === FALSE ) {
			$errors = $extension->getMessages();
			$this->flash->error( implode( '<br>', $errors ) );

			return FALSE;
		}

		return TRUE;

	}
}