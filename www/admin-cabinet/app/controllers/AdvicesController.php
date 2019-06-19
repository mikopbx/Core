<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

use Models\PbxSettings;
use Models\NetworkFilters;

class AdvicesController extends BaseController {

	/**
	 * Вызывается через AJAX периодически из веб интервейса,
	 * формирует список советов для администратора PBX о неправильных настройках
	 */
	public function getAdvicesAction() :void{
		$arrMessages = [[]];
		$arrAdvicesTypes  = [
			['type'=>'checkPasswords','cacheTime'=>15],
			['type'=>'checkFirewalls','cacheTime'=>15],
			['type'=>'checkStorage','cacheTime'=>120],
			['type'=>'checkUpdates','cacheTime'=>3600],
			['type'=>'checkRegistration','cacheTime'=>86400],
		];

		$roSession  = $this->sessionRO;

		foreach ($arrAdvicesTypes as $adviceType){
			$currentAdvice = $adviceType['type'];
			if ($roSession !== null && array_key_exists($currentAdvice, $roSession) ) {
				$oldResult = json_decode($roSession[$currentAdvice],FALSE);
				if (!empty($oldResult->LastMessage)
					&& (time() - $oldResult->LastTimeStamp < $adviceType['cacheTime'])){
					$arrMessages[] = $oldResult->LastMessage;
					continue;
				}
			}
			$newResult = $this->$currentAdvice();
			if (!empty($newResult)) {
				$arrMessages[] = $newResult;
			}
			$this->session->set( $currentAdvice, json_encode(['LastMessage'=>$newResult,'LastTimeStamp'=>time()]));
		}
		$this->view->success = TRUE;
		$this->view->message = array_merge(...$arrMessages);
	}

	/**
	 * Проверка установлены ли корректно пароли
	 * @return array
	 */
	private function checkPasswords() {
		$messages           = [];
		$arrOfDefaultValues = PbxSettings::getDefaultArrayValues();
		if ( $arrOfDefaultValues['WebAdminPassword']
		     === PbxSettings::getValueByKey( 'WebAdminPassword' ) ) {
			$messages[] = $this->translation->_( 'adv_YouUseDefaultWebPassword',
				[ 'url' => $this->url->get( 'general-settings/modify/#/passwords' ) ] );
		}
		if ( $arrOfDefaultValues['SSHPassword']
		     === PbxSettings::getValueByKey( 'SSHPassword' ) ) {
			$messages[] = $this->translation->_( 'adv_YouUseDefaultSSHPassword',
				[ 'url' => $this->url->get( 'general-settings/modify/#/ssh' ) ] );
		}

		return $messages;
	}

	/**
	 * Проверка включен ли Firewall
	 * @return array
	 */
	private function checkFirewalls() {
		$messages = [];
		if ( PbxSettings::getValueByKey( 'PBXFirewallEnabled' ) === '0' ) {
			$messages[] = $this->translation->_( 'adv_FirewallDisabled',
				[ 'url' => $this->url->get( 'firewall/index/' ) ] );
		}
		if ( NetworkFilters::count() === 0 ) {
			$messages[] = $this->translation->_( 'adv_NetworksNotConfigured',
				[ 'url' => $this->url->get( 'firewall/index/' ) ] );
		}

		return $messages;
	}

	/**
	 * Проверка подключен ли диск для хранения данных
	 * @return array
	 */
	private function checkStorage() {
		if (!is_array($_COOKIE) || !array_key_exists(session_name(), $_COOKIE)) {
			return [];
		}
		$messages = [];
		$url      = 'http://127.0.0.1/pbxcore/api/storage/list';
		$ch       = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 3 );
		curl_setopt( $ch, CURLOPT_COOKIE, session_name() . '=' . $_COOKIE[session_name()]);
		$output = curl_exec( $ch );
		curl_close( $ch );
		$storageList = json_decode( $output , false);
		if ( $storageList !== NULL && property_exists($storageList, 'data')) {
			$storageDiskMounted = FALSE;
			foreach ( $storageList->data as $disk ) {
				if ( property_exists($disk, 'mounted')
					&& strpos($disk->mounted, '/storage/usbdisk') !== false ) {
					$storageDiskMounted = TRUE;
					if ($disk->free_space < 500){
						$messages[]
							= $this->translation->_( 'adv_StorageDiskRunningOutOfFreeSpace',['free'=>$disk->free_space] );
					}

				}
			}
			$this->session->set('StorageDiskUnMounted',!$storageDiskMounted);

		}
		return $messages;
	}

	/**
	 * Проверка наличия обновлений
	 * @return array
	 */
	private function checkUpdates() {
		$PBXVersion  = Models\PbxSettings::getValueByKey( 'PBXVersion' );

		$messages = [];
		$url      = 'https://update.askozia.ru/getNews/';
		$ch       = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 3 );
		curl_setopt( $ch, CURLOPT_POST, 1);
		curl_setopt( $ch, CURLOPT_POSTFIELDS,
			"TYPE=FIRMWARE&PBXVER={$PBXVersion}");

		$output = curl_exec( $ch );
		 curl_close( $ch );
		 $answer = json_decode( $output,FALSE );
		 if ( $answer !== NULL && $answer->newVersionAvailable === true ){
				$messages[] = $this->translation->_( 'adv_AvailableNewVersionPBX',
					[ 'url' => $this->url->get( 'update/index/' ),
					  'ver' => $answer->version ] );
		 }
		 return $messages;
	}
	/**
	 * Проверка зарегистрирована ли копия Askozia
	 *
	 */
	private function checkRegistration(){
		$licKey  = Models\PbxSettings::getValueByKey( 'PBXLicense' );
		$messages=[];
		if (empty($licKey)) {
			$messages[] = $this->translation->_( 'adv_ThisCopyIsNotRegistered',
				[ 'url' => $this->url->get( 'licensing/modify/' )]);
		} else {
			file_put_contents('/tmp/licenseKey', $licKey);
			$licenseInfo = $this->licenseWorker->getLicenseInfo( $licKey );
			If (empty($licenseInfo)){
				$messages[] = $this->translation->_( 'adv_ThisCopyIsNotRegistered',
					[ 'url' => $this->url->get( 'licensing/modify/' )]);
			}
		}
		return $messages;
	}

}