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


use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Mvc\Application;

use Phalcon\Mvc\Router;
use Phalcon\Text;
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
        $parameters = [
            'conditions'=>'uniqid = :uniqid:',
            'bind'=>[
                'uniqid' => $moduleUniqueID,
            ],
            'cache' => [
                'key'=>ModelsBase::makeCacheKey(PbxExtensionModules::class, 'isEnabled'.$moduleUniqueID),
                'lifetime' => 3600,
            ]
        ];

        $result = PbxExtensionModules::findFirst($parameters);

        return ($result !== null && $result->disabled !== '1');
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
        $moduleImageDir      = "{$moduleDir}/public/assets/img";
        $imgCacheDir         = appPath('sites/admin-cabinet/assets/img/cache');
        $moduleImageCacheDir = "{$imgCacheDir}/{$moduleUniqueID}";
        if (file_exists($moduleImageCacheDir)) {
            unlink($moduleImageCacheDir);
        }
        if (file_exists($moduleImageDir)) {
            symlink($moduleImageDir, $moduleImageCacheDir);
        }

        // Create symlinks for CSS
        $moduleCSSDir      = "{$moduleDir}/public/assets/css";
        $cssCacheDir       = appPath('sites/admin-cabinet/assets/css/cache');
        $moduleCSSCacheDir = "{$cssCacheDir}/{$moduleUniqueID}";
        if (file_exists($moduleCSSCacheDir)) {
            unlink($moduleCSSCacheDir);
        }
        if (file_exists($moduleCSSDir)) {
            symlink($moduleCSSDir, $moduleCSSCacheDir);
        }

        // Create symlinks for JS
        $moduleJSDir      = "{$moduleDir}/public/assets/js";
        $jsCacheDir       = appPath('sites/admin-cabinet/assets/js/cache');
        $moduleJSCacheDir = "{$jsCacheDir}/{$moduleUniqueID}";
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
            return "/tmp/{$moduleUniqueID}";
        }
        $config     = $di->getShared('config');
        $modulesDir = $config->path('core.modulesDir');

        return "{$modulesDir}/{$moduleUniqueID}";
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
        $config = $di->getShared('config');

        // Create symlinks to AGI-BIN
        $agiBinDir       = $config->path('asterisk.astagidir');
        $moduleAgiBinDir = "{$moduleDir}/agi-bin";
        $files           = glob("$moduleAgiBinDir/*.{php}", GLOB_BRACE);
        foreach ($files as $file) {
            $newFilename = $agiBinDir . '/' . basename($file);
            Util::createUpdateSymlink($file, $newFilename);
        }

        $pathChmod = Util::which('chmod');
        Processes::mwExec("{$pathChmod} +x {$agiBinDir}/*");
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
        $modules    = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $needDisable = false;
            $moduleDir   = PbxExtensionUtils::getModuleDir($module['uniqid']);

            // Check if module.json file exists
            $moduleJson  = "{$moduleDir}/module.json";
            if ( ! file_exists($moduleJson)) {
                $needDisable = true;
            }
            $jsonString            = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion         = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';

            // Check if module version is lower than the minimum supported version
            if (version_compare($minPBXVersion, ModelsBase::MIN_MODULE_MODEL_VER, '<')) {
                $needDisable = true;
            }
            if ($needDisable) {
                try {
                    $moduleStateProcessor = new PbxExtensionState($module['uniqid']);
                    $moduleStateProcessor->disableModule();
                } catch (Throwable $exception) {
                    Util::sysLogMsg(__CLASS__, "Can not disable module {$module['uniqid']} Message: {$exception}", LOG_ERR);
                } finally {
                    // Update module status to disabled if it was not already disabled
                    $currentModule           = PbxExtensionModules::findFirstByUniqid($module['uniqid']);
                    if ($currentModule->disabled==='0'){
                        $currentModule->disabled = '1';
                        $currentModule->update();
                    }
                }
            }
        }
    }

    /**
     * Registers enabled modules with App/Module.php file as external modules for the application.
     *
     * @param Application $application The application instance.
     * @return void
     */
    public static function registerEnabledModulesInApp(Application &$application){
        $parameters = [
            'conditions' => 'disabled=0',
        ];
        $modules    = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $moduleUniqueId = $module['uniqid'];
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
            $unCamelizedModuleName = Text::uncamelize($moduleUniqueId,'-');
            $moduleAppClass = "{$moduleDir}/App/Module.php";
            if (file_exists($moduleAppClass)) {
                $application->registerModules([
                    $unCamelizedModuleName => [
                        "className" => "Modules\\{$moduleUniqueId}\\App\\Module",
                        "path"      => $moduleAppClass,
                    ],
                ],true);
            }
        }
    }

    /**
     * Registers enabled modules with App/Module.php file as external module for routes
     *
     * @param Router $router
     * @return void
     */
    public static function registerEnabledModulesInRouter(Router &$router){
        $parameters = [
            'conditions' => 'disabled=0',
        ];
        $modules    = PbxExtensionModules::find($parameters)->toArray();
        foreach ($modules as $module) {
            $moduleUniqueId = $module['uniqid'];
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
            $unCamelizedModuleName = Text::uncamelize($moduleUniqueId,'-');
            $moduleAppClass = "{$moduleDir}/App/Module.php";
            if (file_exists($moduleAppClass)) {
                $router->add("/{$unCamelizedModuleName}/:controller/:action/:params", [
                    'module'     => $unCamelizedModuleName,
                    'controller' => 1,
                    'action'     => 2,
                    'params'     => 3,
                    'namespace' => "Modules\\{$moduleUniqueId}\\App\\Controllers"
                ]);
            }
        }
    }

}