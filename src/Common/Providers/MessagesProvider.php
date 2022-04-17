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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\AdminCabinet\Providers\SessionProvider;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

use function MikoPBX\Common\Config\appPath;

class MessagesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'messages';


    /**
     * Register messages service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $coreConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->path('core');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di, $coreConfig) {
                $cacheKey = false;
                $language = $di->get(LanguageProvider::SERVICE_NAME);
                if (php_sapi_name() !== 'cli'){
                    $session  = $di->get(SessionProvider::SERVICE_NAME);
                    if ($session !== null && $session->has('versionHash')) {
                        $cacheKey = 'LocalisationArray:' . $session->get('versionHash') .':'. $language;
                    }
                }

                // Заглянем сначала в кеш переводов
                if ($cacheKey) {
                    $translates = $di->get(ManagedCacheProvider::SERVICE_NAME)->get($cacheKey, 3600);
                    if (is_array($translates)) {
                        return $translates;
                    }
                }

                $translates = [];
                // Возьмем английский интерфейс
                $enFilePath = appPath('/src/Common/Messages/en.php');
                if (file_exists($enFilePath)) {
                    $translates = require $enFilePath;
                }

                if ($language !== 'en') {
                    $additionalTranslates = [];
                    // Check if we have a translation file for that lang
                    $langFile = appPath("/src/Common/Messages/{$language}.php");
                    if (file_exists($langFile)) {
                        $additionalTranslates = require $langFile;
                    }
                    // Заменим английские переводы на выбранный админом язык
                    if ($additionalTranslates !== [[]]) {
                        $translates = array_merge($translates, $additionalTranslates);
                    }
                }

                // Возьмем английский перевод расширений
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
                        }
                    }
                    if ($additionalTranslates !== [[]]) {
                        $translates = array_merge($translates, ...$additionalTranslates);
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