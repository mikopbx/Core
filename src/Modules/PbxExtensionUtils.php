<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

namespace MikoPBX\Modules;


use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di;

use Throwable;

use function MikoPBX\Common\Config\appPath;

class PbxExtensionUtils
{
    /**
     * Checks module state by UniqueID
     *
     * @param string $moduleUniqueID
     *
     * @return bool
     */
    public static function isEnabled(string $moduleUniqueID): bool
    {
        $result = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);

        return ($result !== false && $result->disabled !== '1');
    }

    /**
     * Creates JS, CSS, IMG cache folders and links for module by UniqueID
     *
     * @param string $moduleUniqueID
     */
    public static function createAssetsSymlinks(string $moduleUniqueID): void
    {
        $moduleDir = self::getModuleDir($moduleUniqueID);

        // IMG
        $moduleImageDir      = "{$moduleDir}/public/assets/img";
        $imgCacheDir         = appPath('sites/admin-cabinet/assets/img/cache');
        $moduleImageCacheDir = "{$imgCacheDir}/{$moduleUniqueID}";
        if (file_exists($moduleImageCacheDir)) {
            unlink($moduleImageCacheDir);
        }
        if (file_exists($moduleImageDir)) {
            symlink($moduleImageDir, $moduleImageCacheDir);
        }
        // CSS
        $moduleCSSDir      = "{$moduleDir}/public/assets/css";
        $cssCacheDir       = appPath('sites/admin-cabinet/assets/css/cache');
        $moduleCSSCacheDir = "{$cssCacheDir}/{$moduleUniqueID}";
        if (file_exists($moduleCSSCacheDir)) {
            unlink($moduleCSSCacheDir);
        }
        if (file_exists($moduleCSSDir)) {
            symlink($moduleCSSDir, $moduleCSSCacheDir);
        }
        // JS
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
     * Returns module dir by UniqueID
     *
     * @param string $moduleUniqueID
     *
     * @return string
     *
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
     * Creates links to agi-bin files for module by UniqueID
     *
     * @param string $moduleUniqueID
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
     * Disables incompatible modules
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
            $moduleJson  = "{$moduleDir}/module.json";
            if ( ! file_exists($moduleJson)) {
                $needDisable = true;
            }
            $jsonString            = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion         = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';
            if (version_compare($minPBXVersion, ModelsBase::MIN_MODULE_MODEL_VER, '<')) {
                $needDisable = true;
            }
            if ($needDisable) {
                try {
                    $moduleStateProcessor = new PbxExtensionState($module['uniqid']);
                    $moduleStateProcessor->disableModule();
                } catch (Throwable $exception) {
                    Util::sysLogMsg(__CLASS__, "Can not disable module {$module['uniqid']} Message: {$exception}");
                } finally {
                    $currentModule           = PbxExtensionModules::findFirstByUniqid($module['uniqid']);
                    if ($currentModule->disabled==='0'){
                        $currentModule->disabled = '1';
                        $currentModule->update();
                    }
                }
            }
        }
    }

}