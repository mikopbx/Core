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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\Files\StatusUploadFileAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 *  Class InstallModuleFromPackage
 *  Installs a new additional extension module from an early uploaded zip archive.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class InstallFromPackageAction extends ModuleInstallationBase
{

    const UPLOAD_TIMEOUT = 120;

    // Path to the downloaded zip archive
    private string $filePath;

    // File id of the uploaded zip archive
    private string $fileId;

    /**
     * @param string $asyncChannelId Pub/sub nchan channel id to send response to frontend
     * @param string $filePath Path to the downloaded zip archive
     * @param string $fileId File id of the uploaded zip archive
     */
    public function __construct(string $asyncChannelId, string $filePath, string $fileId)
    {
        $this->asyncChannelId = $asyncChannelId;
        $this->filePath = $filePath;
        $this->fileId = $fileId;
        $this->moduleUniqueId = $fileId;
    }

    /**
     * Main entry point to install a new module from a zip archive.
     * This function handles the entire process of installing a new module.
     *
     */
    public function start(): void
    {
        // Calculate total mutex timeout and extra 5 seconds to prevent installing the same module in the second thread
        $mutexTimeout = self::INSTALLATION_TIMEOUT+self::UPLOAD_TIMEOUT+5;

        // Create a mutex to ensure synchronized access
        $mutex = Util::createMutex(self::INSTALLATION_MUTEX, $this->moduleUniqueId, $mutexTimeout);

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Singleton the installation process
        try{
            $mutex->synchronized(
                function () use (&$res): void {

                    // Wait until file upload and merge
                    list($fileUploadResult, $res->success) = $this->waitForFileUpload($this->fileId);
                    if (!$res->success) {
                        $res->messages = $fileUploadResult;
                        return;
                    }

                    // Install the downloaded module
                    list($installationResult, $res->success) = $this->installNewModule($this->filePath);
                    if (!$res->success) {
                        $res->messages = $installationResult;
                        return;
                    }

                    // Enable the module if it was previously enabled
                    list($enableResult, $res->success) = $this->enableModule($installationResult);
                    if (!$res->success) {
                        $res->messages = $enableResult;
                    }

                });
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages['error'] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        } finally {
            $this->pushMessageToBrowser( self::STAGE_VII_FINAL_STATUS, $res->getResult());
        }

    }

    /**
     * Uploads the module file, merge it by the provided file ID.
     * This function handles the upload process, ensuring that it completes within the allotted time.
     *
     * @param string $fileId File id of the uploaded zip archive
     *
     * @return array An array containing the path to the downloaded module or an error message, and a success flag.
     */
    private function waitForFileUpload(string $fileId): array
    {
        // Initialization
        $maximumUploadTime = self::UPLOAD_TIMEOUT;

        // Monitor upload and merging progress
        while ($maximumUploadTime > 0) {
            $resUploadStatus = StatusUploadFileAction::main($fileId);

            $this->pushMessageToBrowser( self::STAGE_I_UPLOAD_MODULE, $resUploadStatus->getResult());
            if (!$resUploadStatus->success) {
                return [$resUploadStatus->messages, false];
            } elseif ($resUploadStatus->data[FilesConstants::D_STATUS] === FilesConstants::UPLOAD_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $maximumUploadTime--;
            } elseif ($resUploadStatus->data[FilesConstants::D_STATUS] === FilesConstants::UPLOAD_COMPLETE) {
                return [$resUploadStatus->messages, true];
            }
        }

        // Upload or merging timeout
        $this->pushMessageToBrowser( self::STAGE_I_UPLOAD_MODULE, [self::ERR_UPLOAD_TIMEOUT]);
        return [self::ERR_UPLOAD_TIMEOUT, false];
    }
}