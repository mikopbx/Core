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

use Exception;
use GuzzleHttp;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Util;
use Phalcon\Cache\Adapter\Redis;
use Phalcon\Http\ResponseInterface;
use Phalcon\Mvc\{Controller, View};
use Phalcon\Tag;
use Phalcon\Text;
use Sentry\SentrySdk;

/**
 * @property \Phalcon\Session\Manager session
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property string language
 * @property bool showModuleStatusToggle if false it hides status toggle on current UI page
 * @property \MikoPBX\AdminCabinet\Library\Elements elements
 * @property \Phalcon\Flash\Session flash
 * @property \Phalcon\Tag tag
 * @property \Phalcon\Config\Adapter\Json config
 * @property \Phalcon\Logger loggerAuth
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
        $this->actionName = $this->dispatcher->getActionName();
        $this->controllerName = Text::camelize($this->dispatcher->getControllerName(), '_');
        $this->controllerNameUnCamelized = Text::uncamelize($this->controllerName, '-');

        if ($this->request->isAjax() === false) {
            $this->prepareView();
        }
    }

    /**
     * Customization of links to the wiki documentation for modules.
     * @param array $links
     * @return void
     */
    private function customModuleWikiLinks(array $links): void
    {
        $this->view->urlToWiki = $links[$this->language][$this->view->urlToWiki] ?? $this->view->urlToWiki;
        $this->view->urlToSupport = $links[$this->language][$this->view->urlToSupport] ?? $this->view->urlToSupport;
    }

    /**
     * Customization of links to the wiki documentation.
     * @return void
     */
    private function customWikiLinks(): void
    {
        if (!$this->session->has(SessionController::SESSION_ID)) {
            return;
        }
        /** @var Redis $cache */
        $cache = $this->di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $links = $cache->get('WIKI_LINKS');

        if ($links === null) {
            $ttl = 86400;
            $client = new GuzzleHttp\Client();
            $url = 'https://raw.githubusercontent.com/mikopbx/Core/master/src/Common/WikiLinks/' . $this->language . '.json';
            try {
                $res = $client->request('GET', $url, ['timeout', 1, 'connect_timeout' => 1, 'read_timeout' => 1]);
            } catch (Exception $e) {
                $res = null;
                $ttl = 3600;
                if ($e->getCode() !== 404) {
                    Util::sysLogMsg('BaseController', 'Error access to raw.githubusercontent.com');
                }
            }
            $links = null;
            if ($res && $res->getStatusCode() === 200) {
                try {
                    $links = json_decode($res->getBody(), true, 512, JSON_THROW_ON_ERROR);
                } catch (Exception $e) {
                    $ttl = 3600;
                }
            }
            if (!is_array($links)) {
                $links = [];
            }
            $cache->set('WIKI_LINKS', $links, $ttl);
        }

        $filename = str_replace('LANG', $this->language, self::WIKI_LINKS);
        if (file_exists($filename)) {
            try {
                $local_links = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
                $links = $local_links;
            } catch (\Exception $e) {
                Util::sysLogMsg('BaseController', $e->getMessage());
            }
        }
        $this->view->urlToWiki = $links[$this->view->urlToWiki] ?? $this->view->urlToWiki;
        $this->view->urlToSupport = $links[$this->view->urlToSupport] ?? $this->view->urlToSupport;
    }

    /**
     * Prepares some environments to every controller and view
     *
     */
    protected function prepareView(): void
    {
        date_default_timezone_set($this->getSessionData('PBXTimezone'));
        $this->view->PBXVersion = $this->getSessionData('PBXVersion');
        $this->view->setVar('MetaTegHeadDescription', $this->translation->_('MetategHeadDescription'));
        if ($this->session->has(SessionController::SESSION_ID)) {
            $this->view->SSHPort = $this->getSessionData('SSHPort');
            $this->view->PBXLicense = $this->getSessionData('PBXLicense');
        } else {
            $this->view->SSHPort = '';
            $this->view->PBXLicense = '';
        }
        // Module and PBX version caching for proper PBX operation when installing modules.
        $versionHash = $this->getVersionsHash();
        $this->session->set('versionHash', $versionHash);

        $this->view->WebAdminLanguage = $this->getSessionData('WebAdminLanguage');
        $this->view->AvailableLanguages = json_encode($this->elements->getAvailableWebAdminLanguages());
        $this->view->submitMode = $this->session->get('SubmitMode')??'SaveSettings';

        // Allow anonymous statistics collection for JS code
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
                $title .= '|' . $this->translation->_("Breadcrumb{$this->controllerName}");
                break;
            default:
                $title .= '|' . $this->translation->_("Breadcrumb{$this->controllerName}{$this->actionName}");
        }
        Tag::setTitle($title);
        $this->view->t = $this->translation;
        $this->view->debugMode = $this->config->path('adminApplication.debugMode');
        $this->view->urlToLogo = $this->url->get('assets/img/logo-mikopbx.svg');
        $this->view->urlToWiki = "https://wiki.mikopbx.com/{$this->controllerNameUnCamelized}";
        if ($this->language === 'ru') {
            $this->view->urlToSupport = 'https://www.mikopbx.ru/support/?fromPBX=true';
        } else {
            $this->view->urlToSupport = 'https://www.mikopbx.com/support/?fromPBX=true';
        }
        $this->view->urlToController = $this->url->get($this->controllerNameUnCamelized);
        $this->view->represent = '';
        $this->view->cacheName = "{$this->controllerName}{$this->actionName}{$this->language}{$versionHash}";

        $isExternalModuleController = stripos($this->dispatcher->getNamespaceName(), '\\Module') === 0;
        // We can disable module status toggle from module controller, using the showModuleStatusToggle variable
        if (property_exists($this, 'showModuleStatusToggle')) {
            $this->view->setVar('showModuleStatusToggle', $this->showModuleStatusToggle);
        } else {
            $this->view->setVar('showModuleStatusToggle', true);
        }

        // Add module variables into view
        if ($isExternalModuleController) {
            $moduleLinks = [];
            /** @var PbxExtensionModules $module */
            $module = PbxExtensionModules::findFirstByUniqid($this->controllerName);
            if ($module === null) {
                $module = new PbxExtensionModules();
                $module->disabled = '1';
                $module->name = 'Unknown module';
            } else {
                try {
                    $links = json_decode($module->wiki_links, true, 512, JSON_THROW_ON_ERROR);
                    if (is_array($links)) {
                        $moduleLinks = $links;
                    }
                } catch (\JsonException $e) {
                    Util::sysLogMsg(__CLASS__, $e->getMessage());
                }
            }
            $this->view->setVar('module', $module);
            $this->customModuleWikiLinks($moduleLinks);

            // If it is module we have to use another volt template
            $this->view->setTemplateAfter('modules');
        } else {
            $this->customWikiLinks();
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
        if ($this->session->has($key)) {
            $value = $this->session->get($key);
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
        $result = PbxSettings::getValueByKey('PBXVersion');
        $modulesVersions = PbxExtensionModules::getModulesArray();
        foreach ($modulesVersions as $module) {
            $result .= "{$module['id']}{$module['version']}";
        }
        return md5($result);
    }

    /**
     * Changes the AJAX response by expected format
     *
     * @return \Phalcon\Http\ResponseInterface
     */
    public function afterExecuteRoute():ResponseInterface
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
                $data['reload'] = array_key_exists('reload', $data) ? $data['reload'] : false;
                $data['message'] = $data['message'] ?? $this->flash->getMessages();

                // Let's add information about the last error to display a dialog window for the user.
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
            if (!empty($data)) {
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
        $params = array_slice($uriParts, 2);

        $this->dispatcher->forward(
            [
                'controller' => $uriParts[0],
                'action' => $uriParts[1],
                'params' => $params,
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
        if (is_array($a)) {
            $a = (int)$a['priority'];
        } else {
            $a = (int)$a->priority;
        }

        if (is_array($b)) {
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
