<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\PbxSettings;
use Phalcon\Text;

class LicensingController extends BaseController {

	private $licenseWorker;

	/**
	 * Инициализация базового класса
	 */
	public function initialize() {
		parent::initialize();
		$this->licenseWorker = $this->getDI()->getLicenseWorker();
	}

	/**
	 * Форма работы с лицензионными ключами
	 */
	public function modifyAction() {

		// Форма лицензионного ключа
		$licKey                           = PbxSettings::getValueByKey( 'PBXLicense' );
		$changeLicenseKeyForm
		                                  = new LicensingChangeLicenseKeyForm( NULL,
			[ 'licKey' => $licKey ] );
		$this->view->changeLicenseKeyForm = $changeLicenseKeyForm;

		// Форма активации купона
		$activateCouponForm             = new LicensingActivateCouponForm();
		$this->view->activateCouponForm = $activateCouponForm;

		// Форма получения триала
		$getTrialForm             = new LicensingGetTrialForm();
		$this->view->getTrialForm = $getTrialForm;


		$this->view->submitMode = NULL;
	}

	/**
	 * Обработка нажатий на кнопки в форме
	 */
	public function updateLicenseAction() {
		if ( ! $this->request->isPost() ) {
			return;
		}
		$data = $this->request->getPost();
		if ( ! empty( $data['licKey'] ) ) {
			$oldLicKey = PbxSettings::getValueByKey( 'PBXLicense' );
			if ( $oldLicKey !== $data['licKey'] ) {

				$licenseInfo = $this->licenseWorker->getLicenseInfo( $data['licKey'] );
				if ($licenseInfo instanceof SimpleXMLElement){
					$this->saveLicenseKey( $data['licKey'] );
					$this->licenseWorker->changeLicenseKey( $data['licKey'] );
					$this->licenseWorker->addTrial();
					$this->view->success = TRUE;
				} else if (!empty($licenseInfo) && strpos($licenseInfo, '2026') !== false) {
					$this->flash->error($this->translation->_( 'lic_FailedCheckLicense2026' ));
					$this->view->success = FALSE;
				} else {
					$this->flash->error($licenseInfo);
					$this->view->success = FALSE;
				}

			}
			if ( ! empty( $data['coupon'] ) ) {
				$result
					= $this->licenseWorker->activateCoupon( $data['coupon'] );
				if ( $result === TRUE ) {
					$this->flash->success( $this->translation->_( 'lic_SuccessfulCouponActivated' ) );
					$this->view->success = TRUE;
				} else {
					if (strpos($result, '2041') !== false) {
						$this->flash->error($this->translation->_( 'lic_FailedActivateCoupon2041' ));
					} elseif (strpos($result, '2040') !== false) {
						$this->flash->error($this->translation->_( 'lic_FailedActivateCoupon2040' ));
					} elseif (strpos($result, '2057') !== false) {
						$this->flash->error($this->translation->_( 'lic_FailedActivateCoupon2057' ));
					} elseif (strpos($result, '2037') !== false) {
						$this->flash->error($this->translation->_( 'lic_FailedActivateCoupon2037' ));
					} else {
						$this->flash->error( $result );
					}

					$this->view->success = FALSE;
				}
			}
		} else { // Получим триальную лицензию для ключа
			$newLicenseKey = $this->licenseWorker->getTrialLicense( $data );
			if ( strlen( $newLicenseKey ) == 28
			     && Text::startsWith( $newLicenseKey, "MIKO-" ) ) {
				$this->saveLicenseKey( $newLicenseKey );
				$this->licenseWorker->addTrial();
				$this->licenseWorker->changeLicenseKey( $newLicenseKey );
			} else {
				// Не удалось получить триальную лицензию, попробуем вывести корректное сообщение об ошибке
				if (strpos($newLicenseKey, '2051') !== false) {
					$this->flash->error($this->translation->_( 'lic_FailedToGetTrialKey2051' ));
				} elseif (strpos($newLicenseKey, '2022') !== false) {
					$this->flash->error($this->translation->_( 'lic_FailedToGetTrialKey2022' ));

				} else {
					$this->flash->error( $newLicenseKey );
				}

				$this->view->success = FALSE;
			}
		}

		if ( $this->view->success === TRUE ) {
			$this->view->reload = "licensing/modify/";
			$this->session->remove('checkRegistration');
		}

	}

	/**
	 * Сохранение ключа в базу данных
	 */
	private function saveLicenseKey( $licenseKey ) {
		$this->db->begin();
		$record = PbxSettings::findFirstByKey( 'PBXLicense' );
		if ( ! $record ) {
			$record      = new PbxSettings();
			$record->key = 'PBXLicense';
		}
		$record->value = $licenseKey;

		if ( $record->save() === FALSE ) {
			$errors = $record->getMessages();
			$this->flash->warning( implode( '<br>', $errors ) );
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}
		$this->flash->success( $this->translation->_( 'ms_SuccessfulSaved' ) );
		$this->view->success = TRUE;
		$this->db->commit();
	}


	/**
	 * Очистка всех настроек и сброс ключа
	 */
	public function resetSettingsAction() {
		$record = PbxSettings::findFirstByKey( 'PBXLicense' );
		if ( $record !== FALSE && $record->delete() === FALSE ) {
			$errors = $record->getMessages();
			$this->flash->error( implode( '<br>', $errors ) );
			$this->view->success = FALSE;

			return;
		}
		$this->view->success = TRUE;
		$this->licenseWorker->changeLicenseKey( '' );
		$this->session->remove('checkRegistration');
	}

	/**
	 * Возвращает информацию о лицензионном ключе
	 * @param $licenseKey
	 *
	 * @return array
	 */
	public function getLicenseInfoAction($licenseKey){

		if (empty($licenseKey)) return [];

		$licenseInfo = $this->licenseWorker->getLicenseInfo( $licenseKey );
		$this->view->success = TRUE;
		$this->view->message = json_encode($licenseInfo);

	}


}