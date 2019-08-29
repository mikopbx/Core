<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\Extensions;
use Models\Sip;
use Models\ExternalPhones;
use Models\NetworkFilters;
use Models\Codecs;
use Models\SipCodecs;
use Models\Users;
use Models\PbxSettings;
use Models\ExtensionForwardingRights;
use Models\PbxExtensionModules;
use Phalcon\Text;

/**
 * @property void managedCache
 * @property void translation
 * @property void config
 */
class ExtensionsController extends BaseController {

	/**
	 * Построение списка внутренних номеров и сотрудников
	 */
	public function indexAction() :void{
		$extensionTable = [];

		$parameters = [
			'conditions' => '\Models\Extensions.is_general_user_number = 1',
			'columns'    => [
				'id'       => '\Models\Extensions.id',
				'username' => 'Users.username',
				'number'   => '\Models\Extensions.number',
				'userid'   => '\Models\Extensions.userid',
				'disabled' => 'Sip.disabled',
				'secret'   => 'Sip.secret',
				'email'    => 'Users.email',
				'type'     => '\Models\Extensions.type',
				'avatar'   => 'Users.avatar',

			],
			'order'      => 'number',
			'joins'      => [
				'Sip'   => [
					0 => 'Models\Sip',
					1 => 'Sip.extension=\Models\Extensions.number',
					2 => 'Sip',
					3 => 'LEFT',
				],
				'Users' => [
					0 => 'Models\Users',
					1 => 'Users.id = \Models\Extensions.userid',
					2 => 'Users',
					3 => 'INNER',
				],
			],
		];

		$extensions = Extensions::find($parameters);
		foreach ($extensions as $extension) {
			switch ($extension->type) {
				case 'SIP':
					$extensionTable[ $extension->userid ]['userid'] = $extension->userid;
					$extensionTable[ $extension->userid ]['number'] = $extension->number;
					$extensionTable[ $extension->userid ]['status'] = ($extension->disabled === '1') ? 'disabled' : '';
					$extensionTable[ $extension->userid ]['id']     = $extension->id;
					$extensionTable[ $extension->userid ]['username'] = $extension->username;
					$extensionTable[ $extension->userid ]['email'] = $extension->email;
					$extensionTable[ $extension->userid ]['secret'] = $extension->secret;

					if ( ! array_key_exists('mobile', $extensionTable[ $extension->userid ])){
						$extensionTable[ $extension->userid ]['mobile'] = '';
					}
					if ($extension->avatar){
						$filename = md5($extension->avatar);
						$imgFile = "{$this->config->application->imgCacheDir}$filename.jpg";
						if (!file_exists($imgFile)){
							$this->base64ToJpeg($extension->avatar, $imgFile);
						}

						$extensionTable[ $extension->userid ]['avatar'] = "{$this->url->get()}public/img/cache/{$filename}.jpg";
					} else {
						$extensionTable[ $extension->userid ]['avatar'] = "{$this->url->get()}public/img/unknownPerson.jpg";
					}
					
					break;
				case 'EXTERNAL':
					$extensionTable[ $extension->userid ]['mobile'] = $extension->number;
					break;
				default:

			}
		}
		$this->view->extensions = $extensionTable;
	}


	/**
	 * @param null $id - идентификатор внутреннего номера
	 */
	public function modifyAction($id = NULL) :void {
		$codecs          = [];
		$availableCodecs = Codecs::find();
		foreach ($availableCodecs as $codec) {
			$key                       = $codec->name;
			$codecs[ $key ]            = $codec->toArray();
			$codecs[ $key ]['enabled'] = FALSE;
		}


		$extension = Extensions::findFirstById($id);

		if ( ! $extension) {
			$extension                         = new Extensions();
			$extension->show_in_phonebook      = '1';
			$extension->public_access          = '0';
			$extension->is_general_user_number = '1';
			$extension->type                   = 'SIP';
			$extension->Sip                    = new Sip();
			$extension->Sip->disabled          = 0;
			$extension->Sip->type              = 'peer';
			$extension->Sip->uniqid            = strtoupper('SIP-PHONE-'. md5(time()));
			$extension->Sip->busylevel         = 1;
			$extension->Sip->qualify           = '1';
			$extension->Sip->qualifyfreq       = 60;
			$extension->number                 = $this->getNextInternalNumber();

			$extension->Users       = new Users();
			$extension->Users->role = 'user';

			$extension->ExtensionForwardingRights = new ExtensionForwardingRights();

			$codecs['alaw']['enabled'] = TRUE;
			$codecs['ulaw']['enabled'] = TRUE;
			$this->view->avatar        = '';
		} else {
			$extension->Sip->manualattributes
						   = $extension->Sip->getManualAttributes();
			$enabledCodecs = $extension->Sip->Codecs;
			foreach ($enabledCodecs as $codec) {
				$codecs[ $codec->codec ]['enabled'] = TRUE;
			}

			$this->view->avatar = $extension->Users->avatar;
		}

		$networkFilters            = NetworkFilters::getAllowedFiltersForType(['SIP']);
		$arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
		foreach ($networkFilters as $filter) {
			$arrNetworkFilters[ $filter->id ] = $filter->getRepresent();
		}

		$parameters        = [
			'conditions' => 'type = "EXTERNAL" AND is_general_user_number = 1 AND userid=:userid:',
			'bind'       => [
				'userid' => $extension->userid,
			],
		];
		$externalExtension = Extensions::findFirst($parameters);
		if ( ! $externalExtension) {
			$externalExtension                           = new Extensions();
			$externalExtension->userid                   = $extension->userid;
			$externalExtension->type                     = 'EXTERNAL';
			$externalExtension->is_general_user_number   = '1';
			$externalExtension->ExternalPhones           = new ExternalPhones();
			$externalExtension->ExternalPhones->uniqid   = strtoupper('EXTERNAL-' . md5(time()));
			$externalExtension->ExternalPhones->disabled = '0';

		}


		$forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');

		$parameters = [
			'conditions' => 'number IN ({ids:array})',
			'bind'       => [
				'ids' => [
					$extension->ExtensionForwardingRights->forwarding,
					$extension->ExtensionForwardingRights->forwardingonbusy,
					$extension->ExtensionForwardingRights->forwardingonunavailable,
				]],
		];
		$extensions = Extensions::find($parameters);
		foreach ($extensions as $record) {
			$forwardingExtensions[ $record->number ] = $record->getRepresent();
		}

		// Ограничим длинну внутреннего номера согласно настройкам
		$extensionsLength      = PbxSettings::getValueByKey('PBXInternalExtensionLength');
		$internalExtensionMask = '9{' . $extensionsLength . '}';

		$form = new ExtensionEditForm($extension, [
			'network_filters'        => $arrNetworkFilters,
			'external_extension'     => $externalExtension,
			'forwarding_extensions'  => $forwardingExtensions,
			'internalextension_mask' => $internalExtensionMask
		]);

		$this->view->form      = $form;
		$this->view->codecs    = $codecs;
		$this->view->represent = $extension->getRepresent();
	}


	/**
	 * Сохранение карточки пользователя с его номерами
	 *
	 * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
	 */
	public function saveAction() :void{
		if ( ! $this->request->isPost()) {
			return;
		}

		$this->db->begin();

		$data = $this->request->getPost();

		$sipEntity = FALSE;

		if (array_key_exists('sip_uniqid', $data)) {
			$sipEntity = SIP::findFirstByUniqid($data['sip_uniqid']);
		}

		if ($sipEntity === FALSE) {
			$sipEntity             = new SIP();
			$extension             = new Extensions();
			$userEntity            = new Users();
			$fwdEntity             = new ExtensionForwardingRights();
			$fwdEntity->ringlength = 45;

		} else {
			$extension = $sipEntity->Extensions;
			if ( ! $extension) {$extension = new Extensions();}
			$userEntity = $extension->Users;
			if ( ! $userEntity) {$userEntity = new Users();}
			$fwdEntity = $extension->ExtensionForwardingRights;
			if ( ! $fwdEntity) {$fwdEntity = new ExtensionForwardingRights();}
		}

		// Заполним параметры пользователя
		if ( ! $this->saveUser($userEntity, $data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры внутреннего номера
		if ( ! $this->saveExtension($extension, $userEntity, $data, FALSE)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры SIP учетки
		if ( ! $this->saveSip($sipEntity, $data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры Кодеков
		if ( ! $this->saveSipCodecs($data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры маршрутизации
		if ( ! $this->saveForwardingRights($fwdEntity, $data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Если мобильный не указан, то не будем его добавлять в базу
		if ( ! empty($data['mobile_number'])) {
			$externalPhone = ExternalPhones::findFirstByUniqid($data['mobile_uniqid']);
			if ($externalPhone === FALSE) {
				$externalPhone   = new ExternalPhones();
				$mobileExtension = new Extensions();
			} else {
				$mobileExtension = $externalPhone->Extensions;
			}

			// Заполним параметры Extension для мобильного
			if ( ! $this->saveExtension($mobileExtension, $userEntity, $data, TRUE)) {
				$this->view->success = FALSE;
				$this->db->rollback();

				return;
			}

			// Заполним параметры ExternalPhones для мобильного
			if ( ! $this->saveExternalPhones($externalPhone, $data)) {
				$this->view->success = FALSE;
				$this->db->rollback();

				return;
			}
		} else {
			// Удалить номер мобильного если он был привязан к пользователю
			$parameters          = [
				'conditions' => 'type="EXTERNAL" AND is_general_user_number = 1 AND userid=:userid:',
				'bind'       => [
					'userid' => $userEntity->id,
				],
			];
			$deletedMobileNumber = Extensions::findFirst($parameters);
			if ($deletedMobileNumber
				&& $deletedMobileNumber->delete() === FALSE) {
				$errors = $deletedMobileNumber->getMessages();
				$this->flash->error(implode('<br>', $errors));
				$this->view->success = FALSE;
				$this->db->rollback();

				return;
			}
		}

		$this->flash->success($this->translation->_('ms_SuccessfulSaved'));
		$this->view->success = TRUE;
		$this->db->commit();

		// Если это было создание карточки то надо перегрузить страницу с указанием ID
		if (empty($data['id'])) {
			$this->view->reload = "extensions/modify/{$extension->id}";
		}
	}


	/**
	 * Удаление внутреннего номера и всех зависимых от него записей в том числе мобильного и переадресаций
	 *
	 * @param string $id - записи внутренненго номера
	 */
	public function deleteAction($id = NULL) {
		$this->db->begin();
		$extension = Extensions::findFirstById($id);

		// Чтобы не было зацикливания при удалении сначала удалим
		// настройки переадресации у этой же учетной записи, т.к. она может ссылаться на себя

		$errors = FALSE;
		if ($extension && $extension->ExtensionForwardingRights
			&& ! $extension->ExtensionForwardingRights->delete()) {
			$errors = $extension->ExtensionForwardingRights->getMessages();
		}


		if ( ! $errors && $extension && ! $extension->Users->delete()){
			$errors = $extension->Users->getMessages();
		}

		if ($errors) {
			$this->flash->error(implode('<br>', $errors));
			$this->db->rollback();
		} else {
			$this->db->commit();
		}

		return $this->forward('extensions/index');
	}


	/**
	 * Проверка на доступность номера JS скрипта extensions.js
	 *
	 * @param string $number - внутренний номер пользователя
	 *
	 * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
	 */
	public function availableAction($number = NULL) :void{
		$result = TRUE;
		// Проверим пересечение с внутренним номерным планом
		$extension = Extensions::findFirstByNumber($number);
		if ($extension) {
			$result             = FALSE;
			$this->view->userId = $extension->userid;
		}
		// Проверим пересечение с парковочными слотами
		if ($result) {
			$parkExt       = PbxSettings::getValueByKey('PBXCallParkingExt');
			$parkStartSlot = PbxSettings::getValueByKey('PBXCallParkingStartSlot');
			$parkEndSlot   = PbxSettings::getValueByKey('PBXCallParkingEndSlot');
			if ($number === $parkExt || ($number >= $parkStartSlot && $number <= $parkEndSlot)) {
				$result             = FALSE;
				$this->view->userId = 0;
			}
		}

		$this->view->numberAvailable = $result;
	}


	/**
	 * Отключение всех номеров пользователя
	 *
	 * @param string $number - внутренний номер пользователя
	 *
	 * @return void
	 */
	public function disableAction($number = NULL) :void{
		$extension = Extensions::findFirstByNumber($number);
		if ($extension) {
			$extensions = Extensions::findByUserid($extension->userid);
			foreach ($extensions as $extension) {
				switch ($extension->type) {
					case 'SIP':
						$extension->Sip->disabled = '1';
						break;
					case 'EXTERNAL':
						$extension->ExternalPhones->disabled = '1';
						break;
				}
				if ($extension->save() === TRUE) {
					$this->view->success = TRUE;
				} else {
					$this->view->success = FALSE;
					$errors              = $extension->getMessages();
					$this->flash->error(implode('<br>', $errors));

					return;
				}
			}
		}
	}


	/**
	 * Включение всех номеров пользователя
	 *
	 * @param string $number - внутренний номер пользователя
	 *
	 * @return void
	 */
	public function enableAction($number = NULL) :void {
		$extension = Extensions::findFirstByNumber($number);
		if ($extension) {
			$extensions = Extensions::findByUserid($extension->userid);
			foreach ($extensions as $extension) {
				switch ($extension->type) {
					case 'SIP':
						$extension->Sip->disabled = '0';
						break;
					case 'EXTERNAL':
						$extension->ExternalPhones->disabled = '1';
						break;
				}
				if ($extension->save() === TRUE) {
					$this->view->success = TRUE;
				} else {
					$this->view->success = FALSE;
					$errors              = $extension->getMessages();
					$this->flash->error(implode('<br>', $errors));

					return;
				}
			}
		}
	}




	/**
	 * Сохранение параметров в таблицу Users
	 *
	 * @param Users $userEntity
	 * @param array $data - POST дата
	 *
	 * @return bool результат сохранения
	 */
	private function saveUser(Users $userEntity, $data) {
		// Заполним параметры пользователя
		foreach ($userEntity as $name => $value) {
			switch ($name) {
				case 'role':
					if ( array_key_exists('user_' . $name, $data)) {
						$userEntity->$name = ($userEntity->$name === 'user') ? 'user' : $data[ 'user_' . $name ]; // не повышаем роль
					}
					break;
				default:
					if ( array_key_exists('user_' . $name, $data)) {
						$userEntity->$name = $data[ 'user_' . $name ];
					}
			}
		}

		if ($userEntity->save() === FALSE) {
			$errors = $userEntity->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;
	}


	/**
	 * Сохранение параметров в таблицу Extensions
	 *
	 * @param Extensions $extension
	 * @param Users      $userEntity
	 * @param array      $data - POST дата
	 * @param bool isMobile - это мобильный телефон
	 *
	 * @return bool результат сохранения
	 */
	private function saveExtension(Extensions $extension, Users $userEntity, $data, $isMobile = FALSE) :bool{

		foreach ($extension as $name => $value) {
			switch ($name) {
				case 'id':
					break;
				case 'is_general_user_number':
					$extension->$name = '1';
					break;
				case 'type':
					$extension->$name = $isMobile ? 'EXTERNAL' : 'SIP';
					break;
				case 'public_access':
                    if (array_key_exists($name, $data))
                        $extension->$name = ($data[ $name ] === 'on') ? '1' : '0';
                    else
                        $extension->$name = '0';
                    break;
				case 'show_in_phonebook':
					if (array_key_exists($name, $data))
						$extension->$name = ($data[ $name ] === 'on') ? '1' : '0';
					else
						$extension->$name = ($data['is_general_user_number'] === 'on') ? '1' : '0';
					break;
				case 'callerid':
					$extension->$name = $this->transliterate($data['user_username']);
					break;
				case 'userid':
					$extension->$name = $userEntity->id;
					break;
				case 'number':
					$extension->$name = $isMobile ? $data['mobile_number'] : $data['number'];
					break;
				default:
					if (array_key_exists($name, $data)) {
						$extension->$name = $data[ $name ];	
					}
					
			}
		}

		if ($extension->save() === FALSE) {
			$errors = $extension->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;
	}


	/**
	 * Сохранение параметров в таблицу SIP
	 *
	 * @param Sip   $sipEntity
	 * @param array $data - POST дата
	 *
	 * @return bool результат сохранения
	 */
	private function saveSip(Sip $sipEntity, $data) {
		foreach ($sipEntity as $name => $value) {
			switch ($name) {
				case 'qualify':
					if (array_key_exists($name, $data)) {
						$sipEntity->$name = ($data[ $name ] === 'on') ? '1' : '0';
					} else {
						$sipEntity->$name = "0";
					}
					break;
				case 'disabled':
				case 'disablefromuser':
					if (array_key_exists('sip_' . $name, $data)) {
						$sipEntity->$name = ($data[ 'sip_' . $name ] === 'on') ? '1' : '0';
					} else {
						$sipEntity->$name = "0";
					}
					break;
				case 'networkfilterid':
					if ( ! array_key_exists('sip_' . $name, $data)) continue 2;
					if ($data[ 'sip_' . $name ] === 'none') {
						$sipEntity->$name = NULL;
					} else {
						$sipEntity->$name = $data[ 'sip_' . $name ];
					}
					break;
				case 'extension':
					$sipEntity->$name = $data['number'];
					break;
				case 'description':
					$sipEntity->$name = $data['user_username'];
					break;
				case 'manualattributes':
					$sipEntity->setManualAttributes($data['sip_manualattributes']);
					break;
				default:
					if ( array_key_exists('sip_' . $name, $data)) {
						$sipEntity->$name = $data[ 'sip_' . $name ];
					}
					
			}
		}
		if ($sipEntity->save() === FALSE) {
			$errors = $sipEntity->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;
	}


	/**
	 * Сохранение параметров в таблицу SipCodecs
	 *
	 * @param array $data - POST дата
	 *
	 * @return bool результат сохранения
	 */
	private function saveSipCodecs($data) :bool{
		$availableCodecs = Codecs::find();
		foreach ($availableCodecs as $codec) {
			$key        = $codec->name;
			$parameters = [
				'conditions' => 'sipuid=:sipuid: AND codec=:codec:',
				'bind'       => [
					'sipuid' => $data['sip_uniqid'],
					'codec'  => $key,
				],
			];
			if (array_key_exists('codec_' . $key, $data) && $data[ 'codec_' . $key ] === 'on') {
				$newCodec = SipCodecs::findFirst($parameters);
				if ( ! $newCodec) {
					$newCodec = new SipCodecs();
				}
				$newCodec->sipuid   = $data['sip_uniqid'];
				$newCodec->priority = "1";
				$newCodec->codec    = $key;
				if ($newCodec->save() === FALSE) {
					$errors = $newCodec->getMessages();
					$this->flash->error(implode('<br>', $errors));
					$this->view->success = FALSE;

					return FALSE;
				}
			} else {// Надо удалить лишний
				$deletedCodecs = SipCodecs::find($parameters);
				if ($deletedCodecs && $deletedCodecs->delete() === FALSE) {
					$errors = $deletedCodecs->getMessages();
					$this->flash->error(implode('<br>', $errors));
					$this->view->success = FALSE;

					return FALSE;
				}

			}
		}

		return TRUE;
	}


	/**
	 * Заполним параметры ExternalPhones для мобильного номера
	 *
	 * @param ExternalPhones $externalPhone
	 * @param array          $data - POST дата
	 *
	 * @return bool результат сохранения
	 */
	private function saveExternalPhones(ExternalPhones $externalPhone, $data) :bool{
		foreach ($externalPhone as $name => $value) {
			switch ($name) {
				case 'extension':
					$externalPhone->$name = $data['mobile_number'];
					break;
				case 'description':
					$externalPhone->$name = $data['user_username'];
					break;
				case 'disabled':
					if (array_key_exists('mobile_' . $name, $data)) {
						$externalPhone->$name = ($data[ 'mobile_' . $name ] === 'on') ? '1' : '0';

					} else {
						$externalPhone->$name = '0';
					}
					break;
				default:
					if ( array_key_exists('mobile_' . $name, $data)) {
						$externalPhone->$name = $data[ 'mobile_' . $name ];
					}
					
			}
		}
		if ($externalPhone->save() === FALSE) {
			$errors = $externalPhone->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;
	}


	/**
	 * Заполним параметры переадресации
	 *
	 * @param \Models\ExtensionForwardingRights $forwardingRight
	 * @param                                   $data
	 *
	 * @return bool
	 */
	private function saveForwardingRights(ExtensionForwardingRights $forwardingRight, $data) :bool{
		foreach ($forwardingRight as $name => $value) {
			switch ($name) {
				case 'extension':
					$forwardingRight->$name = $data['number'];
					break;
				default:
					if (array_key_exists('fwd_' . $name, $data)) {
						$forwardingRight->$name = ($data[ 'fwd_' . $name ] === -1) ? '' : $data[ 'fwd_' . $name ];	
					}
					
			}
		}

		if ($forwardingRight->save() === FALSE) {
			$errors = $forwardingRight->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;
	}

	/**
	 * Получает из базы следующий за последним введенным внутренним номером
	 */
	private function getNextInternalNumber() {
		$parameters = [
			'conditions' => 'type = "SIP"',
			'column'     => 'number',
		];
		$query      = Extensions::maximum($parameters);
		if ($query === NULL) {
			$query = 200;
		}
		$result       = (int)$query + 1;
		$extensionsLength
					  = PbxSettings::getValueByKey('PBXInternalExtensionLength');
		$maxExtension = (10**$extensionsLength) - 1;

		return ($result <= $maxExtension) ? $result : '';

	}

	/**
	 * Создает файл jpeg из переданной картинки
	 * @param $base64_string
	 * @param $output_file
	 *
	 * @return mixed
	 */
	private function base64ToJpeg($base64_string, $output_file) {
		// open the output file for writing
		$ifp = fopen( $output_file, 'wb' );

		// split the string on commas
		// $data[ 0 ] == "data:image/png;base64"
		// $data[ 1 ] == <actual base64 string>
		$data = explode( ',', $base64_string );

		// we could add validation here with ensuring count( $data ) > 1
		fwrite( $ifp, base64_decode( $data[ 1 ] ) );

		// clean up the file resource
		fclose( $ifp );

		return $output_file;
	}

	/**
	 * Возвращает представление нормера телефона по AJAX запросу
	 * @param $phoneNumber
	 *
	 * @return string
	 */
	public function GetPhoneRepresentAction($phoneNumber) :string{
		$cacheKey = "Extensions.GetPhoneRepresent.{$this->filter->sanitize($phoneNumber, 'absint')}";
		$response = $phoneNumber;
		$previousResult  = $this->managedCache->get($cacheKey, 600);
		if (empty($previousResult)) {
			if (strlen($phoneNumber)>10){
				$seekNumber = substr($phoneNumber,-9);
				$parameters = [
					'conditions'=>'number LIKE :SearchPhrase1:',
					'bind'=>[
						'SearchPhrase1'=>"%{$seekNumber}"
					]
				];
			} else {
				$parameters = [
					'conditions'=>'number = :SearchPhrase1:',
					'bind'=>[
						'SearchPhrase1'=>$phoneNumber
					]
				];
			}
			$result     = Extensions::findFirst($parameters);
			if ($result){
				$response = $result->getRepresent();
			}
			$this->managedCache->save($cacheKey, $response);
		} else {
			$response = $previousResult;
		}
		return $response;
	}
	/**
	 * Возвращает представление для списка нормеров телефонов по AJAX запросу
	 *
	 * @return void
	 */
	public function GetPhonesRepresentAction() :void{
		if ( ! $this->request->isPost()) {
			return;
		}
		$numbers = $this->request->getPost('numbers');
		$result =[];
		foreach ($numbers as $number){
			$result[$number]= [
				'number' => $number,
				'represent' =>$this->GetPhoneRepresentAction($number)
			];
		}
		$this->view->success = true;
		$this->view->message = $result;
	}

    /**
     * Используется для генерации списка выбора пользователей из JS скрипта extensions.js
     *
     * @param bool $onlyphone - отображать только телефоны или все возможные номера
     *
     * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
     */
    public function getForSelectAction($onlyphone = FALSE) :void{

        $cacheKey = "Extensions.getForSelectAction.{$onlyphone}.php";
        $results  = $this->managedCache->get($cacheKey, 3600);
        if (empty($results) || $this->config->application->debugMode) {

            $results = [];

            if ($onlyphone) {
                // Список телефоонных эктеншенов
                $parameters = [
                    'conditions' => 'type IN ({ids:array})',
                    'bind'       => [
                        'ids' => ['SIP', 'EXTERNAL'],
                    ],
                ];
            } else {
                $parameters = [];
            }
            $extensions = Extensions::find($parameters);
            foreach ($extensions as $record) {
                $type = ($record->userid > 0) ? ' USER'
                    : $record->type; // Пользователи будут самыми первыми в списке
                $type = Text::underscore(strtoupper($type));


                // Необходимо проверить к какому модулю относится эта запись
                // и включен ли этот модуль в данный момент
                if ($type === 'MODULES'
                    && PbxExtensionModules::ifModule4ExtensionDisabled($record->number)) {
                    continue; // исключаем отключенные модули
                }
                $represent = $record->getRepresent();
                $clearedRepresent = strip_tags($represent);
                $results[] = [
                    'name'          => $represent,
                    'value'         => $record->number,
                    'type'          => $type,
                    'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
                    'sorter'        => ($record->userid > 0)?"{$type}{$clearedRepresent}{$record->number}":"{$type}{$clearedRepresent}"
                    // 'avatar' => ( $record->userid > 0 )
                    // 	? $record->Users->avatar : '',
                ];
            }

            usort($results,
                ['ExtensionsController', 'sortExtensionsArray']);
            $this->managedCache->save($cacheKey, $results);
        }
        $this->view->success = TRUE;
        $this->view->results = $results;


    }

    /**
     * Сортировка массива extensions
     *
     * @return integer
     */
    private function sortExtensionsArray($a, $b) :int {
        return strcmp($a['sorter'], $b['sorter']);
    }
}