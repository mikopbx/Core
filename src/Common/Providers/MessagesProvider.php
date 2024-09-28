<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
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
    public const string SERVICE_NAME = 'messages';

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
                file_put_contents('/tmp/language',$language,FILE_APPEND);
                if (php_sapi_name() !== 'cli') {
                    $version = PBXConfModulesProvider::getVersionsHash();
                    $cacheKey = 'LocalisationArray:' . $version . ':' . $language;
                }

                // Check if translations exist in the cache
                if ($cacheKey) {
                    $translates = $di->get(ManagedCacheProvider::SERVICE_NAME)->get($cacheKey, 3600);
                    if (is_array($translates)) {
                        file_put_contents('/tmp/language.fromCache',$language,FILE_APPEND);
                        return $translates;
                    }
                }
                file_put_contents('/tmp/language.NotfromCache',$language,FILE_APPEND);
                // Load English translations
                $translates = self::includeLanguageFile(appPath('/src/Common/Messages/en.php'));

                if ($language !== 'en') {
                    // Check if the translation file exists for the selected language
                    $langFile = appPath("/src/Common/Messages/$language.php");
                    if (file_exists($langFile)) {
                        $langArr = self::includeLanguageFile($langFile);
                        if (!empty($langArr)) {
                            $translates = array_merge($translates, $langArr);
                        }
                    }
                }

                // Load English translations for extensions
                $extensionsTranslates = [[]];
                $results              = glob($coreConfig->modulesDir . '/*/{Messages}/en.php', GLOB_BRACE);
                foreach ($results as $path) {
                    $langArr =  self::includeLanguageFile($path);
                    if (!empty($langArr)) {
                        $extensionsTranslates[] = $langArr;
                    }
                }
                if ($extensionsTranslates !== [[]]) {
                    $translates = array_merge($translates, ...$extensionsTranslates);
                }
                if ($language !== 'en') {
                    $additionalTranslates = [[]];
                    $results              = glob(
                        $coreConfig->modulesDir . "/*/{Messages}/$language.php",
                        GLOB_BRACE
                    );
                    foreach ($results as $path) {
                        $langArr = self::includeLanguageFile($path);
                        if (!empty($langArr)) {
                            $additionalTranslates[] = $langArr;
                            $translates = array_merge($translates, ...$additionalTranslates);
                        }
                    }
                }

                // Load language static array
                $translates = array_merge($translates, self::getAvailableLanguages());

                if ($cacheKey) {
                    $di->get(ManagedCacheProvider::SERVICE_NAME)->set($cacheKey, $translates);
                }

                // Return a translation object
                return $translates;
            }
        );
    }

    /**
     * Includes the language file and returns its content as an array.
     *
     * @param string $path The path to the language file.
     * @return array The language array if successful, otherwise an empty array.
     */
    private static function includeLanguageFile(string $path): array
    {
        try {
            // Try to include the language file and store its content in $langArr.
            $langArr = require $path;

            // Check if $langArr is an array and return it if successful.
            if (is_array($langArr)) {
                return $langArr;
            }
        } catch (\Throwable $e) {
            // If an error occurs while including the file, log the exception and error message.
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        // Return an empty array if there was an error or $langArr is not an array.
        return [];
    }

    /**
     * Retrieve the list of available languages for system selectors.
     * Each language is represented in its own native language.
     *
     * @return array An associative array where keys are language codes and values are language names in their native form.
     */
    public static function getAvailableLanguages():array
    {
        return [
            'ex_Russian' => 'Русский',
            'ex_English' => 'English',
            'ex_EnglishUK' => 'English (UK)',
            'ex_Japanese' => '日本語',
            'ex_Deutsch' => 'Deutsch',
            'ex_Danish' => 'Dansk',
            'ex_Spanish' => 'Español',
            'ex_Greek' => 'Ελληνικά',
            'ex_French' => 'Français',
            'ex_Italian' => 'Italiano',
            'ex_Portuguese' => 'Português',
            'ex_PortugueseBrazil' => 'Português (Brasil)',
            'ex_Ukrainian' => 'Українська',
            'ex_Vietnamese' => 'Tiếng Việt',
            'ex_Chinese' => '中文',
            'ex_Polish' => 'Polski',
            'ex_Dutch' => 'Nederlands',
            'ex_Swedish' => 'Svenska',
            'ex_Czech' => 'Čeština',
            'ex_Turkish' => 'Türkçe',
            'ex_Georgian' => 'ქართული',
            'ex_Azerbaijan' => 'Azərbaycan',
            'ex_Romanian' => 'Română',
            'ex_Thai' => 'ไทย',
            'ex_Finnish' => 'Suomi',
            'ex_Hungarian' => 'Magyar',
        ];
    }
}