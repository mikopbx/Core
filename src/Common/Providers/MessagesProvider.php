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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use function MikoPBX\Common\Config\appPath;

/**
 * The MessagesProvider class is responsible for registering the messages service.
 *
 * @package MikoPBX\Common\Providers
 */
class MessagesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'messages';

    /**
     * Register the messages service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $coreConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->path('core');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di, $coreConfig) {
                $cacheKey = false;
                $language = $di->get(LanguageProvider::SERVICE_NAME);
                if (php_sapi_name() !== 'cli') {
                    $version = PBXConfModulesProvider::getVersionsHash();
                    $cacheKey = 'LocalisationArray:' . $version . ':' . $language;
                }

                // Check if translations exist in the cache
                if ($cacheKey) {
                    $translates = $di->get(ManagedCacheProvider::SERVICE_NAME)->get($cacheKey, 3600);
                    if (is_array($translates)) {
                        return $translates;
                    }
                }

                $translates = [];

                // Load English translations
                $translates = require appPath('/src/Common/Messages/en.php');

                if ($language !== 'en') {
                    $additionalTranslates = [];
                    // Check if translation file exists for the selected language
                    $langFile = appPath("/src/Common/Messages/{$language}.php");
                    if (file_exists($langFile)) {
                        $additionalTranslates = require $langFile;
                        $translates = array_merge($translates, $additionalTranslates);
                    }
                }

                // Load English translations for extensions
                $extensionsTranslates = [[]];
                $results              = glob($coreConfig->modulesDir . '/*/{Messages}/en.php', GLOB_BRACE);
                foreach ($results as $path) {
                    $langArr = require $path;
                    if (is_array($langArr)) {
                        $extensionsTranslates[] = $langArr;
                    }
                }
                if ($extensionsTranslates !== [[]]) {
                    $translates = array_merge($translates, ...$extensionsTranslates);
                }
                if ($language !== 'en') {
                    $additionalTranslates = [[]];
                    $results              = glob(
                        $coreConfig->modulesDir . "/*/{Messages}/{$language}.php",
                        GLOB_BRACE
                    );
                    foreach ($results as $path) {
                        $langArr = require $path;
                        if (is_array($langArr)) {
                            $additionalTranslates[] = $langArr;
                            $translates = array_merge($translates, ...$additionalTranslates);
                        }
                    }
                }
                if ($cacheKey) {
                    $di->get(ManagedCacheProvider::SERVICE_NAME)->set($cacheKey, $translates);
                }

                // Return a translation object
                return $translates;
            }
        );
    }
}