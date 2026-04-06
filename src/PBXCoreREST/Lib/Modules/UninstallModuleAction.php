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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 *  Class UninstallModule
 *  Uninstall extension module
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class UninstallModuleAction extends Injectable
{

    public const int UNINSTALL_MUTEX_TIMEOUT = 60; // 60 seconds

    // Uninstall stages
    public const string STAGE_I_DISABLE_MODULE = 'Stage_I_DisableModule';
    public const string STAGE_II_STOP_PROCESSES = 'Stage_II_StopProcesses';
    public const string STAGE_III_BACKUP_DB = 'Stage_III_BackupDB';
    public const string STAGE_IV_RUN_INNER_UNINSTALLER = 'Stage_IV_RunInnerUnistaller';
    public const string STAGE_IV_RUN_FAILOVER_UNINSTALLER = 'Stage_IV_RunFailoverUnistaller';
    public const string STAGE_V_DELETE_MODULE_FOLDER = 'Stage_V_DeleteModuleFolder';
    public const string STAGE_VI_UNREGISTER_MODULE = 'Stage_VI_UnregisterModule';
    public const string STAGE_VII_FINAL_STATUS = 'Stage_VII_FinalStatus';


    private bool $keepSettings = false;

    private UnifiedModulesEvents $unifiedModulesEvents;

    private string $moduleUniqueId;

    /**
     * Class constructor
     *
     * @param string $asyncChannelId Pub/sub nchan channel id to send response to frontend
     * @param string $moduleUniqueId The unique identifier for the module to be uninstalled.
     */
    public function __construct(string $asyncChannelId, string $moduleUniqueId, bool $keepSettings)
    {
        $this->moduleUniqueId = $moduleUniqueId;
        $this->keepSettings = $keepSettings;
        $this->unifiedModulesEvents = new UnifiedModulesEvents($asyncChannelId, $moduleUniqueId);
    }

    /**
     * Uninstall extension module
     *
     * @param string $moduleUniqueID The unique ID of the module to uninstall.
     * @param bool $keepSettings Indicates whether to keep the module settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public function start(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Create a mutex to ensure synchronized access
        $mutex = $this->di->get(MutexProvider::SERVICE_NAME);

        try {
            $res = $mutex->synchronized(ModuleInstallationBase::MODULE_MANIPULATION_MUTEX_KEY, function () {
                return $this->uninstallModule();
            }, 10, self::UNINSTALL_MUTEX_TIMEOUT);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $res->success = false;
            $res->messages['error'] = $e->getMessage();
        }

        $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_VII_FINAL_STATUS, $res->getResult());
        return $res;
    }


    /**
     * Uninstall extension module
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public function uninstallModule(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $currentModuleDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueId);

        if (PbxExtensionUtils::isEnabled($this->moduleUniqueId)) {
            $res = DisableModuleAction::disableModule($this->moduleUniqueId);
            $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_I_DISABLE_MODULE, $res->getResult());
            if (!$res->success) {
                return $res;
            }
        }

        // Kill all module processes
        if (is_dir("$currentModuleDir/bin")) {
            $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_II_STOP_PROCESSES, $res->getResult());
            $kill = Util::which('kill');
            $lsof = Util::which('lsof');
            $grep = Util::which('grep');
            $awk = Util::which('awk');
            $uniq = Util::which('uniq');

            // Execute the command to kill all processes related to the module
            Processes::mwExec(
                "$kill -9 $($lsof $currentModuleDir/bin/* |  $grep -v COMMAND | $awk  '{ print $2}' | $uniq)"
            );
        }

        // Uninstall module with keep settings and backup db
        $moduleClass = "Modules\\{$this->moduleUniqueId}\\Setup\\PbxExtensionSetup";

        try {
            if (
                class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')
            ) {
                // Instantiate the module setup class and call the uninstallModule method
                $setup = new $moduleClass($this->moduleUniqueId);
                $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_IV_RUN_INNER_UNINSTALLER, $res->getResult());
            } else {

                // Use a fallback class to uninstall the module from the database if it doesn't exist on disk
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($this->moduleUniqueId);
                $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_IV_RUN_FAILOVER_UNINSTALLER, $res->getResult());
            }
            $setup->uninstallModule($this->keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // If the module directory still exists, force uninstallation
                $rm = Util::which('rm');

                $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_V_DELETE_MODULE_FOLDER, $res->getResult());
                // Remove the module directory recursively
                Processes::mwExec("$rm -rf $currentModuleDir");

                // Use the fallback class to unregister the module from the database
                $this->unifiedModulesEvents->pushMessageToBrowser(self::STAGE_VI_UNREGISTER_MODULE, $res->getResult());
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($this->moduleUniqueId);
                $setup->unregisterModule();
            }
        }
        $res->success = true;
        return $res;
    }

}
