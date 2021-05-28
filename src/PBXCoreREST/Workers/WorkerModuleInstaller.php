<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use Throwable;

class WorkerModuleInstaller extends WorkerBase
{

    private string $progress_file = '';
    private string $error_file = '';

    /**
     * @param mixed $params
     */
    public function start($params): void
    {
        $settings_file = $params[2]??'';
        if ( ! file_exists($settings_file)) {
            Util::sysLogMsg(__CLASS__, 'File with settings did not found', LOG_ERR);

            return;
        }
        $settings = json_decode(file_get_contents($settings_file), true);
        $temp_dir            = dirname($settings['filePath']);
        $this->progress_file = $temp_dir . '/installation_progress';
        $this->error_file    = $temp_dir . '/installation_error';
        $this->installNewModuleFromFile(
            $settings['currentModuleDir'],
            $settings['filePath'],
            $settings['uniqid']
        );

    }

    /**
     * Starts module installation on separate php process
     *
     */
    private function installNewModuleFromFile(
        string $currentModuleDir,
        string $filePath,
        string $moduleUniqueID
    ): void {
        file_put_contents( $this->progress_file, '0');
        file_put_contents( $this->error_file, '');

        // Unzip module folder
        $semZaPath = Util::which('7za');
        Processes::mwExec("{$semZaPath} e -spf -aoa -o{$currentModuleDir} {$filePath}");
        Util::addRegularWWWRights($currentModuleDir);
        file_put_contents( $this->progress_file, '50');
        $pbxExtensionSetupClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
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
                file_put_contents($this->error_file, $e->getMessage(), FILE_APPEND);
            }
        } else {
            file_put_contents($this->error_file,"Install error: the class {$pbxExtensionSetupClass} not exists", FILE_APPEND);
        }
        file_put_contents( $this->progress_file, '100');
    }
}

// Start worker process
WorkerModuleInstaller::startWorker($argv??null);