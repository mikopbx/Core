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

use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
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
        cli_set_process_title(__CLASS__.'-'.$settings['uniqid']);
        $temp_dir            = dirname($settings['filePath']);
        $this->progress_file = $temp_dir . '/installation_progress';
        $this->error_file    = $temp_dir . '/installation_error';
        file_put_contents( $this->progress_file, '0');
        file_put_contents( $this->error_file, '');
        $this->installNewModuleFromFile(
            $settings['currentModuleDir'],
            $settings['filePath'],
            $settings['uniqid']
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

        file_put_contents( $this->progress_file, '25');
        // Unzip module folder
        $zip = new ZipArchive();
        if($zip->open($filePath)){
            $result = $zip->extractTo($currentModuleDir);
            $zip->close();
        }else{
            $result = false;
        }
        if ($result === false) {
            file_put_contents($this->error_file, 'Error occurred during module extraction.', FILE_APPEND);
            return;
        }
        file_put_contents( $this->progress_file, '50');
        ModulesDBConnectionsProvider::recreateModulesDBConnections();
        Util::addRegularWWWRights($currentModuleDir);
        $pbxExtensionSetupClass = "Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
        if (class_exists($pbxExtensionSetupClass)
            && method_exists($pbxExtensionSetupClass, 'installModule')) {
            try {
                $setup = new $pbxExtensionSetupClass($moduleUniqueID);
                if ( ! $setup->installModule()) {
                    file_put_contents($this->error_file, implode(" ", $setup->getMessages()), FILE_APPEND);
                } else {
                    Processes::restartAllWorkers();
                }
            } catch (Throwable $e){
                file_put_contents($this->error_file, 'Exception on installNewModuleFromFile: ' . $e->getMessage(), FILE_APPEND);
            }
        } else {
            file_put_contents($this->error_file,"Install error: the class {$pbxExtensionSetupClass} does not exists", FILE_APPEND);
        }
        file_put_contents( $this->progress_file, '100');
    }
}

// Start a worker process
WorkerModuleInstaller::startWorker($argv??[]);