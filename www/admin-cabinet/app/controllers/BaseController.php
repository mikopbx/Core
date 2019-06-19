<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\PbxExtensionModules;
use Phalcon\Mvc\Controller;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\View;
use Phalcon\Text;

class BaseController extends Controller {

	protected $di;
	protected $actionName;
	protected $controllerName;


	/**
	 * Инициализация базововго класса
	 */
	public function initialize() {
		$this->di                    = $this->getDi();
		$this->actionName            = $this->dispatcher->getActionName();
		$this->controllerName        = $this->dispatcher->getControllerName();
		$this->moduleName            = $this->dispatcher->getModuleName();

		if ( $this->request->isAjax() === FALSE ) {
			$this->prepareView( );
		}
	}


	/**
	 * Инициализирует шаблонизатор View и устанавливает переменные системы для отображения
	 */
	protected function prepareView(){
		date_default_timezone_set( $this->getSessionData('PBXTimezone') );
		$roSession  = $this->sessionRO;
		$this->view->PBXVersion = $this->getSessionData('PBXVersion');
		$this->view->PBXLicense = $this->getSessionData('PBXLicense');
		$this->view->PBXLanguage= $this->getSessionData('PBXLanguage');

		// Проверим монтирование диска для хранения
		if ( $roSession !== null && array_key_exists('StorageDiskUnMounted', $roSession)) {
			$this->view->StorageDiskUnMounted = $roSession[ 'StorageDiskUnMounted' ];
		} else {
			$this->view->StorageDiskUnMounted = false;
		}


		// Кеш версий модулей и атс, для правильной работы АТС при установке модулей
		$versionHash = $this->getVersionsHash();
		$this->session->set( 'versionHash', $versionHash);

		if ( $roSession !== null && array_key_exists('SubmitMode', $roSession)) {
			$this->view->submitMode = $roSession[ 'SubmitMode' ];
		} else {
			$this->view->submitMode = 'SaveSettings';
		}

		// Добавим версию модуля, если это модуль
		if ( $this->moduleName == "PBXExtension" ) {
			$module = PbxExtensionModules::findFirstByUniqid( $this->controllerName );
			if ( !$module ) {
				$module = new PbxExtensionModules();
				$module->disabled = '1';
				$module->name = 'Unknown module';
			}
			$this->view->module = $module;
			$this->view->submitMode = NULL;
		}

		// Разрешим отправку анонимной информации об ошибках
		if ($this->getSessionData('SendMetrics') == '1'){
			touch('/tmp/sendmetrics');
			$this->view->lastSentryEventId = Sentry\State\Hub::getCurrent()->getLastEventId();
		} else {
			if (file_exists('/tmp/sendmetrics')){
				unlink('/tmp/sendmetrics');
			}
			$this->view->lastSentryEventId = Null;
		}

		$unCamelizedControllerName   = Text::uncamelize( $this->controllerName, '-' );
		switch ( $this->actionName ) {
			case'index':
			case'delete':
			case'save':
			case'modify':
			case'*** WITHOUT ACTION ***':
				$this->tag->setTitle( $this->config->application->kind . ' | '
				                      . $this->translation->_( 'Breadcrumb'
				                                               . $this->controllerName ) );
				break;
			default:
				$this->tag->setTitle( $this->config->application->kind . ' | '
				                      . $this->translation->_( 'Breadcrumb'
				                                               . $this->controllerName
				                                               . $this->actionName ) );
		}

		$this->view->t = $this->translation;
		$this->view->debugMode = $this->config->application->debugMode;
		$this->view->urlToLogo = $this->url->get( 'public/img/logo-mikopbx.svg' );
		if ($this->language === 'ru'){
			$this->view->urlToWiki
				= "https://wiki.mikopbx.com/{$unCamelizedControllerName}";
			$this->view->urlToLogo = $this->url->get( 'public/img/logo.svg' );
		} else {
			$this->view->urlToWiki
				= "https://wiki.mikopbx.com/{$this->language}:{$unCamelizedControllerName}";
		}

		$this->view->urlToController = $this->url->get( $unCamelizedControllerName );
		$this->view->represent       = '';
		$this->view->cacheName       = "{$this->controllerName}{$this->actionName}{$this->language}{$versionHash}";
		if ( $this->moduleName  === "PBXExtension" ) {
			$this->view->setTemplateAfter( 'modules' );
		} else {
			$this->view->setTemplateAfter( 'main' );
		}
	}

	/**
	 * Постобработка запроса
	 *
	 * @param \Phalcon\Mvc\Dispatcher $dispatcher
	 *
	 * @return \Phalcon\Http\Response|\Phalcon\Http\ResponseInterface
	 */
	public function afterExecuteRoute( Dispatcher $dispatcher ) {
		if ( $this->request->isAjax() == TRUE ) {
			$this->view->disableLevel( [
				View::LEVEL_ACTION_VIEW     => TRUE,
				View::LEVEL_LAYOUT          => TRUE,
				View::LEVEL_MAIN_LAYOUT     => TRUE,
				View::LEVEL_AFTER_TEMPLATE  => TRUE,
				View::LEVEL_BEFORE_TEMPLATE => TRUE,
			] );
			$this->response->setContentType( 'application/json', 'UTF-8' );
			$data = $this->view->getParamsToView();

			/* Set global params if is not set in controller/action */
			if ( is_array( $data ) ) {
				$data['success'] = array_key_exists( 'success', $data ) ? $data['success'] : TRUE;
				$data['reload']  = array_key_exists( 'reload', $data ) ? $data['reload'] : FALSE;
				$data['message'] = isset( $data['message'] ) ? $data['message'] : $this->flash->getMessages();

				// Добавим информацию о последней ошибке для отображения диалогового окна для пользователя
				if (file_exists('/tmp/sendmetrics')) {
					$data['lastSentryEventId'] = Sentry\State\Hub::getCurrent()->getLastEventId();
				}
				$data            = json_encode( $data );
			}

			$this->response->setContent( $data );
		}
		return $this->response->send();
	}

	/**
	 * Перехват события перед обработкой в контроллере
	 */
	public function beforeExecuteRoute(){
		if ($this->request->isPost()){
			$data = $this->request->getPost('submitMode');
			if (!empty($data)){
				$this->session->set('SubmitMode', $data);
			}
		}
	}

	/**
	 * Перевод страниц без перезагрузки страниц
	 *
	 * @param string $uri
	 */
	protected function forward( $uri ) {
		$uriParts = explode( '/', $uri );
		$params   = array_slice( $uriParts, 2 );

		return $this->dispatcher->forward(
			[
				'controller' => $uriParts[0],
				'action'     => $uriParts[1],
				'params'     => $params,
			]

		);
	}

	/**
	 * Транслитерация переданной строки
	 *
	 * @param $string
	 *
	 * @return string
	 */
	protected function transliterate( $string ) {

		$converter = [
			'а' => 'a',
			'б' => 'b',
			'в' => 'v',
			'г' => 'g',
			'д' => 'd',
			'е' => 'e',
			'ё' => 'e',
			'ж' => 'zh',
			'з' => 'z',
			'и' => 'i',
			'й' => 'y',
			'к' => 'k',
			'л' => 'l',
			'м' => 'm',
			'н' => 'n',
			'о' => 'o',
			'п' => 'p',
			'р' => 'r',
			'с' => 's',
			'т' => 't',
			'у' => 'u',
			'ф' => 'f',
			'х' => 'h',
			'ц' => 'c',
			'ч' => 'ch',
			'ш' => 'sh',
			'щ' => 'sch',
			'ь' => 'i',
			'ы' => 'y',
			'ъ' => '',
			'э' => 'e',
			'ю' => 'yu',
			'я' => 'ya',

			'А' => 'A',
			'Б' => 'B',
			'В' => 'V',
			'Г' => 'G',
			'Д' => 'D',
			'Е' => 'E',
			'Ё' => 'E',
			'Ж' => 'Zh',
			'З' => 'Z',
			'И' => 'I',
			'Й' => 'Y',
			'К' => 'K',
			'Л' => 'L',
			'М' => 'M',
			'Н' => 'N',
			'О' => 'O',
			'П' => 'P',
			'Р' => 'R',
			'С' => 'S',
			'Т' => 'T',
			'У' => 'U',
			'Ф' => 'F',
			'Х' => 'H',
			'Ц' => 'C',
			'Ч' => 'Ch',
			'Ш' => 'Sh',
			'Щ' => 'Sch',
			'Ь' => 'I',
			'Ы' => 'Y',
			'Ъ' => ' ',
			'Э' => 'E',
			'Ю' => 'Yu',
			'Я' => 'Ya',
		];

		return strtr( $string, $converter );

	}

	/**
	 * Генерирует хеш из версий установленных модулей и АТС, для корректного склеивания JS, CSS и локализаций.
	 *
	 */
	private function getVersionsHash(){
		$result = Models\PbxSettings::getValueByKey( 'PBXVersion' );
		$modulesVersions = Models\PbxExtensionModules::find(['columns'=>'version']);
		foreach ($modulesVersions as $module) {
			$result.=$module->version;
		}
		return md5($result);
	}

	/**
	 * Берет данные из сессии или из базы данных и записывает в кеш
	 */
	private function getSessionData($key){
		$roSession  = $this->sessionRO;
		if ( $roSession !== null && array_key_exists($key, $roSession)) {
			$value = $roSession[ $key ];
		} else {
			$value = Models\PbxSettings::getValueByKey( $key ) ;
			$this->session->set( $key, $value);
		}
		return $value;
	}
}
