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

namespace MikoPBX\Modules;

use MikoPBX\Common\Library\Text;
use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
use Phalcon\Mvc\Application;
use Phalcon\Mvc\Router;
use Throwable;
use function MikoPBX\Common\Config\appPath;

/**
 * Utility class for managing extension modules.
 *
 * @package MikoPBX\Modules
 */
class PbxExtensionUtils
{
    /**
     * Checks if a module is enabled by UniqueID.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return bool True if the module is enabled, false otherwise.
     */
    public static function isEnabled(string $moduleUniqueID): bool
    {
        $redis = Di::GetDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = ModelsBase::makeCacheKey(PbxExtensionModules::class, 'isEnabled' . $moduleUniqueID);
        $moduleState = $redis->get($cacheKey);
        if (empty($moduleState)) {
            $parameters = [
                'conditions' => 'uniqid = :uniqid:',
                'bind' => [
                    'uniqid' => $moduleUniqueID,
                ],
            ];

            $result = PbxExtensionModules::findFirst($parameters);

            $moduleState = ($result !== null && $result->disabled !== '1');
            $redis->set($cacheKey, $moduleState, 3600);
        }

        return $moduleState;
    }

    /**
     * Creates symbolic links for JS, CSS, and IMG assets of a module.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return void
     */
    public static function createAssetsSymlinks(string $moduleUniqueID): void
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);

        // Create symlinks for IMG
        $moduleImageDir = "$moduleDir/public/assets/img";
        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
        $moduleImageCacheDir = "$imgCacheDir/$moduleUniqueID";
        if (file_exists($moduleImageCacheDir)) {
            unlink($moduleImageCacheDir);
        }
        if (file_exists($moduleImageDir)) {
            symlink($moduleImageDir, $moduleImageCacheDir);
        }

        // Create symlinks for CSS
        $moduleCSSDir = "$moduleDir/public/assets/css";
        $cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        $moduleCSSCacheDir = "$cssCacheDir/$moduleUniqueID";
        if (file_exists($moduleCSSCacheDir)) {
            unlink($moduleCSSCacheDir);
        }
        if (file_exists($moduleCSSDir)) {
            symlink($moduleCSSDir, $moduleCSSCacheDir);
        }

        // Create symlinks for JS
        $moduleJSDir = "$moduleDir/public/assets/js";
        $jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');
        $moduleJSCacheDir = "$jsCacheDir/$moduleUniqueID";
        if (file_exists($moduleJSCacheDir)) {
            unlink($moduleJSCacheDir);
        }
        if (file_exists($moduleJSDir)) {
            symlink($moduleJSDir, $moduleJSCacheDir);
        }
    }

    /**
     * Retrieves the directory path of a module by UniqueID.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return string The directory path of the module.
     */
    public static function getModuleDir(string $moduleUniqueID): string
    {
        $di = Di::getDefault();
        if ($di === null) {
            return "/tmp/$moduleUniqueID";
        }
        
        $modulesDir = Directories::getDir(Directories::CORE_MODULES_DIR);
        return "$modulesDir/$moduleUniqueID";
    }

    /**
     * Creates symbolic links for agi-bin files of a module.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return void
     */
    public static function createAgiBinSymlinks(string $moduleUniqueID): void
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);

        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
     
        // Create symlinks to AGI-BIN
        $agiBinDir = Directories::getDir(Directories::AST_AGI_BIN_DIR);
        $moduleAgiBinDir = "$moduleDir/agi-bin";
        $files = glob("$moduleAgiBinDir/*.{php}", GLOB_BRACE);
        foreach ($files as $file) {
            $newFilename = $agiBinDir . '/' . basename($file);
            Util::createUpdateSymlink($file, $newFilename);
        }

        $chmod = Util::which('chmod');
        Processes::mwExec("$chmod +x $agiBinDir/*");
    }

    /**
     * Creates symbolic links for view templates of a module.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return void
     */
    public static function createViewSymlinks(string $moduleUniqueID): void
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);

        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $moduleViewDir = "$moduleDir/App/Views";
        $viewCacheDir = appPath('src/AdminCabinet/Views/Modules');
        $moduleViewCacheDir = "$viewCacheDir/$moduleUniqueID";
        if (file_exists($moduleViewCacheDir)) {
            unlink($moduleViewCacheDir);
        }
        if (file_exists($moduleViewDir)) {
            symlink($moduleViewDir, $moduleViewCacheDir);
        }
    }

    /**
     * Disables incompatible modules.
     *
     * @return void
     */
    public static function disableOldModules(): void
    {
        $parameters = [
            'conditions' => 'disabled=0',
        ];
        $modules = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $needDisable = false;
            $moduleDir = PbxExtensionUtils::getModuleDir($module['uniqid']);

            // Check if module.json file exists
            $moduleJson = "$moduleDir/module.json";
            if (!file_exists($moduleJson)) {
                $needDisable = true;
            }
            $jsonString = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';

            // Check if module version is lower than the minimum supported version
            if (version_compare($minPBXVersion, ModelsBase::MIN_MODULE_MODEL_VER, '<')) {
                $needDisable = true;
            }
            if ($needDisable) {
                self::forceDisableModule($module['uniqid']);
            }
        }
    }

    /**
     * Disables a module by its unique ID.
     *
     * @param string $moduleUniqueId The unique ID of the module to be disabled.
     * @param string $exceptionMessage The exception message.
     */
    private static function forceDisableModule(string $moduleUniqueId, string $exceptionMessage = ''): void
    {
        $reason = PbxExtensionState::DISABLED_BY_EXCEPTION;
        $reasonText = $exceptionMessage;
        try {
            // Disable the module using the PbxExtensionState class
            $moduleStateProcessor = new PbxExtensionState($moduleUniqueId);
            $moduleStateProcessor->disableModule($reason, $reasonText);
        } catch (Throwable $exception) {
            // Log an error message if module disabling fails
            SystemMessages::sysLogMsg(__CLASS__, "Can not disable module $moduleUniqueId Message: $exception", LOG_ERR);
        } finally {
            // Update module status to disabled if it was not already disabled
            $currentModule = PbxExtensionModules::findFirstByUniqid($moduleUniqueId);
            if ($currentModule->disabled === '0') {
                SystemMessages::sysLogMsg(__CLASS__, "Force disable module $moduleUniqueId on the PbxExtensionModules table", LOG_ERR);
                $currentModule->disabled = '1';
                $currentModule->disableReason = $reason;
                $currentModule->disableReasonText = $reasonText;
                $currentModule->update();
            }
        }
    }

    /**
     * Registers enabled modules with App/Module.php file as external modules for the application.
     *
     * @param Application $application The application instance.
     * @return void
     */
    public static function registerEnabledModulesInApp(Application &$application): void
    {
        $parameters = [
            'conditions' => 'disabled=0',
        ];
        $modules = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $moduleUniqueId = $module['uniqid'];
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
            $unCamelizedModuleName = Text::uncamelize($moduleUniqueId, '-');
            $moduleAppClass = "$moduleDir/App/Module.php";
            if (file_exists($moduleAppClass)) {
                $application->registerModules([
                    $unCamelizedModuleName => [
                        "className" => "Modules\\$moduleUniqueId\\App\\Module",
                        "path" => $moduleAppClass,
                    ],
                ], true);
            }
        }
    }

    /**
     * Registers enabled modules with App/Module.php file as external module for routes
     *
     * @param Router $router
     * @return void
     */
    public static function registerEnabledModulesInRouter(Router &$router): void
    {
        $parameters = [
            'conditions' => 'disabled=0',
        ];
        $modules = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $moduleUniqueId = $module['uniqid'];
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
            $unCamelizedModuleName = Text::uncamelize($moduleUniqueId, '-');
            $moduleAppClass = "$moduleDir/App/Module.php";
            if (file_exists($moduleAppClass)) {
                $router->add("/$unCamelizedModuleName/:controller/:action/:params", [
                    'module' => $unCamelizedModuleName,
                    'controller' => 1,
                    'action' => 2,
                    'params' => 3,
                    'namespace' => "Modules\\$moduleUniqueId\\App\\Controllers"
                ]);
            }
        }
    }

    /**
     * Disables a module based on its file path.
     *
     * @param string $moduleFile The file path of the module.
     * @param string $exceptionMessage The exception message.
     */
    public static function disableBadModule(string $moduleFile, string $exceptionMessage = ''): void
    {
        // Check if the module is within the /custom_modules/ directory
        $customModulesPos = strpos($moduleFile, '/custom_modules/');
        if ($customModulesPos !== false) {
            // Extract the module name from the file path
            $moduleName = substr($moduleFile, $customModulesPos + strlen('/custom_modules/'));
            $moduleNameParts = explode('/', $moduleName);
            $moduleUniqueId = $moduleNameParts[0];
            if (!empty($moduleUniqueId)) {
                // Disable the module using its unique ID
                self::forceDisableModule($moduleUniqueId, $exceptionMessage);
                SystemMessages::sysLogMsg(__CLASS__, "The module $moduleUniqueId was disabled because an exception occurred in it", LOG_ERR);
            }
        }
    }

    /**
     * Determines if a module is a Language Pack module.
     *
     * Checks module.json for "module_type": "languagepack".
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return bool True if module is a Language Pack, false otherwise.
     */
    public static function isLanguagePackModule(string $moduleUniqueID): bool
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);
        $moduleJson = "$moduleDir/module.json";

        if (file_exists($moduleJson)) {
            $jsonString = file_get_contents($moduleJson);
            $moduleDescription = json_decode($jsonString, true);

            if (isset($moduleDescription['module_type'])) {
                return $moduleDescription['module_type'] === 'languagepack';
            }
        }

        return false;
    }

    /**
     * Gets the language code for a Language Pack module.
     *
     * Checks module.json for "language_code" or extracts from sounds directory structure.
     *
     * @param string $moduleUniqueID The UniqueID of the module.
     * @return string|null Language code (e.g., 'de-de', 'ja-ja', 'fr-fr') or null if not found.
     */
    public static function getLanguagePackCode(string $moduleUniqueID): ?string
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);
        $moduleJson = "$moduleDir/module.json";

        // Check module.json first
        if (file_exists($moduleJson)) {
            $jsonString = file_get_contents($moduleJson);
            $moduleDescription = json_decode($jsonString, true);

            if (isset($moduleDescription['language_code'])) {
                return $moduleDescription['language_code'];
            }
        }

        // Fallback: detect from sounds directory structure
        $moduleSoundsDir = "$moduleDir/sounds";
        if (is_dir($moduleSoundsDir)) {
            $langDirs = glob("$moduleSoundsDir/*", GLOB_ONLYDIR);
            if (!empty($langDirs) && count($langDirs) === 1) {
                // Language Pack should have exactly ONE language directory
                return basename($langDirs[0]);
            }
        }

        return null;
    }

    /**
     * Checks for Language Pack conflicts.
     *
     * Only one Language Pack per language is allowed.
     *
     * @param string $moduleUniqueID The UniqueID of the module to check.
     * @param string $languageCode The language code to check for conflicts.
     * @return string|null UniqueID of conflicting module or null if no conflict.
     */
    public static function checkLanguagePackConflict(string $moduleUniqueID, string $languageCode): ?string
    {
        $parameters = [
            'conditions' => 'disabled=0 AND uniqid != :uniqid:',
            'bind' => [
                'uniqid' => $moduleUniqueID,
            ],
        ];

        $modules = PbxExtensionModules::find($parameters)->toArray();

        foreach ($modules as $module) {
            $otherModuleId = $module['uniqid'];

            // Check if it's a Language Pack
            if (self::isLanguagePackModule($otherModuleId)) {
                $otherLanguageCode = self::getLanguagePackCode($otherModuleId);

                // Found conflict - same language code
                if ($otherLanguageCode === $languageCode) {
                    return $otherModuleId;
                }
            }
        }

        return null;
    }

    /**
     * Gets all enabled Language Pack modules with their language codes.
     *
     * Returns associative array where key is language code and value is module UniqueID.
     *
     * @return array Associative array [languageCode => moduleUniqueID]
     */
    public static function getAllLanguagePackModules(): array
    {
        $parameters = [
            'conditions' => 'disabled=0',
        ];

        $modules = PbxExtensionModules::find($parameters)->toArray();
        $languagePacks = [];

        foreach ($modules as $module) {
            $moduleId = $module['uniqid'];

            // Check if it's a Language Pack
            if (self::isLanguagePackModule($moduleId)) {
                $languageCode = self::getLanguagePackCode($moduleId);

                if ($languageCode !== null) {
                    $languagePacks[$languageCode] = $moduleId;
                }
            }
        }

        return $languagePacks;
    }
}