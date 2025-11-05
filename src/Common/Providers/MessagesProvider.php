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
                // Load English translations from directory (new structure for main distribution)
                $translates = self::loadLanguageDirectory(appPath('/src/Common/Messages/en'));
                
                if ($language !== 'en') {
                    // Load translations for the selected language from directory
                    $langDirectory = appPath("/src/Common/Messages/$language");
                    $langArr = self::loadLanguageDirectory($langDirectory);
                    if (!empty($langArr)) {
                        $translates = array_merge($translates, $langArr);
                    }
                }

                // Load English translations for extensions (supports both old and new structure)
                $extensionsTranslates = self::loadModuleTranslations($coreConfig->modulesDir, 'en');
                if (!empty($extensionsTranslates)) {
                    $translates = array_merge($translates, $extensionsTranslates);
                }

                // Load translations for the selected language from modules
                if ($language !== 'en') {
                    $additionalTranslates = self::loadModuleTranslations($coreConfig->modulesDir, $language);
                    if (!empty($additionalTranslates)) {
                        $translates = array_merge($translates, $additionalTranslates);
                    }
                }

                // Load language static array from LanguageProvider
                $translates = array_merge($translates, self::getLanguageTranslations());

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
     * Loads all language files from a directory and merges them into a single array.
     *
     * @param string $directory The directory path containing language files.
     * @return array The merged language array from all files in the directory.
     */
    private static function loadLanguageDirectory(string $directory): array
    {
        $translations = [];
        
        if (!is_dir($directory)) {
            return $translations;
        }

        // Get all PHP files in the directory
        $files = glob($directory . '/*.php');
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $fileTranslations = self::includeLanguageFile($file);
                if (!empty($fileTranslations)) {
                    $translations = array_merge($translations, $fileTranslations);
                }
            }
        }
        
        return $translations;
    }

    /**
     * Loads translations from all modules for a given language.
     * Supports both old (single file) and new (directory with multiple files) structures.
     *
     * Old structure (backward compatibility):
     *   ModuleName/Messages/en.php
     *   ModuleName/Messages/ru.php
     *
     * New structure (Language Pack modules):
     *   ModuleName/Messages/en/Common.php
     *   ModuleName/Messages/en/Extensions.php
     *   ModuleName/Messages/ja/Common.php
     *
     * @param string $modulesDir The modules directory path.
     * @param string $language The language code (e.g., 'en', 'ru', 'ja').
     * @return array The merged translations from all modules.
     */
    private static function loadModuleTranslations(string $modulesDir, string $language): array
    {
        $translations = [];

        // Get all module directories
        $moduleDirs = glob($modulesDir . '/*', GLOB_ONLYDIR);

        foreach ($moduleDirs as $moduleDir) {
            $moduleTranslations = [];

            // Check for NEW structure first (directory with multiple files)
            $newStructurePath = "$moduleDir/Messages/$language";
            if (is_dir($newStructurePath)) {
                // Load all PHP files from the language directory
                $moduleTranslations = self::loadLanguageDirectory($newStructurePath);
            } else {
                // Fallback to OLD structure (single file for backward compatibility)
                $oldStructurePath = "$moduleDir/Messages/$language.php";
                if (file_exists($oldStructurePath)) {
                    $moduleTranslations = self::includeLanguageFile($oldStructurePath);
                }
            }

            // Merge module translations into the main array
            if (!empty($moduleTranslations)) {
                $translations = array_merge($translations, $moduleTranslations);
            }
        }

        return $translations;
    }

    /**
     * Generate translation keys for language names (ex_Russian => 'Русский')
     * Uses LanguageProvider::AVAILABLE_LANGUAGES as single source of truth
     *
     * @return array Translation keys mapped to native language names
     */
    private static function getLanguageTranslations(): array
    {
        $translations = [];

        // Build translations directly from LanguageProvider constant
        foreach (LanguageProvider::AVAILABLE_LANGUAGES as $info) {
            $translations[$info['translationKey']] = $info['name'];
        }

        return $translations;
    }
}