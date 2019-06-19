<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Phalcon\Mvc\User\Component;
use Mikopbx\License;

class LicenseWorker extends Component {

	private $serverUrl;

	function __construct( $serverUrl = 'http://127.0.0.1:8222' ) {
		$this->serverUrl = $serverUrl;
	}

	/**
	 * Выполнение запроса к серверу NATS.
	 *
	 * @param $metod
	 * @param $data
	 *
	 * @return mixed
	 */
	private function curlPostRequest( $metod, $data = NULL ) {
		$url = $this->serverUrl . "/license.api/$metod";
		$ch  = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 25 );
		if ( $data != NULL ) {
			$params = http_build_query( $data );
			curl_setopt( $ch, CURLOPT_POST, 1 );
			curl_setopt( $ch, CURLOPT_POSTFIELDS, $params );
			curl_setopt( $ch, CURLOPT_HTTPHEADER,
				[ "Content-type: application/x-www-form-urlencoded" ] );
		}
		$output = curl_exec( $ch );
		curl_close( $ch );

		return $output;
	}

	/**
	 * Получение инфорамции по лицензиям. Установка значения ключа в NATS.
	 *
	 * @param $key
	 *
	 * @return array
	 */
	public function getLicenseInfo( $key ) {
		$response = $this->curlPostRequest( 'getlicenseinfo',
			[ 'key' => $key ] );
		$arResult = $this->convertXMLToArray( $response );
		if ( $arResult['success'] ) {
			$result = $arResult['result'];
		} else {
			$result = $arResult['error'];
			if ( openlog( "License", LOG_ODELAY, LOG_LOCAL7 ) ) {
				syslog( LOG_EMERG, $arResult['error'] );
				closelog();
			}
		}

		return $result;
	}

	/**
	 * Получение нового регистрационного номера.
	 *
	 * @param $params
	 *
	 * @return mixed
	 */
	public function getTrialLicense( $params ) {
		$data     = [
			'companyname' => $params['companyname'],
			'email'       => $params['email'],
			'contact'     => $params['contact'],
			'tel'         => $params['telefone'],
			'inn'         => $params['inn'],
			'description' => 'get trial from askozia pbx',
			'product'     => 11,
		];
		$response = $this->curlPostRequest( 'gettrial', $data );
		$arResult = $this->convertXMLToArray( $response );
		if ( $arResult['success'] ) {
			$result = $arResult['result'];
		} else {
			$result = $arResult['error'];
		}
		return $result;
	}

	/**
	 * Добавление нового триала к ключу.
	 *
	 * @param $productid
	 *
	 * @return bool - результат активации триала
	 */
	public function addTrial( $productid = "11" ) {
		$data     = [ 'product' => $productid ];
		$response = $this->curlPostRequest( 'addtrial', $data );
		$arResult = $this->convertXMLToArray( $response );
		if ( $arResult['success'] ) {
			$result = TRUE;
		} else {
			$result = $arResult['error'];
		}

		return $result;
	}

	/**
	 * Активация купона
	 *
	 * @param $coupon
	 *
	 * @return bool результат активации купона
	 */
	public function activateCoupon( $coupon ) {
		$data     = [ 'coupon' => trim( $coupon ) ];
		$response = $this->curlPostRequest( 'activatecoupon', $data );
		$arResult = $this->convertXMLToArray( $response );
		if ( $arResult['success'] ) {
			$result = TRUE;
		} else {
			$result = $arResult['error'];
		}

		return $result;
	}

	/**
	 * Смена лицензионного ключа
	 *
	 * @param $newKey - новый ключ
	 */
	public function changeLicenseKey( $newKey ) {
		$this->curlPostRequest( 'changekey', [ 'key' => $newKey ] );
	}

	/**
	 * Преобразование ответа в массив значений.
	 *
	 * @param $text
	 *
	 * @return array
	 */
	private function convertXMLToArray( $text ) {

		$json_data = json_decode( $text, TRUE );
		if (is_null($json_data)){
			$text = str_replace( '\n', "\n", $text );
			$text = str_replace( '\"', '"', $text );

			$json_data = json_decode( $text, TRUE );
		}
		if ( ! isset( $json_data['error'] ) ) {
			$text_xml = urldecode($json_data['result']);
			libxml_use_internal_errors(true);
			$doc = simplexml_load_string($text_xml);
			if (!$doc) {
				libxml_clear_errors();
				$doc = $text_xml;
			}

			$result   = ['success' => TRUE, 'result' => $doc];
		}elseif ( isset( $json_data['error'] ) ) {
			$result = [ 'success' => FALSE, 'error' => $json_data['error'] ];
		} else {
			$result = [ 'success' => FALSE, 'error' => $json_data ];
		}

		return $result;
	}

}