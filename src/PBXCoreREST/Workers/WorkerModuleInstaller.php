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
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use Throwable;
use ZipArchive;

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
        $temp_dir            = dirname($settings['filePath']);
        $this->progress_file = $temp_dir . '/installation_progress';
        $this->error_file    = $temp_dir . '/installation_error';
        file_put_contents( $this->progress_file, '0');
        file_put_contents( $this->error_file, '');
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
            
            // Unzip module folder
            $zip = new ZipArchive();
            if($zip->open($filePath)) {
                // Get total number of files
                $totalFiles = $zip->numFiles;
                
                // Extract files one by one to track progress
                $result = true;

                // Ensure module directory exists before resolving its real path
                if (!is_dir($currentModuleDir)) {
                    mkdir($currentModuleDir, 0755, true);
                }
                $realModuleDir = realpath($currentModuleDir);
                if ($realModuleDir === false) {
                    $result = false;
                }
                for ($i = 0; $i < $totalFiles && $result; $i++) {
                    $entryName = $zip->getNameIndex($i);

                    // Zip Slip protection: reject entries with path traversal sequences
                    if (str_contains($entryName, '..')) {
                        $message = TranslationProvider::translate(
                            'rest_err_module_path_traversal',
                            ['entryName' => $entryName]
                        );
                        file_put_contents($this->error_file, $message, FILE_APPEND);
                        $result = false;
                        break;
                    }

                    $result = $zip->extractTo($currentModuleDir, [$entryName]);

                    // Post-extraction confinement: verify extracted path stays within module dir
                    if ($result) {
                        $extractedPath = realpath($currentModuleDir . '/' . $entryName);
                        if (
                            $extractedPath !== false
                            && !str_starts_with($extractedPath, $realModuleDir . '/')
                            && $extractedPath !== $realModuleDir
                        ) {
                            // File escaped module directory — remove it and abort
                            @unlink($extractedPath);
                            $message = TranslationProvider::translate(
                                'rest_err_module_path_escape',
                                ['entryName' => $entryName]
                            );
                            file_put_contents($this->error_file, $message, FILE_APPEND);
                            $result = false;
                            break;
                        }
                    }

                    // Calculate and update progress (25% to 50% range)
                    $extractionProgress = 25 + round(($i / $totalFiles) * 25);
                    file_put_contents($this->progress_file, (string)$extractionProgress);
                }
                
                $zip->close();
            } else {
                $result = false;
            }
            
            if ($result === false) {
                file_put_contents(
                    $this->error_file,
                    TranslationProvider::translate('rest_err_module_extraction_failed'),
                    FILE_APPEND
                );
                file_put_contents($this->progress_file, '0');
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
                        file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
                        SystemMessages::sysLogMsg(__CLASS__, "Installation error: {$errorMessage}", LOG_ERR);
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
                }
            } else {
                $errorMessage = "Install error: the class $pbxExtensionSetupClass does not exists";
                file_put_contents($this->error_file, $errorMessage, FILE_APPEND);
                SystemMessages::sysLogMsg(__CLASS__, $errorMessage, LOG_ERR);
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
            
            // Ensure progress is updated
            file_put_contents($this->progress_file, '100');
        }
    }
}

// Start a worker process
WorkerModuleInstaller::startWorker($argv ?? []);