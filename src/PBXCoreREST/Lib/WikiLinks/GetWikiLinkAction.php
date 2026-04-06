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

namespace MikoPBX\PBXCoreREST\Lib\WikiLinks;

use MikoPBX\Common\Library\Text;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Cache\Adapter\Redis;
use Phalcon\Di\Di;
use GuzzleHttp;

use function MikoPBX\Common\Config\appPath;

/**
 * Action to get wiki documentation link
 */
class GetWikiLinkAction
{
    /**
     * Get wiki documentation link based on controller, action, and language
     *
     * @param array $data Request parameters (controller, action, language, moduleId)
     * @return PBXApiResult Result with URL
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->success = true;

        // Validate required parameter
        if (empty($data['controller'])) {
            $res->success = false;
            $res->messages['error'][] = 'Parameter "controller" is required';
            $res->httpCode = 400;
            return $res;
        }

        // Extract parameters
        $controller = $data['controller'];
        $action = $data['action'] ?? 'index';
        $language = $data['language'] ?? 'en';
        $moduleId = $data['moduleId'] ?? null;

        // Convert controller name to URL format (CamelCase to kebab-case)
        $controllerNameUnCamelized = Text::uncamelize($controller, '-');

        // Generate base wiki URL
        $baseUrl = "https://wiki.mikopbx.com/{$controllerNameUnCamelized}";

        // Get link replacement mapping
        $finalUrl = $baseUrl;
        if (!empty($moduleId)) {
            $finalUrl = self::getModuleWikiLink($moduleId, $language, $baseUrl, $controller);
        } else {
            $finalUrl = self::getCoreWikiLink($language, $baseUrl);
        }

        $res->data = DataStructure::create($finalUrl);
        return $res;
    }

    /**
     * Get wiki link for core pages with replacement mapping
     *
     * @param string $language Language code
     * @param string $baseUrl Base wiki URL
     * @return string Final documentation URL
     */
    private static function getCoreWikiLink(string $language, string $baseUrl): string
    {
        $di = Di::getDefault();
        /** @var Redis $redis */
        $redis = $di->getShared(ManagedCacheProvider::SERVICE_NAME);

        // Use only supported languages for mapping
        $mappingLanguage = ($language === 'ru') ? 'ru' : 'en';
        $cacheKey = 'WIKI_LINKS:' . $mappingLanguage;

        $links = $redis->get($cacheKey) ?? [];

        if ($links === []) {
            $ttl = 86400; // 24 hours
            $client = new GuzzleHttp\Client();
            $url = 'https://raw.githubusercontent.com/mikopbx/Core/refs/heads/master/src/Common/WikiLinks/' . $mappingLanguage . '.json';

            try {
                $res = $client->request('GET', $url, ['timeout' => 5, 'connect_timeout' => 5, 'read_timeout' => 5]);
            } catch (GuzzleHttp\Exception\GuzzleException $e) {
                $res = null;
                $ttl = 3600; // 1 hour retry on error
                if ($e->getCode() !== 404) {
                    SystemMessages::sysLogMsg('GetWikiLinkAction', 'Error accessing raw.githubusercontent.com');
                }
            }

            if ($res && $res->getStatusCode() === 200) {
                try {
                    $links = json_decode($res->getBody(), true, 512, JSON_THROW_ON_ERROR);
                } catch (\Exception $e) {
                    $ttl = 3600;
                }
            }

            if (!is_array($links)) {
                $links = [];
            }
            $redis->set($cacheKey, $links, $ttl);
        }

        // If empty from GitHub, try local file
        if (empty($links)) {
            $filename = appPath(str_replace('LANG', $mappingLanguage, 'src/Common/WikiLinks/LANG.json'));
            if (file_exists($filename)) {
                try {
                    $links = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
                } catch (\Exception $e) {
                    SystemMessages::sysLogMsg('GetWikiLinkAction', $e->getMessage());
                }
            }
        }

        // Apply link replacement if mapping exists
        if (is_array($links) && isset($links[$baseUrl])) {
            return $links[$baseUrl];
        }

        return $baseUrl;
    }

    /**
     * Get wiki link for module pages
     *
     * @param string $uniqid Module unique ID
     * @param string $language Language code
     * @param string $baseUrl Base wiki URL (fallback)
     * @param string $controller Controller name for anchor
     * @return string Final documentation URL
     */
    private static function getModuleWikiLink(string $uniqid, string $language, string $baseUrl, string $controller = ''): string
    {
        $module = PbxExtensionModules::findFirstByUniqid($uniqid);

        if ($module === null) {
            return $baseUrl;
        }

        // First, check if module has custom wiki_links configured
        if (!empty($module->wiki_links)) {
            try {
                $links = json_decode($module->wiki_links, true, 512, JSON_THROW_ON_ERROR);

                if (is_array($links) && isset($links[$language])) {
                    // Module has language-specific links
                    if (is_string($links[$language])) {
                        return $links[$language];
                    }
                    // If it's an array, look for specific page mapping
                    if (is_array($links[$language]) && isset($links[$language][$baseUrl])) {
                        return $links[$language][$baseUrl];
                    }
                }
            } catch (\JsonException $e) {
                SystemMessages::sysLogMsg(__CLASS__, $e->getMessage());
            }
        }

        // Generate automatic documentation URL based on developer and module ID
        return self::generateModuleDocUrl($uniqid, $module->developer ?? '', $language, $controller);
    }

    /**
     * Generate automatic documentation URL for module
     *
     * URL pattern:
     * - EN: https://docs.mikopbx.com/mikopbx/english/modules/{developer}/{module-slug}#{controller-slug}
     * - RU: https://docs.mikopbx.ru/mikopbx/modules/{developer}/{module-slug}#{controller-slug}
     *
     * @param string $moduleId Module unique ID (e.g., ModuleUsersUI)
     * @param string $developer Developer name from module record
     * @param string $language Language code (en/ru)
     * @param string $controller Controller name for anchor
     * @return string Generated documentation URL
     */
    private static function generateModuleDocUrl(string $moduleId, string $developer, string $language, string $controller): string
    {
        // Normalize developer: empty = "miko", otherwise lowercase with special chars replaced by hyphens
        $developerSlug = self::normalizeSlug($developer, 'miko');

        // Convert module ID to slug (ModuleUsersUI → module-users-u-i)
        $moduleSlug = Text::uncamelize($moduleId, '-');

        // Convert controller to slug (UserProfile → user-profile)
        $controllerSlug = Text::uncamelize($controller, '-');

        // Build URL based on language
        if ($language === 'ru') {
            $url = "https://docs.mikopbx.ru/mikopbx/modules/{$developerSlug}/{$moduleSlug}";
        } else {
            $url = "https://docs.mikopbx.com/mikopbx/english/modules/{$developerSlug}/{$moduleSlug}";
        }

        // Add controller as anchor
        if (!empty($controllerSlug)) {
            $url .= "#{$controllerSlug}";
        }

        return $url;
    }

    /**
     * Normalize string to URL-safe slug
     *
     * @param string $value Input string
     * @param string $default Default value if input is empty
     * @return string Normalized slug
     */
    private static function normalizeSlug(string $value, string $default = ''): string
    {
        $value = trim($value);

        if ($value === '') {
            return $default;
        }

        // Replace any non-alphanumeric characters with hyphens, convert to lowercase
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $value));

        // Remove leading/trailing hyphens
        return trim($slug, '-');
    }
}
