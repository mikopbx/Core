<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;

/**
 * Class SoundFilesConf
 *
 * Manages Asterisk sound files initialization and module sound integration
 *
 * @package MikoPBX\Core\System\Configs
 */
class SoundFilesConf extends SystemConfigClass
{
    public const string PROC_NAME = 'soundfiles';

    /**
     * Source directory for system sound files (read-only)
     */
    private const string SOURCE_SOUNDS_DIR = '/offload/asterisk/sounds';

    /**
     * Start the service - initialize writable sounds directory with all available languages
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        // Get target directory path
        $targetSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        // Check if sounds directory is already initialized
        if ($this->isSoundsDirectoryInitialized($targetSoundsDir)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Sound files already initialized: ' . $targetSoundsDir, LOG_DEBUG);

            // Reinstall module sounds (in case container was restarted)
            $this->reinstallEnabledModuleSounds();

            return true;
        }

        // Create target directory if it doesn't exist
        Util::mwMkdir($targetSoundsDir);

        // Get all languages from source directory
        $sourceLanguages = $this->getSourceLanguages();

        if (empty($sourceLanguages)) {
            SystemMessages::sysLogMsg(__METHOD__, 'No languages found in source directory', LOG_WARNING);
            return false;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'Found ' . count($sourceLanguages) . ' languages in source directory: ' . implode(', ', $sourceLanguages),
            LOG_INFO
        );

        // Copy all language directories
        $success = true;
        foreach ($sourceLanguages as $lang) {
            if (!$this->copyLanguageDirectory($lang, $targetSoundsDir)) {
                $success = false;
            }
        }

        if ($success) {
            SystemMessages::sysLogMsg(__METHOD__, 'Sound files initialized successfully to: ' . $targetSoundsDir, LOG_INFO);

            // Reinstall module sounds after base languages initialization
            $this->reinstallEnabledModuleSounds();
        } else {
            SystemMessages::sysLogMsg(__METHOD__, 'Some sound files failed to initialize', LOG_WARNING);
        }

        return $success;
    }

    /**
     * Check if sounds directory is already initialized
     *
     * @param string $targetDir Target sounds directory
     * @return bool True if initialized
     */
    private function isSoundsDirectoryInitialized(string $targetDir): bool
    {
        if (!is_dir($targetDir)) {
            return false;
        }

        // Check if directory has any language subdirectories
        $dirs = glob("$targetDir/*", GLOB_ONLYDIR);

        if (empty($dirs)) {
            return false;
        }

        // Check if at least one directory is a valid language directory with files
        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only check directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $files = scandir($dir);
                if (count($files) > 2) { // More than just . and ..
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get all available languages from source directory
     *
     * Scans the source sounds directory for language subdirectories matching
     * the language-country format (xx-xx). This allows automatic discovery
     * of all packaged languages without hardcoding the list.
     *
     * @return array List of language codes found in source directory
     */
    private function getSourceLanguages(): array
    {
        if (!is_dir(self::SOURCE_SOUNDS_DIR)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Source sounds directory not found: ' . self::SOURCE_SOUNDS_DIR, LOG_WARNING);
            return [];
        }

        $languages = [];
        $dirs = glob(self::SOURCE_SOUNDS_DIR . '/*', GLOB_ONLYDIR);

        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only include directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $languages[] = $lang;
            }
        }

        sort($languages);
        return $languages;
    }

    /**
     * Copy language directory from source to target
     *
     * @param string $language Language code (e.g., 'en-en', 'ru-ru')
     * @param string $targetSoundsDir Target sounds directory
     * @return bool True if successful
     */
    private function copyLanguageDirectory(string $language, string $targetSoundsDir): bool
    {
        $sourceLangDir = self::SOURCE_SOUNDS_DIR . '/' . $language;
        $targetLangDir = $targetSoundsDir . '/' . $language;

        // Check if source exists
        if (!is_dir($sourceLangDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Source language directory not found: $sourceLangDir", LOG_WARNING);
            return false;
        }

        // Create target language directory
        Util::mwMkdir($targetLangDir);

        // Use cp command for efficient recursive copy
        $cpPath = Util::which('cp');
        $sourceDir = escapeshellarg($sourceLangDir);
        $targetDir = escapeshellarg($targetSoundsDir);

        $command = "$cpPath -r $sourceDir $targetDir";
        $exitCode = Processes::mwExec($command);

        if ($exitCode === 0) {
            SystemMessages::sysLogMsg(__METHOD__, "Language '$language' copied successfully", LOG_DEBUG);
            return true;
        }

        SystemMessages::sysLogMsg(__METHOD__, "Failed to copy language '$language'. Exit code: $exitCode", LOG_WARNING);
        return false;
    }

    /**
     * Reinstall sound files for all enabled modules
     *
     * This method is called during system startup to restore module sound files
     * after container restart when /mountpoint is cleared.
     *
     * @return void
     */
    private function reinstallEnabledModuleSounds(): void
    {
        // Query all enabled modules from database
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            SystemMessages::sysLogMsg(__METHOD__, 'DI container not available, skipping module sounds reinstallation', LOG_WARNING);
            return;
        }

        $parameters = [
            'conditions' => 'disabled=0',
        ];

        try {
            $modules = \MikoPBX\Common\Models\PbxExtensionModules::find($parameters)->toArray();
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to query enabled modules: " . $e->getMessage(), LOG_WARNING);
            return;
        }

        if (empty($modules)) {
            SystemMessages::sysLogMsg(__METHOD__, 'No enabled modules found, skipping sounds reinstallation', LOG_DEBUG);
            return;
        }

        SystemMessages::sysLogMsg(__METHOD__, 'Reinstalling sound files for ' . count($modules) . ' enabled modules', LOG_INFO);

        foreach ($modules as $module) {
            $moduleUniqueID = $module['uniqid'];

            // Check if module has Sounds directory
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
            $moduleSoundsDir = "$moduleDir/Sounds";

            if (!is_dir($moduleSoundsDir)) {
                continue; // Module doesn't have sounds
            }

            // Reinstall sound files
            try {
                self::installModuleSounds($moduleUniqueID);
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to reinstall sounds for module $moduleUniqueID: " . $e->getMessage(),
                    LOG_WARNING
                );
            }
        }
    }

    /**
     * Install sound files from module to system sounds directory
     *
     * Supports two module types:
     * 1. Language Pack modules: Files copied WITHOUT prefix (replace/extend system sounds)
     * 2. Feature modules: Files copied WITH prefix (modulename-sound.wav)
     *
     * Structure: ModuleName/Sounds/{lang}/*.wav
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function installModuleSounds(string $moduleUniqueID): bool
    {
        $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $moduleSoundsDir = "$moduleDir/Sounds";
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        if (!is_dir($moduleSoundsDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID has no Sounds directory", LOG_DEBUG);
            return true; // Not an error - module just doesn't have sounds
        }

        // Get all language directories in module
        $langDirs = glob("$moduleSoundsDir/*", GLOB_ONLYDIR);
        if (empty($langDirs)) {
            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID sounds directory is empty", LOG_DEBUG);
            return true;
        }

        // Determine module type
        $isLanguagePack = PbxExtensionUtils::isLanguagePackModule($moduleUniqueID);
        $moduleType = $isLanguagePack ? 'Language Pack' : 'Feature';

        SystemMessages::sysLogMsg(__METHOD__, "Installing $moduleType module sounds: $moduleUniqueID", LOG_INFO);

        $success = true;
        foreach ($langDirs as $langDir) {
            $lang = basename($langDir);
            $targetLangDir = "$systemSoundsDir/$lang";

            // Create language directory if it doesn't exist
            if (!is_dir($targetLangDir)) {
                Util::mwMkdir($targetLangDir);
            }

            // Copy sound files (with or without prefix based on module type)
            $soundFiles = glob("$langDir/*.{wav,ulaw,alaw,gsm,g722,sln,mp3}", GLOB_BRACE);
            foreach ($soundFiles as $soundFile) {
                $fileName = basename($soundFile);

                // Language Pack: no prefix, Feature module: with prefix
                $destFileName = $isLanguagePack
                    ? $fileName
                    : strtolower($moduleUniqueID) . '-' . $fileName;

                $destFile = "$targetLangDir/$destFileName";

                if (!copy($soundFile, $destFile)) {
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to copy sound file: $soundFile", LOG_WARNING);
                    $success = false;
                } else {
                    SystemMessages::sysLogMsg(__METHOD__, "Installed sound: $destFileName (language: $lang, type: $moduleType)", LOG_DEBUG);
                }
            }

            // Copy subdirectories (e.g., digits/, letters/)
            $subDirs = glob("$langDir/*", GLOB_ONLYDIR);
            foreach ($subDirs as $subDir) {
                $subDirName = basename($subDir);
                $targetSubDir = "$targetLangDir/$subDirName";

                if (!is_dir($targetSubDir)) {
                    Util::mwMkdir($targetSubDir);
                }

                $subSoundFiles = glob("$subDir/*.{wav,ulaw,alaw,gsm,g722,sln,mp3}", GLOB_BRACE);
                foreach ($subSoundFiles as $soundFile) {
                    $fileName = basename($soundFile);

                    // Language Pack: no prefix, Feature module: with prefix
                    $destFileName = $isLanguagePack
                        ? $fileName
                        : strtolower($moduleUniqueID) . '-' . $fileName;

                    $destFile = "$targetSubDir/$destFileName";

                    if (!copy($soundFile, $destFile)) {
                        SystemMessages::sysLogMsg(__METHOD__, "Failed to copy sound file: $soundFile", LOG_WARNING);
                        $success = false;
                    } else {
                        SystemMessages::sysLogMsg(__METHOD__, "Installed sound: $subDirName/$destFileName (language: $lang, type: $moduleType)", LOG_DEBUG);
                    }
                }
            }
        }

        if ($success) {
            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID ($moduleType) sound files installed successfully", LOG_INFO);
        }

        return $success;
    }

    /**
     * Remove module sound files from system sounds directory
     *
     * Handles both module types:
     * 1. Language Pack: Removes entire language directory
     * 2. Feature module: Removes only prefixed files (modulename-*)
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function removeModuleSounds(string $moduleUniqueID): bool
    {
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);
        $isLanguagePack = PbxExtensionUtils::isLanguagePackModule($moduleUniqueID);
        $moduleType = $isLanguagePack ? 'Language Pack' : 'Feature';

        SystemMessages::sysLogMsg(__METHOD__, "Removing $moduleType module sounds: $moduleUniqueID", LOG_INFO);

        if ($isLanguagePack) {
            // Language Pack: Remove entire language directory
            $languageCode = PbxExtensionUtils::getLanguagePackCode($moduleUniqueID);

            if ($languageCode === null) {
                SystemMessages::sysLogMsg(__METHOD__, "Cannot determine language code for Language Pack: $moduleUniqueID", LOG_WARNING);
                return false;
            }

            $langDir = "$systemSoundsDir/$languageCode";

            if (!is_dir($langDir)) {
                SystemMessages::sysLogMsg(__METHOD__, "Language directory does not exist: $langDir", LOG_DEBUG);
                return true; // Not an error if directory doesn't exist
            }

            // Remove entire language directory
            $rmPath = Util::which('rm');
            $langDirEscaped = escapeshellarg($langDir);
            $command = "$rmPath -rf $langDirEscaped";
            $exitCode = Processes::mwExec($command);

            if ($exitCode === 0) {
                SystemMessages::sysLogMsg(__METHOD__, "Language Pack $moduleUniqueID ($languageCode) removed successfully", LOG_INFO);
                return true;
            }

            SystemMessages::sysLogMsg(__METHOD__, "Failed to remove Language Pack $moduleUniqueID. Exit code: $exitCode", LOG_WARNING);
            return false;

        } else {
            // Feature module: Remove only prefixed files
            $prefix = strtolower($moduleUniqueID) . '-';
            $findPath = Util::which('find');
            $soundsDir = escapeshellarg($systemSoundsDir);
            $pattern = escapeshellarg($prefix . '*');

            // Find all sound files with module prefix
            $command = "$findPath $soundsDir -type f -name $pattern -delete";
            $exitCode = Processes::mwExec($command, $output);

            if ($exitCode === 0) {
                SystemMessages::sysLogMsg(__METHOD__, "Feature module $moduleUniqueID sound files removed successfully", LOG_INFO);
                return true;
            }

            SystemMessages::sysLogMsg(__METHOD__, "Failed to remove Feature module $moduleUniqueID sound files. Exit code: $exitCode", LOG_WARNING);
            return false;
        }
    }

    /**
     * Update module sound files (removes old, installs new)
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function updateModuleSounds(string $moduleUniqueID): bool
    {
        // Remove old sound files
        self::removeModuleSounds($moduleUniqueID);

        // Install new sound files
        return self::installModuleSounds($moduleUniqueID);
    }

    /**
     * Get list of languages available in system sounds directory
     *
     * Returns all language directories found in the sounds directory,
     * including base system languages and languages added by Language Pack modules.
     *
     * @return array List of language codes (e.g., ['en-en', 'ru-ru', 'de-de', 'ja-ja'])
     */
    public static function getAvailableLanguages(): array
    {
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        if (!is_dir($systemSoundsDir)) {
            return [];
        }

        $languages = [];
        $dirs = glob("$systemSoundsDir/*", GLOB_ONLYDIR);

        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only include directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $languages[] = $lang;
            }
        }

        // Sort alphabetically
        sort($languages);

        return $languages;
    }

    /**
     * Mapping between Asterisk sound language codes (xx-xx) and Web admin language codes (xx)
     *
     * @var array<string, string>
     */
    private const array ASTERISK_TO_WEB_LANG_MAP = [
        'en-en' => 'en',
        'en-gb' => 'en',  // Use English translation for British English
        'ru-ru' => 'ru',
        'de-de' => 'de',
        'da-dk' => 'da',
        'es-es' => 'es',
        'gr-gr' => 'el',  // Greek: gr -> el (ISO 639-1)
        'fr-ca' => 'fr',
        'it-it' => 'it',
        'ja-jp' => 'ja',
        'nl-nl' => 'nl',
        'pl-pl' => 'pl',
        'pt-br' => 'pt_BR',
        'sv-sv' => 'sv',
        'cs-cs' => 'cs',
        'tr-tr' => 'tr',
    ];

    /**
     * Get all supported languages
     *
     * Returns base system languages plus languages from enabled Language Pack modules.
     * Uses LanguageProvider::AVAILABLE_LANGUAGES as the single source of truth for language names.
     *
     * @return array Associative array of language codes to display names
     */
    public static function getSupportedLanguages(): array
    {
        $languages = [];

        // Get available Asterisk sound languages
        $availableLanguages = self::getAvailableLanguages();

        foreach ($availableLanguages as $asteriskCode) {
            // Map Asterisk code to web admin code
            $webCode = self::ASTERISK_TO_WEB_LANG_MAP[$asteriskCode] ?? null;

            if ($webCode !== null && isset(LanguageProvider::AVAILABLE_LANGUAGES[$webCode])) {
                // Use native name from LanguageProvider
                $languages[$asteriskCode] = LanguageProvider::AVAILABLE_LANGUAGES[$webCode]['name'];
            } else {
                // Fallback: use uppercase language code if no mapping found
                $languages[$asteriskCode] = strtoupper($asteriskCode);
            }
        }

        // Sort by display name
        asort($languages, SORT_NATURAL | SORT_FLAG_CASE);

        return $languages;
    }

    /**
     * Check if language code is valid and supported
     *
     * @param string $languageCode Language code to validate
     * @return bool True if valid and supported
     */
    public static function isValidLanguageCode(string $languageCode): bool
    {
        return array_key_exists($languageCode, self::getSupportedLanguages());
    }
}
