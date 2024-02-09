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
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Handles the installation of new modules.
 * This class provides functionality to install new additional extension modules for MikoPBX.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class InstallFromRepo extends \Phalcon\Di\Injectable
{
    public const CHANNEL_INSTALL_NAME = 'http://127.0.0.1/pbxcore/api/nchan/pub/install-module';

    // Error messages
    const ERR_EMPTY_REPO_RESULT = "ext_EmptyRepoAnswer";
    const ERR_DOWNLOAD_TIMEOUT = "ext_ErrDownloadTimeout";
    const ERR_INSTALLATION_TIMEOUT = "ext_ErrInstallationTimeout";

    // Timeout values
    const INSTALLATION_TIMEOUT = 120;
    const DOWNLOAD_TIMEOUT = 120;

    /**
     * Main entry point to install a new module.
     * This function handles the entire process of installing a new module, including
     * acquiring a mutex, checking the license, downloading, and installing the module.
     *
     * @param string $moduleUniqueID The unique identifier for the module to be installed.
     * @param int $releaseId Optional release ID for the module. Defaults to 0.
     *
     */
    public static function main(string $moduleUniqueID, int $releaseId = 0): void
    {
        // Calculate total mutex timeout and extra 5 seconds to prevent installing the same module in the second thread
        $mutexTimeout = self::INSTALLATION_TIMEOUT+self::DOWNLOAD_TIMEOUT+5;

        // Create a mutex to ensure synchronized access
        $mutex = Util::createMutex('InstallFromRepo', $moduleUniqueID, $mutexTimeout);

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Synchronize the installation process
        try{
            $mutex->synchronized(
            function () use ($moduleUniqueID, $releaseId, &$res): void {

                // Retrieve release information
                list($releaseInfoResult, $res->success) = self::getReleaseInfo($moduleUniqueID, $releaseId);
                if (!$res->success) {
                    $res->messages['error'][] = $releaseInfoResult;
                    return;
                }

                // Capture the license for the module
                list($licenseResult, $res->success) = self::captureFeature($releaseInfoResult);
                if (!$res->success) {
                    $res->messages = $licenseResult;
                    return;
                }

                // Get the download link for the module
                list($moduleLinkResult, $res->success) = self::getModuleLink($releaseInfoResult);
                if (!$res->success) {
                    $res->messages['error'][] = $moduleLinkResult;
                    return;
                }

                // Download the module
                list($downloadResult, $res->success) = self::downloadModule($moduleLinkResult, $moduleUniqueID);
                if (!$res->success) {
                    $res->messages['error'][] = $downloadResult;
                    return;
                } else {
                    $filePath = $downloadResult; // Path to the downloaded module
                }

                // Install the downloaded module
                list($installationResult, $res->success) = self::installNewModule($filePath, $moduleUniqueID);
                if (!$res->success) {
                    $res->messages['error'][] = $installationResult;
                    return;
                }

                // Enable the module if it was previously enabled
                list($enableResult, $res->success) = self::enableModule($moduleUniqueID, $installationResult);
                if (!$res->success) {
                    $res->messages['error'][] = $enableResult;
                }
            });
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        } finally {
            self::pushMessageToBrowser($res->getResult());
        }

    }



    /**
     * Retrieves the release information for a specific module.
     * This function gets detailed information about the release based on the unique module ID and release ID.
     *
     * @param string $moduleUniqueID Unique identifier for the module.
     * @param int $releaseId Optional release ID. If not specified, the latest release is selected.
     *
     * @return array An array containing the release information and a success flag.
     */
    private static function getReleaseInfo(string $moduleUniqueID, int $releaseId = 0): array
    {
        // Retrieve module information
        $moduleInfo = GetModuleInfo::main($moduleUniqueID);

        // Check if release information is available
        if (empty($moduleInfo->data['releases'])) {
            return [self::ERR_EMPTY_REPO_RESULT, false];
        }
        $releaseInfo['releaseID'] = 0;
        $releaseInfo['moduleUniqueID'] = $moduleUniqueID;

        // Find the specified release or the latest one
        foreach ($moduleInfo->data['releases'] as $release) {
            if ($release['releaseID'] === $releaseId) {
                $releaseInfo['releaseID'] = $release['releaseID'];
                $releaseInfo['hash'] = $release['hash'];
                break;
            } elseif ($release['releaseID'] > $releaseInfo['releaseID']) {
                $releaseInfo['releaseID'] = $release['releaseID'];
                $releaseInfo['hash'] = $release['hash'];
            }
        }
        // Additional information for license management
        $releaseInfo['licFeatureId'] = intval($releaseInfo['lic_feature_id']);
        $releaseInfo['licProductId'] = intval($releaseInfo['lic_product_id']);

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
    private static function captureFeature(array $releaseInfo): array
    {
        // Check if a feature license is required
        if ($releaseInfo['featureId'] === 0) {
            return [[], true]; // No license required
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
    private static function getModuleLink(array $releaseInfo): array
    {
        $res = GetModuleLink::main($releaseInfo['releaseID']);
        return [$res->messages, $res->success];
    }

    /**
     * Downloads the module from the provided link.
     * This function handles the download process, ensuring that it completes within the allotted time.
     *
     * @param array $moduleLink Download link for the module and md5 hash
     *
     * @return array An array containing the path to the downloaded module or an error message, and a success flag.
     */
    private static function downloadModule(array $moduleLink, string $moduleUniqueID): array
    {
        // Initialization
        $url = $moduleLink['download_link'];
        $md5 = $moduleLink['hash'];
        $maximumDownloadTime = self::DOWNLOAD_TIMEOUT;

        // Start the download
        $res = StartDownload::main($moduleUniqueID, $url, $md5);
        if (!$res->success) {
            return [$res->messages, false];
        }

        // Monitor download progress
        while ($maximumDownloadTime > 0) {
            $res = DownloadStatus::main($moduleUniqueID);
            if (!$res->success) {
                return [$res->messages, false];
            } elseif ($res->data[DownloadStatus::D_STATUS] = DownloadStatus::DOWNLOAD_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $message = [
                    'action' => 'DownloadStatus',
                    'uniqueId' => $moduleUniqueID,
                    'data' => $res->data,
                ];
                self::pushMessageToBrowser($message);
                $maximumDownloadTime--;
            } elseif ($res->data[DownloadStatus::D_STATUS] = DownloadStatus::DOWNLOAD_COMPLETE) {
                return [$res->data[DownloadStatus::FILE_PATH], true];
            }
        }

        // Download timeout
        return [self::ERR_DOWNLOAD_TIMEOUT, false];
    }


    /**
     * Installs the module from the specified file path.
     * This function manages the module installation process, ensuring completion within the defined timeout.
     *
     * @param string $filePath Path to the module file.
     *
     * @return array An array containing the installation result and a success flag.
     */
    private static function installNewModule(string $filePath, string $moduleUniqueID):array
    {
        // Initialization
        $maximumInstallationTime = self::INSTALLATION_TIMEOUT;

        // Start installation
        $res = InstallFromPackage::main($filePath);
        if (!$res->success) {
            return [$res->messages, false];
        }

        // Monitor installation progress
        while ($maximumInstallationTime > 0) {
            $res = StatusOfModuleInstallation::main($filePath);
            if (!$res->success) {
                return [$res->messages, false];
            } elseif ($res->data[StatusOfModuleInstallation::I_STATUS] = StatusOfModuleInstallation::INSTALLATION_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $message = [
                    'action' => 'StatusOfModuleInstallation',
                    'uniqueId' => $moduleUniqueID,
                    'data' => $res->data,
                ];
                self::pushMessageToBrowser($message);
                $maximumInstallationTime--;
            } elseif ($res->data[StatusOfModuleInstallation::I_STATUS] = StatusOfModuleInstallation::INSTALLATION_COMPLETE) {
                return [true, true];
            }
        }

        // Installation timeout
        return [self::ERR_INSTALLATION_TIMEOUT, false];
    }

    /**
     * Enables the module if it was previously enabled.
     * This function checks the installation result and enables the module if needed.
     *
     * @param string $moduleUniqueID Unique identifier for the module.
     * @param PBXApiResult $installationResult Result object from the installation process.
     *
     * @return array An array containing the module enabling process result and a success flag.
     */
    private static function enableModule(string $moduleUniqueID, PBXApiResult $installationResult):array
    {
        // Check if the module was previously enabled
        if ($installationResult->data[InstallFromPackage::MODULE_WAS_ENABLED]){
            $res = EnableModule::main($moduleUniqueID);
            return [$res->messages, $res->success];
        }
        return [[], true];
    }

    /**
     * Pushes messages to browser
     * @param array $message
     * @return void
     */
    public static function pushMessageToBrowser(array $message):void
    {
        $client  = new \GuzzleHttp\Client();
        $options = [
            'timeout'       => 5,
            'http_errors'   => false,
            'headers'       => [],
            'json'          => $message,
        ];
        try {
            $client->request('POST', self::CHANNEL_INSTALL_NAME, $options);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }
}