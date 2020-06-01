<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use Phalcon\Mvc\{Controller, Dispatcher, View};
use Phalcon\Tag;
use Phalcon\Text;
use Sentry\SentrySdk;


/**
 * @property array                                         sessionRO
 * @property \Phalcon\Session\Manager                      session
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property string                                        language
 * @property \MikoPBX\AdminCabinet\Library\Elements        elements
 * @property string                                        moduleName
 * @property \Phalcon\Flash\Session                        flash
 * @property \Phalcon\Tag                                  tag
 * @property \Phalcon\Config\Adapter\Json                  config
 */
class BaseController extends Controller
{

    protected $di;
    protected $actionName;
    protected $controllerName;
    protected $controllerNameUnCamelized;


    /**
     * Инициализация базововго класса
     */
    public function initialize(): void
    {
        $this->di                        = $this->getDi();
        $this->actionName                = $this->dispatcher->getActionName();
        $this->controllerName            = Text::camelize($this->dispatcher->getControllerName(), '_');
        $this->controllerNameUnCamelized = Text::uncamelize($this->controllerName, '-');

        $this->moduleName = $this->dispatcher->getModuleName();

        if ($this->request->isAjax() === false) {
            $this->prepareView();
        }
    }


    /**
     * Инициализирует шаблонизатор View и устанавливает переменные системы для отображения
     */
    protected function prepareView(): void
    {
        date_default_timezone_set($this->getSessionData('PBXTimezone'));
        $roSession              = $this->sessionRO;
        $this->view->PBXVersion = $this->getSessionData('PBXVersion');
        if ($roSession !== null && array_key_exists('auth', $roSession)) {
            $this->view->SSHPort    = $this->getSessionData('SSHPort');
            $this->view->PBXLicense = $this->getSessionData('PBXLicense');
        } else {
            $this->view->SSHPort    = '';
            $this->view->PBXLicense = '';
        }
        $this->view->WebAdminLanguage   = $this->getSessionData('WebAdminLanguage');
        $this->view->AvailableLanguages = json_encode($this->elements->getAvailableWebAdminLanguages());

        // Кеш версий модулей и атс, для правильной работы АТС при установке модулей
        $versionHash = $this->getVersionsHash();
        $this->session->set('versionHash', $versionHash);

        if ($roSession !== null && array_key_exists('SubmitMode', $roSession)) {
            $this->view->submitMode = $roSession['SubmitMode'];
        } else {
            $this->view->submitMode = 'SaveSettings';
        }

        // Добавим версию модуля, если это модуль
        if ($this->moduleName === 'PBXExtension') {
            $module = PbxExtensionModules::findFirstByUniqid($this->controllerName);
            if ($module === null) {
                $module           = new PbxExtensionModules();
                $module->disabled = '1';
                $module->name     = 'Unknown module';
            }
            $this->view->module = $module;
        }

        // Разрешим отправку анонимной информации об ошибках
        if ($this->getSessionData('SendMetrics') === '1') {
            touch('/tmp/sendmetrics');
            $this->view->lastSentryEventId = SentrySdk::getCurrentHub()->getLastEventId();
        } else {
            if (file_exists('/tmp/sendmetrics')) {
                unlink('/tmp/sendmetrics');
            }
            $this->view->lastSentryEventId = null;
        }
        $title = 'MikoPBX';
        switch ($this->actionName) {
            case'index':
            case'delete':
            case'save':
            case'modify':
            case'*** WITHOUT ACTION ***':
                $title .= '|'. $this->translation->_("Breadcrumb{$this->controllerName}");
                break;
            default:
                $title .= '|'. $this->translation->_("Breadcrumb{$this->controllerName}{$this->actionName}");
        }
        Tag::setTitle($title);
        $this->view->t         = $this->translation;
        $this->view->debugMode = $this->config->path('adminApplication.debugMode');
        $this->view->urlToLogo = $this->url->get('assets/img/logo-mikopbx.svg');
        if ($this->language === 'ru') {
            $this->view->urlToWiki
                = "https://wiki.mikopbx.com/{$this->controllerNameUnCamelized}";
            $this->view->urlToSupport
                = 'https://www.mikopbx.ru/support/?fromPBX=true';
        } else {
            $this->view->urlToWiki
                = "https://wiki.mikopbx.com/{$this->language}:{$this->controllerNameUnCamelized}";
            $this->view->urlToSupport
                = 'https://www.mikopbx.com/support/?fromPBX=true';
        }

        $this->view->urlToController = $this->url->get($this->controllerNameUnCamelized);
        $this->view->represent       = '';
        $this->view->cacheName       = "{$this->controllerName}{$this->actionName}{$this->language}{$versionHash}";

        // Подключим нужный View
        if ($this->moduleName === 'PBXExtension') {
            $this->view->setTemplateAfter('modules');
        } else {
            $this->view->setTemplateAfter('main');
        }

    }

    /**
     * Берет данные из сессии или из базы данных и записывает в кеш
     *
     * @param $key string параметры сессии
     *
     * @return string
     */
    protected function getSessionData($key): string
    {
        $roSession = $this->sessionRO;
        if ($roSession !== null && array_key_exists($key, $roSession) && ! empty($roSession[$key])) {
            $value = $roSession[$key];
        } else {
            $value = PbxSettings::getValueByKey($key);
            $this->session->set($key, $value);
        }

        return $value;
    }

    /**
     * Генерирует хеш из версий установленных модулей и АТС, для корректного склеивания JS, CSS и локализаций.
     *
     */
    private function getVersionsHash(): string
    {
        $result          = PbxSettings::getValueByKey('PBXVersion');
        $modulesVersions = PbxExtensionModules::find(['columns' => 'id,version']);
        foreach ($modulesVersions as $module) {
            $result .= "{$module->version}{$module->version}";
        }

        return md5($result);
    }

    /**
     * Постобработка запроса
     *
     * @param \Phalcon\Mvc\Dispatcher $dispatcher
     *
     * @return \Phalcon\Http\Response|\Phalcon\Http\ResponseInterface
     */
    public function afterExecuteRoute(Dispatcher $dispatcher)
    {
        if ($this->request->isAjax() === true) {
            $this->view->disableLevel(
                [
                    View::LEVEL_ACTION_VIEW     => true,
                    View::LEVEL_LAYOUT          => true,
                    View::LEVEL_MAIN_LAYOUT     => true,
                    View::LEVEL_AFTER_TEMPLATE  => true,
                    View::LEVEL_BEFORE_TEMPLATE => true,
                ]
            );
            $this->response->setContentType('application/json', 'UTF-8');
            $data = $this->view->getParamsToView();

            /* Set global params if is not set in controller/action */
            if (is_array($data) && isset($data['raw_response'])) {
                $result = $data['raw_response'];
            } elseif (is_array($data)) {
                $data['success'] = array_key_exists('success', $data) ? $data['success'] : true;
                $data['reload']  = array_key_exists('reload', $data) ? $data['reload'] : false;
                $data['message'] = $data['message'] ?? $this->flash->getMessages();

                // Добавим информацию о последней ошибке для отображения диалогового окна для пользователя
                if (file_exists('/tmp/sendmetrics')) {
                    $data['lastSentryEventId'] = SentrySdk::getCurrentHub()->getLastEventId();
                }
                $result = json_encode($data);
            }

            $this->response->setContent($result);
        }

        return $this->response->send();
    }

    /**
     * Перехват события перед обработкой в контроллере
     */
    public function beforeExecuteRoute(): void
    {
        if ($this->request->isPost()) {
            $data = $this->request->getPost('submitMode');
            if ( ! empty($data)) {
                $this->session->set('SubmitMode', $data);
            }
        }
    }

    /**
     * Перевод страниц без перезагрузки страниц
     *
     * @param string $uri
     */
    protected function forward($uri): void
    {
        $uriParts = explode('/', $uri);
        $params   = array_slice($uriParts, 2);

        $this->dispatcher->forward(
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
    protected function transliterate($string): string
    {
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

        return strtr($string, $converter);
    }
}
