<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Providers\ModelsCacheProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use Phalcon\Mvc\{Controller, View};
use Phalcon\Cache\Adapter\Redis;
use Phalcon\Tag;
use Phalcon\Text;
use Sentry\SentrySdk;
use GuzzleHttp;
use Exception;

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
 * @property \Phalcon\Logger                                loggerAuth
 */
class BaseController extends Controller
{
    protected string $actionName;
    protected string $controllerName;
    protected string $controllerNameUnCamelized;

    public const WIKI_LINKS = '/var/etc/wiki-links-LANG.json';

    /**
     * Initializes base class
     */
    public function initialize(): void
    {
        $this->actionName                = $this->dispatcher->getActionName();
        $this->controllerName            = Text::camelize($this->dispatcher->getControllerName(), '_');
        $this->controllerNameUnCamelized = Text::uncamelize($this->controllerName, '-');

        $this->moduleName = $this->dispatcher->getModuleName();

        if ($this->request->isAjax() === false) {
            $this->prepareView();
        }
    }

    /**
     * Кастомизация ссылок на wiki документацию.
     * @return void
     */
    private function customWikiLinks(): void
    {
        /** @var Redis $cache */
        $cache  = $this->di->getShared(ModelsCacheProvider::SERVICE_NAME);
        $links  = $cache->get('WIKI_LINKS');
        if($links === null){
            $ttl = 86400;
            $client = new GuzzleHttp\Client();
            $url = 'https://raw.githubusercontent.com/mikopbx/Core/master/src/Common/WikiLinks/'.$this->language.'.json';
            try {
                $res = $client->request('GET', $url, ['timeout', 1]);
            }catch (Exception $e){
                $res = null;
                $ttl = 3600;
                if($e->getCode() !== 404){
                    Util::sysLogMsg('BaseController', 'Error access to raw.04githubusercontent.com');
                }
            }
            $links = null;
            if($res && $res->getStatusCode() === 200){
                try {
                    $links = json_decode($res->getBody(), true, 512, JSON_THROW_ON_ERROR);
                }catch (Exception $e){
                    $ttl = 3600;
                }
            }
            if(!is_array($links)){
                $links = [];
            }
            $cache->set('WIKI_LINKS', $links, $ttl);
        }

        $filename = str_replace('LANG', $this->language, self::WIKI_LINKS);
        if(file_exists($filename)){
            try {
                $local_links = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
                $links = $local_links;
            }catch (\Exception $e){
                Util::sysLogMsg('BaseController', $e->getMessage());
            }
        }
        $this->view->urlToWiki    = $links[$this->view->urlToWiki]??$this->view->urlToWiki;
        $this->view->urlToSupport = $links[$this->view->urlToSupport]??$this->view->urlToSupport;
        $this->view->urlToWiki = "-1-";
    }

    /**
     * Prepares some environments to every controller and view
     *
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
        // Кеш версий модулей и атс, для правильной работы АТС при установке модулей
        $versionHash = $this->getVersionsHash();
        $this->session->set('versionHash', $versionHash);

        $this->view->WebAdminLanguage   = $this->getSessionData('WebAdminLanguage');
        $this->view->AvailableLanguages = json_encode($this->elements->getAvailableWebAdminLanguages());

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

        $this->customWikiLinks();

        $this->view->urlToController = $this->url->get($this->controllerNameUnCamelized);
        $this->view->represent       = '';
        $this->view->cacheName       = "{$this->controllerName}{$this->actionName}{$this->language}{$versionHash}";

        // If it is module we have to use another template
        if ($this->moduleName === 'PBXExtension') {
            $this->view->setTemplateAfter('modules');
        } else {
            $this->view->setTemplateAfter('main');
        }

    }

    /**
     * Gets data from session or database if it not exists in session store
     *
     * @param $key string session parameter
     *
     * @return string
     */
    protected function getSessionData(string $key): string
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
     * Generates common hash sum for correct combine CSS and JS according to installed modules
     *
     */
    private function getVersionsHash(): string
    {
        $result          = PbxSettings::getValueByKey('PBXVersion');
        $modulesVersions = PbxExtensionModules::getModulesArray();
        foreach ($modulesVersions as $module) {
            $result .= "{$module['id']}{$module['version']}";
        }

        return md5($result);
    }

    /**
     * Changes the AJAX response by expected format
     *
     * @return \Phalcon\Http\Response|\Phalcon\Http\ResponseInterface
     */
    public function afterExecuteRoute()
    {
        if ($this->request->isAjax() === true) {
            $this->view->setRenderLevel(View::LEVEL_NO_RENDER);
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
            } else {
                $result = '';
            }

            $this->response->setContent($result);
        }

        return $this->response->send();
    }

    /**
     * Callback before execute any route
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
     * Change page without reload browser page
     *
     * @param string $uri
     */
    protected function forward(string $uri): void
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
     * Removes all dangerous symbols from CallerID
     * @param string $callerId
     *
     * @return string
     */
    protected function sanitizeCallerId(string $callerId): string
    {
        return preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $callerId);
    }

    /**
     * Sorts array by priority field
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    protected function sortArrayByPriority($a, $b): ?int
    {
        if (is_array($a)){
            $a = (int)$a['priority'];
        } else {
            $a = (int)$a->priority;
        }

        if (is_array($b)){
            $b = (int)$b['priority'];
        } else {
            $b = (int)$b->priority;
        }

        if ($a === $b) {
            return 0;
        } else {
            return ($a < $b) ? -1 : 1;
        }
    }
}
