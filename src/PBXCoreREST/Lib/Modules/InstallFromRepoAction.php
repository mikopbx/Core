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
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Handles the installation of new modules.
 * This class provides functionality to install new additional extension modules for MikoPBX.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class InstallFromRepoAction extends ModuleInstallationBase
{
    const DOWNLOAD_TIMEOUT = 120;

    // Optional release ID for the module. Defaults to 0.
    private int $moduleReleaseId = 0;

    /**
     * Class constructor
     *
     * @param string $asyncChannelId Pub/sub nchan channel id to send response to frontend
     * @param string $moduleUniqueId The unique identifier for the module to be installed.
     * @param int $moduleReleaseId Optional release ID for the module. Defaults to 0.
     */
    public function __construct(string $asyncChannelId, string $moduleUniqueId, int $moduleReleaseId=0)
    {
        $this->asyncChannelId = $asyncChannelId;
        $this->moduleUniqueId = $moduleUniqueId;
        $this->moduleReleaseId = $moduleReleaseId;
    }


    /**
     * Main entry point to install a new module.
     * This function handles the entire process of installing a new module, including
     * acquiring a mutex, checking the license, downloading, and installing the module.
     */
    public function start(): void
    {
        // Calculate total mutex timeout and extra 5 seconds to prevent installing the same module in the second thread
        $mutexTimeout = self::INSTALLATION_TIMEOUT+self::DOWNLOAD_TIMEOUT+5;

        // Create a mutex to ensure synchronized access
        $mutex = Util::createMutex(self::INSTALLATION_MUTEX, $this->moduleUniqueId, $mutexTimeout);

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Singleton the installation process
        try{
            $mutex->synchronized(
            function () use (&$res): void {

                // Retrieve release information
                list($releaseInfoResult, $res->success) = $this->getReleaseInfo();
                $this->pushMessageToBrowser(self::STAGE_I_GET_RELEASE, $releaseInfoResult);
                if (!$res->success) {
                    $res->messages['error'] = $releaseInfoResult;
                    return;
                }

                // Capture the license for the module
                list($licenseResult, $res->success) = $this->captureFeature($releaseInfoResult);
                $this->pushMessageToBrowser( self::STAGE_II_CHECK_LICENSE, $licenseResult);
                if (!$res->success) {
                    $res->messages = $licenseResult;
                    return;
                }

                // Get the download link for the module
                list($moduleLinkResult, $res->success) = $this->getModuleLink($releaseInfoResult);
                $this->pushMessageToBrowser( self::STAGE_III_GET_LINK, $moduleLinkResult);
                if (!$res->success) {
                    $res->messages = $moduleLinkResult;
                    return;
                }

                // Download the module
                list($downloadResult, $res->success) = $this->downloadModule($moduleLinkResult);
                if (!$res->success) {
                    $res->messages = $downloadResult;
                    return;
                } else {
                    $filePath = $downloadResult; // Path to the downloaded module
                }

                // Install the downloaded module
                list($installationResult, $res->success) = $this->installNewModule($filePath);
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
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        } finally {
            $this->pushMessageToBrowser( self::STAGE_VII_FINAL_STATUS, $res->getResult());
        }
    }

    /**
     * Retrieves the release information for a specific module.
     * This function gets detailed information about the release based on the unique module ID and release ID.
     *
     * @return array An array containing the release information and a success flag.
     */
    private function getReleaseInfo(): array
    {
        // Retrieve module information
        $moduleInfo = GetModuleInfoAction::main($this->moduleUniqueId);

        // Check if release information is available
        if (empty($moduleInfo->data['releases'])) {
            return [[self::ERR_EMPTY_REPO_RESULT], false];
        }
        $releaseInfo =[];
        $releaseInfo['releaseID'] = 0;

        // Find the specified release or the latest one
        foreach ($moduleInfo->data['releases'] as $release) {
            if (intval($release['releaseID']) === $this->moduleReleaseId) {
                $releaseInfo['releaseID'] = $release['releaseID'];
                break;
            } elseif (intval($release['releaseID']) > $releaseInfo['releaseID']) {
                $releaseInfo['releaseID'] = $release['releaseID'];
            }
        }
        // Additional information for license management
        $releaseInfo['licFeatureId'] = intval($moduleInfo->data['lic_feature_id']);
        $releaseInfo['licProductId'] = intval($moduleInfo->data['lic_product_id']);
        return [$releaseInfo, true];
    }

    /**
     * Captures the feature license for the module installation.
     * This function checks and captures the necessary license for installing the module based on the release information.
     *
     * @param array $releaseInfo Release information array.
     *
     * @return array An array containing the license capture result and a success flag.
     */
    private function captureFeature(array $releaseInfo): array
    {
        // Check if a feature license is required
        if ($releaseInfo['licFeatureId'] === 0) {
            return [[self::MSG_NO_LICENSE_REQ], true]; // No license required
        }

        // Prepare license capture request
        $request = [
            'action' => 'captureFeatureForProductId',
            'data' => $releaseInfo
        ];

        // Perform license capture
        $res = LicenseManagementProcessor::callBack($request);
        return [$res->messages, $res->success];
    }

    /**
     * Retrieves the download link for the module.
     * This function gets the download link for the module based on its release ID.
     *
     * @param array $releaseInfo Release information array.
     *
     * @return array An array containing the download link and a success flag.
     */
    private function getModuleLink(array $releaseInfo): array
    {
        $res = GetModuleLinkAction::main($releaseInfo['releaseID']);
        if ($res->success){
            $modules =  $res->data['modules']??[];
            if (count($modules) > 0){
                return [$modules[0], true];
            }
            return [[self::ERR_EMPTY_GET_MODULE_LINK], false];
        }
        return [$res->messages, false];
    }

    /**
     * Downloads the module from the provided link.
     * This function handles the download process, ensuring that it completes within the allotted time.
     *
     * @param array $moduleLink Download link for the module and md5 hash
     *
     * @return array An array containing the path to the downloaded module or an error message, and a success flag.
     */
    private function downloadModule(array $moduleLink): array
    {
        // Initialization
        $url = $moduleLink['href'];
        $md5 = $moduleLink['md5'];
        $maximumDownloadTime = self::DOWNLOAD_TIMEOUT;

        // Start the download
        $res = StartDownloadAction::main($this->moduleUniqueId, $url, $md5);
        $this->pushMessageToBrowser( self::STAGE_IV_DOWNLOAD_MODULE, $res->getResult());
        if (!$res->success) {
            return [$res->messages, false];
        }

        // Monitor download progress
        while ($maximumDownloadTime > 0) {
            $resDownloadStatus = DownloadStatusAction::main($this->moduleUniqueId);
            $this->pushMessageToBrowser( self::STAGE_IV_DOWNLOAD_MODULE, $resDownloadStatus->getResult());
            if (!$resDownloadStatus->success) {
                return [$resDownloadStatus->messages, false];
            } elseif ($resDownloadStatus->data[FilesConstants::D_STATUS] === FilesConstants::DOWNLOAD_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $maximumDownloadTime--;
            } elseif ($resDownloadStatus->data[FilesConstants::D_STATUS] === FilesConstants::DOWNLOAD_COMPLETE) {
                return [$resDownloadStatus->data[FilesConstants::FILE_PATH], true];
            }
        }

        // Download timeout
        $this->pushMessageToBrowser( self::STAGE_IV_DOWNLOAD_MODULE, [self::ERR_DOWNLOAD_TIMEOUT]);
        return [self::ERR_DOWNLOAD_TIMEOUT, false];
    }


}