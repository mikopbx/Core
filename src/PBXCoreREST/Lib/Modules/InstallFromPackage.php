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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;

/**
 *  Class InstallModuleFromPackage
 *  Installs a new additional extension module from an early uploaded zip archive.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class InstallFromPackage extends \Phalcon\Di\Injectable
{
    const MODULE_WAS_ENABLED='moduleWasEnabled';
    const FILE_PATH = 'filePath';

    /**
     * Installs a new additional extension module from an early uploaded zip archive.
     *
     * @param string $filePath The path to the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $resModuleMetadata = GetMetadataFromModulePackage::main($filePath);
        if (!$resModuleMetadata->success) {
            return $resModuleMetadata;
        }

        $moduleUniqueID = $resModuleMetadata->data['uniqid'];
        // Disable the module if it's enabled
        $moduleWasEnabled = false;
        if (PbxExtensionUtils::isEnabled($moduleUniqueID)) {
            $res = DisableModule::main($moduleUniqueID);
            if (!$res->success) {
                return $res;
            }
            $moduleWasEnabled = true;
        }

        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $needBackup = is_dir($currentModuleDir);

        if ($needBackup) {
            UninstallModule::main($moduleUniqueID, true);
        }

        // Start the background process to install the module
        $temp_dir = dirname($filePath);

        // Create a progress file to track the installation progress
        file_put_contents($temp_dir . '/installation_progress', '0');

        // Create an error file to store any installation errors
        file_put_contents($temp_dir . '/installation_error', '');

        $install_settings = [
            self::FILE_PATH => $filePath,
            'currentModuleDir' => $currentModuleDir,
            'uniqid' => $moduleUniqueID,
        ];

        // Save the installation settings to a JSON file
        $settings_file = "{$temp_dir}/install_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
        $phpPath = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);

        // Execute the background process to install the module
        Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");
        $res->data[self::FILE_PATH] = $filePath;
        $res->data[self::MODULE_WAS_ENABLED] = $moduleWasEnabled;
        $res->success = true;

        return $res;
    }
}