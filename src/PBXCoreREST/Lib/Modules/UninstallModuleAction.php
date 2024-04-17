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
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 *  Class UninstallModule
 *  Uninstall extension module
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class UninstallModuleAction extends \Phalcon\Di\Injectable
{
    /**
     * Uninstall extension module
     *
     * @param string $moduleUniqueID The unique ID of the module to uninstall.
     * @param bool $keepSettings Indicates whether to keep the module settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID, bool $keepSettings): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);

        // Kill all module processes
        if (is_dir("{$currentModuleDir}/bin")) {
            $kill = Util::which('kill');
            $lsof = Util::which('lsof');
            $grep = Util::which('grep');
            $awk = Util::which('awk');
            $uniq = Util::which('uniq');

            // Execute the command to kill all processes related to the module
            Processes::mwExec(
                "$kill -9 $($lsof {$currentModuleDir}/bin/* |  $grep -v COMMAND | $awk  '{ print $2}' | $uniq)"
            );
        }

        // Uninstall module with keep settings and backup db
        $moduleClass = "Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";

        try {
            if (class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')) {
                // Instantiate the module setup class and call the uninstallModule method
                $setup = new $moduleClass($moduleUniqueID);
            } else {

                // Use a fallback class to uninstall the module from the database if it doesn't exist on disk
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($moduleUniqueID);
            }
            $setup->uninstallModule($keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // If the module directory still exists, force uninstallation
                $rm = Util::which('rm');

                // Remove the module directory recursively
                Processes::mwExec("$rm -rf {$currentModuleDir}");

                // Use the fallback class to unregister the module from the database
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success = true;

        return $res;
    }

}