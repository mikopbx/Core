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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use MikoPBX\Common\Providers\RedisClientProvider;
use Redis;
use Throwable;

/**
 *  Class ModuleInstallationBase
 *  Base methods and functions for module installation
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class ModuleInstallationBase extends Injectable
{
    // Common constants
    public const string INSTALLATION_MUTEX = 'ModuleInstallation';
    public const string MODULE_WAS_ENABLED = 'moduleWasEnabled';

    // Redis keys for module installation state
    public const string REDIS_MODULE_INSTALLATION_KEY = 'module:installation:';
    public const string REDIS_MODULE_POST_INSTALL_QUEUE = 'module:post_install_queue';
    public const int REDIS_MODULE_INSTALL_TTL = 1800; // 30 minutes

    // Error messages
    public const string ERR_EMPTY_REPO_RESULT = "ext_EmptyRepoAnswer";
    public const string MSG_NO_LICENSE_REQ = "ext_NoLicenseRequired";
    public const string ERR_DOWNLOAD_TIMEOUT = "ext_ErrDownloadTimeout";
    public const string ERR_UPLOAD_TIMEOUT = "ext_ErrUploadTimeout";
    public const string ERR_INSTALLATION_TIMEOUT = "ext_ErrInstallationTimeout";

    public const string ERR_EMPTY_GET_MODULE_LINK = "ext_WrongGetModuleLink";

    // Timeout values
    public const int INSTALLATION_TIMEOUT = 120;

    // Install stages
    public const string STAGE_I_GET_RELEASE = 'Stage_I_GetRelease';
    public const string STAGE_I_UPLOAD_MODULE = 'Stage_I_UploadModule'; // Install from package stage
    public const string STAGE_II_CHECK_LICENSE = 'Stage_II_CheckLicense';
    public const string STAGE_III_GET_LINK = 'Stage_III_GetDownloadLink';
    public const string STAGE_IV_DOWNLOAD_MODULE = 'Stage_IV_DownloadModule';
    public const string STAGE_V_INSTALL_MODULE = 'Stage_V_InstallModule';
    public const string STAGE_VI_ENABLE_MODULE = 'Stage_VI_EnableModule';
    public const string STAGE_VII_FINAL_STATUS = 'Stage_VII_FinalStatus';


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
    protected function installNewModule(string $filePath): array
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
            $this->pushMessageToBrowser(self::STAGE_V_INSTALL_MODULE, $resStatus->getResult());
            if (!$resStatus->success) {
                return [$resStatus->messages, false];
            } elseif ($resStatus->data[StatusOfModuleInstallationAction::I_STATUS] === StatusOfModuleInstallationAction::INSTALLATION_IN_PROGRESS) {
                sleep(1); // Adjust sleep time as needed
                $maximumInstallationTime--;
            } elseif ($resStatus->data[StatusOfModuleInstallationAction::I_STATUS] === StatusOfModuleInstallationAction::INSTALLATION_COMPLETE) {
                // Phase 1 (PreInstallation) is complete
                // The worker will restart, and Phase 2 (PostInstallation) will be handled by WorkerApiCommands
                return [$installationResult, true];
            }
        }

        // Installation timeout
        $this->pushMessageToBrowser(self::STAGE_V_INSTALL_MODULE, [self::ERR_INSTALLATION_TIMEOUT]);
        return [[self::ERR_INSTALLATION_TIMEOUT], false];
    }

    /**
     * Enables the module if it was previously enabled.
     * This function checks the installation result and enables the module if needed.
     *
     * @param PBXApiResult $installationResult Result object from the installation process.
     *
     * @return array An array containing the module enabling process result and a success flag.
     */
    protected function enableModule(PBXApiResult $installationResult): array
    {
        // Check if the module was previously enabled
        if ($installationResult->data[self::MODULE_WAS_ENABLED]) {
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
    protected function pushMessageToBrowser(string $stage, array $data): void
    {
        $message = [
            'stage' => $stage,
            'moduleUniqueId' => $this->moduleUniqueId,
            'stageDetails' => $data,
            'pid' => posix_getpid()
        ];

        SystemMessages::sysLogMsg(
            __CLASS__,
            json_encode($message, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            LOG_DEBUG
        );

        $di = Di::getDefault();
        $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/nchan/pub/' . $this->asyncChannelId,
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
            // Pass additional parameters for post-installation
            self::MODULE_WAS_ENABLED => $moduleWasEnabled,
            'asyncChannelId' => $this->asyncChannelId,
        ];

        // Save the installation settings to a JSON file
        $settings_file = "$temp_dir/install_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );

        // Save installation state in Redis for post-installation handling after worker restart
        $redis = RedisClientProvider::getApiRequestsConnection(Di::getDefault());
        $installationKey = self::REDIS_MODULE_INSTALLATION_KEY . $this->moduleUniqueId;
        $redis->setex(
            $installationKey,
            self::REDIS_MODULE_INSTALL_TTL,
            json_encode([
                'uniqid' => $this->moduleUniqueId,
                self::MODULE_WAS_ENABLED => $moduleWasEnabled,
                'asyncChannelId' => $this->asyncChannelId,
                'filePath' => $filePath,
                'status' => 'preinstalled',
                'timestamp' => time(),
            ])
        );
        // Add to queue for post-installation processing
        $redis->rPush(self::REDIS_MODULE_POST_INSTALL_QUEUE, $this->moduleUniqueId);

        $php = Util::which('php');
        $workerModuleInstallerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);

        // Execute the background process to install the module
        Processes::mwExecBg("$php -f $workerModuleInstallerPath start '$settings_file'");
        $res->data[FilesConstants::FILE_PATH] = $filePath;
        $res->data[self::MODULE_WAS_ENABLED] = $moduleWasEnabled;
        $res->success = true;

        return $res;
    }

    /**
     * Handles post-installation process of a module after worker restart
     * This is called by WorkerApiCommands after restarting to complete the installation
     *
     * @param string $moduleUniqueId The unique ID of the module
     * @param array $installData Installation data from Redis
     * @return void
     */
    public function postInstallModule(string $moduleUniqueId, array $installData, Redis $redis): void
    {
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Starting post-installation process for module: {$moduleUniqueId}",
            LOG_NOTICE
        );

        // Set module data from Redis
        $this->moduleUniqueId = $moduleUniqueId;
        $this->asyncChannelId = $installData['asyncChannelId'] ?? '';
        $moduleWasEnabled = $installData[self::MODULE_WAS_ENABLED] ?? false;

        // Enable module if it was previously enabled
        $enableResult = [[], true];
        if ($moduleWasEnabled) {
            $res = EnableModuleAction::main($moduleUniqueId);
            $this->pushMessageToBrowser(self::STAGE_VI_ENABLE_MODULE, $res->getResult());
            $enableResult = [$res->messages, $res->success];
        }

        // Send final status to browser
        $finalStatus = [
            'result' => $enableResult[1],
            'messages' => $enableResult[0]
        ];
        $this->pushMessageToBrowser(self::STAGE_VII_FINAL_STATUS, $finalStatus);

        // Clean up Redis key
        $redis->del(self::REDIS_MODULE_INSTALLATION_KEY . $moduleUniqueId);

        SystemMessages::sysLogMsg(
            __CLASS__,
            "Post-installation process completed for module: {$moduleUniqueId} with result: " . 
            ($enableResult[1] ? 'success' : 'failure'),
            LOG_NOTICE
        );
    }

    /**
     * Check for pending module installations that need post-installation processing
     * This method runs after worker restart to complete module installations
     * 
     * @param Redis $redis Redis connection to use
     * @return void
     */
    public static function processModulePostInstallations(Redis $redis): void
    {
        try {
            // Check if there are modules waiting for post-installation
            $moduleInstallKey = self::REDIS_MODULE_POST_INSTALL_QUEUE;
            
            // Get all pending module IDs
            $pendingModules = $redis->lRange($moduleInstallKey, 0, -1);
            
            if (empty($pendingModules)) {
                SystemMessages::sysLogMsg(
                    self::class,
                    sprintf('Found %d modules pending post-installation', 0),
                    LOG_NOTICE
                );
                return;
            }
            
            SystemMessages::sysLogMsg(
                self::class,
                sprintf('Found %d modules pending post-installation', count($pendingModules)),
                LOG_NOTICE
            );

            // Process each pending module
            foreach ($pendingModules as $moduleId) {
                self::completeModuleInstallation($moduleId, $redis);
                // Remove this module from the list - corrected parameter order
                // lrem signature: (string $key, mixed $value, int $count = 0)
                $redis->lRem($moduleInstallKey, $moduleId, 1);
            }
            
            // Verify if all pending modules have been processed
            $remainingModules = $redis->lRange($moduleInstallKey, 0, -1);
            if (empty($remainingModules)) {
                // All modules have been processed, clear the queue
                $redis->del($moduleInstallKey);
                SystemMessages::sysLogMsg(
                    self::class,
                    'All pending module installations completed and queue cleared',
                    LOG_NOTICE
                );
            } else {
                SystemMessages::sysLogMsg(
                    self::class,
                    sprintf('Still %d modules remaining in post-installation queue', count($remainingModules)),
                    LOG_WARNING
                );
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                self::class,
                'Error processing post-installations: ' . $e->getMessage(),
                LOG_ERR
            );
        }
    }

    /**
     * Complete installation for a specific module
     * 
     * @param string $moduleId The unique ID of the module
     * @param Redis $redis Redis connection to use
     * @return void
     */
    public static function completeModuleInstallation(string $moduleId, Redis $redis): void
    {
        try {
            $installationKey = self::REDIS_MODULE_INSTALLATION_KEY . $moduleId;
            $installData = $redis->get($installationKey);
            
            if (empty($installData)) {
                SystemMessages::sysLogMsg(
                    self::class,
                    "Cannot find installation data for module $moduleId",
                    LOG_WARNING
                );
                return;
            }
            
            $installData = json_decode($installData, true);
            
            // Check if module is actually installed
            if (($installData['status'] ?? '') !== 'installed' || empty($installData['installComplete'])) {
                SystemMessages::sysLogMsg(
                    self::class,
                    "Module $moduleId is not yet fully installed, skipping post-installation",
                    LOG_NOTICE
                );
                return;
            }
            
            SystemMessages::sysLogMsg(
                self::class,
                "Starting post-installation process for module $moduleId",
                LOG_NOTICE
            );
            
            // Create instance of ModuleInstallationBase to handle post-installation
            $installer = new self();
            $installer->postInstallModule($moduleId, $installData, $redis);
            
            SystemMessages::sysLogMsg(
                self::class,
                "Post-installation process completed for module $moduleId",
                LOG_NOTICE
            );
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                self::class,
                'Error completing module installation: ' . $e->getMessage(),
                LOG_ERR
            );
        }
    }
}
