<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Workers;


require_once 'Globals.php';

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\ModuleArchiveExtractor;
use Throwable;

/**
 * The WorkerModuleInstaller class is responsible for handling the installation of a module from a file
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerModuleInstaller extends WorkerBase
{
    private string $progress_file = '';
    private string $error_file = '';
    private ?string $asyncChannelId = null;
    private bool $moduleWasEnabled = false;
    private string $moduleUniqueId = '';

    /**
     * Starts the module installation worker process.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $settings_file = $argv[2]??'';

        // Check if the settings file exists
        if ( ! file_exists($settings_file)) {
            SystemMessages::sysLogMsg(__CLASS__, 'File with settings did not found', LOG_ERR);
            return;
        }
        $settings = json_decode(file_get_contents($settings_file), true);
        $this->moduleUniqueId = $settings['uniqid'];
        $this->asyncChannelId = $settings['asyncChannelId'] ?? null;
        $this->moduleWasEnabled = $settings['moduleWasEnabled'] ?? false;

        cli_set_process_title(__CLASS__.'-'.$this->moduleUniqueId);

        // Initialize Redis connection explicitly — WorkerBase declares
        // $redis = null to suppress Injectable::__get() magic (issue #1022),
        // so we must obtain the client from DI ourselves.
        $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);

        $temp_dir            = dirname($settings['filePath']);
        $this->progress_file = $temp_dir . '/installation_progress';
        $this->error_file    = $temp_dir . '/installation_error';
        file_put_contents( $this->progress_file, '0');
        file_put_contents( $this->error_file, '');

        // Extraction + installModule run directly here. The manipulation mutex is
        // held by the orchestrator (InstallFromRepoAction/InstallFromPackageAction)
        // across the spawn+poll, so this child must NOT re-acquire the same key —
        // doing so deadlocks against the parent that is waiting on our progress.
        $this->installNewModuleFromFile(
            $settings['currentModuleDir'],
            $settings['filePath'],
            $this->moduleUniqueId
        );
    }

    /**
     * Installs a new module from a file.
     *
     * @param string $currentModuleDir The directory of the current module.
     * @param string $filePath The path to the module file.
     * @param string $moduleUniqueID The unique ID of the module.
     * @return void
     */
    private function installNewModuleFromFile(
        string $currentModuleDir,
        string $filePath,
        string $moduleUniqueID
    ): void {
        try {
            // Start extraction phase
            file_put_contents($this->progress_file, '25');

            // Unzip module folder through the shared hardened extractor
            // (Zip Slip / symlink / confinement protection lives there)
            $extractionError = ModuleArchiveExtractor::extract(
                $filePath,
                $currentModuleDir,
                function (int $percent): void {
                    // Map extraction to the legacy 25%..50% progress range
                    file_put_contents($this->progress_file, (string)(25 + intdiv($percent, 4)));
                }
            );

            if ($extractionError !== '') {
                file_put_contents($this->error_file, $extractionError, FILE_APPEND);
                file_put_contents($this->progress_file, '0');

                // Remove the freshly-extracted (now half-extracted) module dir so a
                // failed install does not leave a broken module on disk.
                $this->cleanupAfterFailure($currentModuleDir, $filePath);
                return;
            }

            // Report extraction phase complete
            file_put_contents($this->progress_file, '50');

            // Prepare for installation phase
            ModulesDBConnectionsProvider::recreateModulesDBConnections();
            Util::addRegularWWWRights($currentModuleDir);

            // Run the module setup
            $pbxExtensionSetupClass = "Modules\\$moduleUniqueID\\Setup\\PbxExtensionSetup";
            if (class_exists($pbxExtensionSetupClass)
                && method_exists($pbxExtensionSetupClass, 'installModule')) {
                try {
                    // Set language preference to use web admin language for CLI operations
                    // This ensures error messages during installation are shown in the correct language
                    $this->di->set(LanguageProvider::PREFERRED_LANG_WEB, true);

                    // Create setup instance
                    $setup = new $pbxExtensionSetupClass($moduleUniqueID);

                    // Update progress during setup (50% to 90% range)
                    file_put_contents($this->progress_file, '70');

                    // Run installation
                    $installResult = $setup->installModule();

                    // Update progress after installation
                    file_put_contents($this->progress_file, '90');

                    if (!$installResult) {
                        $errorMessage = implode(" ", $setup->getMessages());
                        if (trim($errorMessage) === '') {
                            // installModule() returned false but reported no message.
                            // The status reader decides COMPLETE vs ERROR purely by
                            // whether the error file is non-empty, so a silent failure
                            // would otherwise be reported as success. Guarantee a
                            // non-empty error.
                            $errorMessage = "Module $moduleUniqueID installation failed without a specific error message.";
                        }
                        file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
                        SystemMessages::sysLogMsg(__CLASS__, "Installation error: {$errorMessage}", LOG_ERR);

                        // installModule() failed after the dir was extracted — remove
                        // the half-installed module dir so it is not left behind.
                        $this->cleanupAfterFailure($currentModuleDir, $filePath);
                    } else {
                        // Installation succeeded

                        // Update module installation status in Redis
                        $installationKey = ModuleInstallationBase::REDIS_MODULE_INSTALLATION_KEY . $moduleUniqueID;
                        $installData = json_decode($this->redis->get($installationKey) ?? '{}', true);
                        $installData['status'] = 'installed';
                        $installData['installComplete'] = true;
                        $this->redis->setex(
                            $installationKey,
                            ModuleInstallationBase::REDIS_MODULE_INSTALL_TTL,
                            json_encode($installData)
                        );

                        SystemMessages::sysLogMsg(
                            __CLASS__,
                            "Module $moduleUniqueID installed successfully, updated Redis state.",
                            LOG_NOTICE
                        );

                    }
                } catch (Throwable $e) {
                    $errorMessage = 'Exception on installNewModuleFromFile: ' . $e->getMessage();
                    file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
                    SystemMessages::sysLogMsg(__CLASS__, $errorMessage, LOG_ERR);

                    // Setup threw after extraction — remove the half-installed dir.
                    $this->cleanupAfterFailure($currentModuleDir, $filePath);
                }
            } else {
                $errorMessage = "Install error: the class $pbxExtensionSetupClass does not exists";
                file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
                SystemMessages::sysLogMsg(__CLASS__, $errorMessage, LOG_ERR);

                // The extracted package has no usable setup class — clean it up.
                $this->cleanupAfterFailure($currentModuleDir, $filePath);
            }

            // Always mark as 100% complete, even if there was an error
            // The frontend will read the error file to see if there was a problem
            file_put_contents($this->progress_file, '100');

            // Log completion
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Module installation completed for $moduleUniqueID",
                LOG_NOTICE
            );

        } catch (Throwable $e) {
            // Catch any unexpected exceptions
            $errorMessage = 'Fatal error during module installation: ' . $e->getMessage();
            file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
            SystemMessages::sysLogMsg(__CLASS__, $errorMessage, LOG_ERR);

            // Best-effort cleanup of the half-installed module dir on a fatal error.
            $this->cleanupAfterFailure($currentModuleDir, $filePath);

            // Ensure progress is updated
            file_put_contents($this->progress_file, '100');
        }
    }

    /**
     * Cleans up after a failed installation.
     *
     * Removes the freshly-extracted module directory immediately, then schedules a
     * deferred removal of the upload temp directory (modulefile.zip,
     * install_settings.json, install temp dir). The temp dir removal is deferred so
     * the status poller can still read installation_error / installation_progress
     * first — contrast WorkerMergeUploadedFile, which rm -rf's its temp dir on error.
     *
     * @param string $currentModuleDir The freshly-extracted module directory.
     * @param string $filePath The path to the uploaded module zip (its dir is the temp dir).
     * @return void
     */
    private function cleanupAfterFailure(string $currentModuleDir, string $filePath): void
    {
        if ($currentModuleDir !== '' && is_dir($currentModuleDir)) {
            Processes::mwExecBg('rm -rf ' . escapeshellarg($currentModuleDir));
        }

        $temp_dir = dirname($filePath);
        if ($temp_dir !== '' && $temp_dir !== '.' && $temp_dir !== '/' && is_dir($temp_dir)) {
            // Deferred so the poller reads installation_error before the dir vanishes.
            Processes::mwExecBg('rm -rf ' . escapeshellarg($temp_dir), '/dev/null', 600);
        }
    }
}

// Start a worker process
WorkerModuleInstaller::startWorker($argv ?? []);
