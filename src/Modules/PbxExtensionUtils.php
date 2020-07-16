<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Modules;


use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use Phalcon\Di;
use Phalcon\Di\Exception;

class PbxExtensionUtils
{
    /**
     * Check module state by UniqueID
     * @param string $moduleUniqueID
     *
     * @return bool
     */
    public static function isEnabled(string $moduleUniqueID):bool
    {
        $result        = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        return ($result!==false && $result->disabled !== '1');
    }

    /**
     * Return module dir by UniqueID
     * @param string $moduleUniqueID
     *
     * @return string
     * @throws \Phalcon\Di\Exception
     */
    public static function getModuleDir(string $moduleUniqueID):string
    {
        $di      = Di::getDefault();

        if ($di === null){
            throw new Exception('\Phalcon\DI not installed');
        }
        $config  = $di->getShared('config');
        $modulesDir    = $config->path('core.modulesDir');

        return"{$modulesDir}/{$moduleUniqueID}";

    }

    /**
     * Install module from file
     *
     * @param string $filePath
     *
     * @param string $moduleUniqueID
     *
     * @return array
     * @throws \Phalcon\Di\Exception
     */
    public static function installModule(string $filePath, string $moduleUniqueID):array
    {
        $result = [];
        $error            = false;
        $currentModuleDir = self::getModuleDir($moduleUniqueID);
        $needBackup       = is_dir($currentModuleDir);

        if ($needBackup){
            self::uninstallModule($moduleUniqueID, true);
        }

        $semZaPath = Util::which('7za');
        Util::mwExec("{$semZaPath} e -spf -aoa -o{$currentModuleDir} {$filePath}");
        Util::addRegularWWWRights($currentModuleDir);

        $pbxExtensionSetupClass       = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
        if (class_exists($pbxExtensionSetupClass)
            && method_exists($pbxExtensionSetupClass, 'installModule'))
        {
            $setup = new $pbxExtensionSetupClass($moduleUniqueID);
            if ( ! $setup->installModule()) {
                $error          = true;
                $result['data'] = 'Install error:' . implode('<br>', $setup->getMessages());
            }
        } else {
            $result['data'] = "Install error: the class {$pbxExtensionSetupClass} not exists";
        }

        if ($error) {
            $result['result'] = 'ERROR';
        } else {
            $result['result'] = 'Success';
            $result['needRestartWorkers'] = true;
        }

        return $result;
    }

    /**
     * Uninstall module
     * @param string $moduleUniqueID
     *
     * @param bool   $keepSettings
     *
     * @return array
     * @throws \Phalcon\Di\Exception
     */
    public static function uninstallModule(string $moduleUniqueID, bool $keepSettings):array
    {
        $result = [];
        $currentModuleDir = self::getModuleDir($moduleUniqueID);
        // Kill all module processes
        if (is_dir("{$currentModuleDir}/bin")) {
            $busyboxPath = Util::which('busybox');
            $killPath    = Util::which('kill');
            $lsofPath    = Util::which('lsof');
            $grepPath    = Util::which('grep');
            $awkPath     = Util::which('awk');
            $uniqPath    = Util::which('uniq');
            Util::mwExec(
                "{$busyboxPath} {$killPath} -9 $({$lsofPath} {$currentModuleDir}/bin/* |  {$busyboxPath} {$grepPath} -v COMMAND | {$busyboxPath} {$awkPath}  '{ print $2}' | {$busyboxPath} {$uniqPath})"
            );
        }
        // Uninstall module with keep settings and backup db
        $moduleClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
        if (class_exists($moduleClass)
            && method_exists($moduleClass, 'uninstallModule')) {
            $setup = new $moduleClass($moduleUniqueID);
        } else {
            // Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
            $moduleClass = PbxExtensionSetupFailure::class;
            $setup       = new $moduleClass($moduleUniqueID);
        }
        if ($setup->uninstallModule($keepSettings)) {
            $result['result'] = 'Success';
            $result['needRestartWorkers'] = true;
        } else {
            $result['result'] = 'ERROR';
            $result['data']   = implode('<br>', $setup->getMessages());
        }

        if (is_dir($currentModuleDir)) {
            // Broken or very old module. Force uninstall.
            $rmPath = Util::which('rm');
            Util::mwExec("{$rmPath} -rf {$currentModuleDir}");
        }
        return $result;
    }
}