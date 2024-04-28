<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Cache\Adapter\Redis;
use Exception;
use GuzzleHttp;
use function MikoPBX\Common\Config\appPath;

class WikiLinksController extends BaseController
{
    /**
     * Prepares array of new wiki links and return ajax answer
     *
     */
    public function getWikiLinksReplacementAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $moduleUniqueId = $this->request->getPost('globalModuleUniqueId');
        if (!empty($moduleUniqueId)) {
            $this->customModuleWikiLinks($moduleUniqueId);
        } else {
            $this->customWikiLinks();
        }
    }

    /**
     * Customization of links to the wiki documentation.
     * @return void
     */
    private function customWikiLinks(): void
    {
        /** @var Redis $redis */
        $redis = $this->di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $language = 'en';
        if ($this->language === 'ru') {
            $language = 'ru';
        }
        $cacheKey = 'WIKI_LINKS:' . $language;

        $links = $redis->get($cacheKey) ?? [];

        if ($links === []) {
            $ttl = 86400;
            $client = new GuzzleHttp\Client();
            $url = 'https://raw.githubusercontent.com/mikopbx/Core/master/src/Common/WikiLinks/' . $language . '.json';

            try {
                $res = $client->request('GET', $url, ['timeout' => 5, 'connect_timeout' => 5, 'read_timeout' => 5]);
            } catch (GuzzleHttp\Exception\GuzzleException $e) {
                $res = null;
                $ttl = 3600;
                if ($e->getCode() !== 404) {
                    SystemMessages::sysLogMsg('WikiLinksController', 'Error access to raw.githubusercontent.com');
                }
            }
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
            $redis->set($cacheKey, $links, $ttl);
        }
        if (empty($links)) {

            $filename = appPath(str_replace('LANG', $language, 'src/Common/WikiLinks/LANG.json'));
            if (file_exists($filename)) {
                try {
                    $links = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
                } catch (\Exception $e) {
                    Util::sysLogMsg('WikiLinksController', $e->getMessage());
                }
            }
        }
        $this->view->success = true;
        $this->view->message = $links;
    }

    /**
     * Customization of links to the wiki documentation for modules.
     * @param string $uniqid
     * @return void
     */
    private function customModuleWikiLinks(string $uniqid): void
    {
        $module = PbxExtensionModules::findFirstByUniqid($uniqid);
        $links = [];
        if ($module !== null) {
            try {
                $links = json_decode($module->wiki_links, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException $e) {
                Util::sysLogMsg(__CLASS__, $e->getMessage());
            }
        }
        $this->view->success = true;
        $this->view->message = $links[$this->language] ?? [];
    }
}