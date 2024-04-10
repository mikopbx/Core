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

use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use Phalcon\Di;

/**
 *  Class ModuleInstallationBase
 *  Base methods and functions for module installation
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class ModuleInstallationBase extends \Phalcon\Di\Injectable
{

    // Common constants
    const INSTALLATION_MUTEX = 'ModuleInstallation';
    const MODULE_WAS_ENABLED = 'moduleWasEnabled';

    // Error messages
    const ERR_EMPTY_REPO_RESULT = "ext_EmptyRepoAnswer";
    const MSG_NO_LICENSE_REQ = "ext_NoLicenseRequired";
    const ERR_DOWNLOAD_TIMEOUT = "ext_ErrDownloadTimeout";
    const ERR_UPLOAD_TIMEOUT = "ext_ErrUploadTimeout";
    const ERR_INSTALLATION_TIMEOUT = "ext_ErrInstallationTimeout";

    const ERR_EMPTY_GET_MODULE_LINK = "ext_WrongGetModuleLink";

    // Timeout values
    const INSTALLATION_TIMEOUT = 120;

    // Install stages
    const STAGE_I_GET_RELEASE = 'Stage_I_GetRelease';
    const STAGE_I_UPLOAD_MODULE = 'Stage_I_UploadModule'; // Install from package stage
    const STAGE_II_CHECK_LICENSE = 'Stage_II_CheckLicense';
    const STAGE_III_GET_LINK = 'Stage_III_GetDownloadLink';
    const STAGE_IV_DOWNLOAD_MODULE = 'Stage_IV_DownloadModule';
    const STAGE_V_INSTALL_MODULE = 'Stage_V_InstallModule';
    const STAGE_VI_ENABLE_MODULE = 'Stage_VI_EnableModule';
    const STAGE_VII_FINAL_STATUS = 'Stage_VII_FinalStatus';


    // Pub/sub nchan channel id to send response to backend
    protected string $asyncChannelId;

    // The unique identifier for the module to be installed.
    protected string $moduleUniqueId;

    /**
     * Installs the module from the specified file path.
     * This function manages the module installation process, ensuring completion within the defined timeout.
     *
     * @param string $filePath Path to the module file.
     *
     * @return array An array containing the installation result and a success flag.
     */
    protected function installNewModule(string $filePath):array
    {
        // Initialization
        $maximumInstallationTime = self::INSTALLATION_TIMEOUT;

        // Start installation
        $installationResult = $this->startModuleInstallation($filePath);
        $this->pushMessageToBrowser(self::STAGE_V_INSTALL_MODULE, $installationResult->getResult());
        if (!$installationResult->success) {
            return [$installationResult->messages, false];
        }

        // Monitor installation progress
        while ($maximumInstallationTime > 0) {
            $resStatus = StatusOfModuleInstallationAction::main($filePath);
            $this->pushMessageToBrowser( self::STAGE_V_INSTALL_MODULE, $resStatus->getResult());
            if (!$resStatus->success) {
                return [$resStatus->messages, false];
            } elseif ($resStatus->data[StatusOfModuleInstallationAction::I_STATUS] === StatusOfModuleInstallationAction::INSTALLATION_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $maximumInstallationTime--;
            } elseif ($resStatus->data[StatusOfModuleInstallationAction::I_STATUS] === StatusOfModuleInstallationAction::INSTALLATION_COMPLETE) {
                return [$installationResult, true];
            }
        }

        // Installation timeout
        $this->pushMessageToBrowser( self::STAGE_V_INSTALL_MODULE, [self::ERR_INSTALLATION_TIMEOUT]);
        return [self::ERR_INSTALLATION_TIMEOUT, false];
    }

    /**
     * Enables the module if it was previously enabled.
     * This function checks the installation result and enables the module if needed.
     *
     * @param PBXApiResult $installationResult Result object from the installation process.
     *
     * @return array An array containing the module enabling process result and a success flag.
     */
    protected function enableModule( PBXApiResult $installationResult):array
    {
        // Check if the module was previously enabled
        if ($installationResult->data[self::MODULE_WAS_ENABLED]){
            $res = EnableModuleAction::main($this->moduleUniqueId);
            $this->pushMessageToBrowser(self::STAGE_VI_ENABLE_MODULE, $res->getResult());
            return [$res->messages, $res->success];
        }
        return [[], true];
    }

    /**
     * Pushes messages to browser
     * @param string $stage installation stage name
     * @param array $data pushing data
     * @return void
     */
    protected function pushMessageToBrowser( string $stage, array $data):void
    {
        $message = [
            'stage' => $stage,
            'moduleUniqueId' => $this->moduleUniqueId,
            'stageDetails' => $data,
            'pid'=>posix_getpid()
        ];

        $di = Di::getDefault();
        $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/nchan/pub/'.$this->asyncChannelId,
            PBXCoreRESTClientProvider::HTTP_METHOD_POST,
            $message,
            ['Content-Type' => 'application/json']
        ]);
    }


    /**
     * Installs a new additional extension module from an early uploaded zip archive.
     *
     * @param string $filePath The path to the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    protected function startModuleInstallation(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $resModuleMetadata = GetMetadataFromModulePackageAction::main($filePath);
        if (!$resModuleMetadata->success) {
            return $resModuleMetadata;
        }

        // Reset module unique id from package json data
        $this->moduleUniqueId = $resModuleMetadata->data['uniqid'];

        // Disable the module if it's enabled
        $moduleWasEnabled = false;
        if (PbxExtensionUtils::isEnabled($this->moduleUniqueId)) {
            $res = DisableModuleAction::main($this->moduleUniqueId);
            if (!$res->success) {
                return $res;
            }
            $moduleWasEnabled = true;
        }

        $currentModuleDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueId);
        $needBackup = is_dir($currentModuleDir);

        if ($needBackup) {
            UninstallModuleAction::main($this->moduleUniqueId, true);
        }

        // Start the background process to install the module
        $temp_dir = dirname($filePath);

        // Create a progress file to track the installation progress
        file_put_contents($temp_dir . '/installation_progress', '0');

        // Create an error file to store any installation errors
        file_put_contents($temp_dir . '/installation_error', '');

        $install_settings = [
            FilesConstants::FILE_PATH => $filePath,
            'currentModuleDir' => $currentModuleDir,
            'uniqid' => $this->moduleUniqueId,
        ];

        // Save the installation settings to a JSON file
        $settings_file = "{$temp_dir}/install_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
        $phpPath = Util::which('php');
        $workerModuleInstallerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);

        // Execute the background process to install the module
        Processes::mwExecBg("{$phpPath} -f {$workerModuleInstallerPath} start '{$settings_file}'");
        $res->data[FilesConstants::FILE_PATH] = $filePath;
        $res->data[self::MODULE_WAS_ENABLED] = $moduleWasEnabled;
        $res->success = true;

        return $res;
    }
}