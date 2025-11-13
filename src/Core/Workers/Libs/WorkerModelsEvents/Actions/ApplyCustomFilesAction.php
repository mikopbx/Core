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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\CustomFilesApplier;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;

/**
 * Class ApplyCustomFilesAction
 *
 * Applies custom files with MODE_CUSTOM to the filesystem.
 * This action is triggered when a custom file is created or modified.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions
 */
class ApplyCustomFilesAction extends Injectable implements ReloadActionInterface
{
    /**
     * Execute the action to apply custom files
     *
     * @param array $parameters Array with 'fileId' parameter
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        foreach ($parameters as $record) {

            // Check if specific file ID is provided
            if (isset($record['recordId'])) {
                $file = CustomFiles::findFirstById($record['recordId']);
                if (!$file) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Custom file with ID {$record['recordId']} not found",
                        LOG_WARNING
                    );
                    continue;
                }

                // Skip files with MODE_NONE (disabled)
                if ($file->mode === CustomFiles::MODE_NONE) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Skipping file {$file->filepath} (mode=none)",
                        LOG_DEBUG
                    );
                    continue;
                }

                // Apply all active modes: custom, append, override, script
                $success = CustomFilesApplier::applyCustomFile($file);

                // Reset changed flag only AFTER successful application
                // Use direct SQL UPDATE to avoid triggering afterSave() again
                if ($success) {
                    $di = \Phalcon\Di\Di::getDefault();
                    $db = $di->get('db');
                    $db->execute("UPDATE m_CustomFiles SET changed='0' WHERE id=:id", ['id' => $file->id]);

                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Successfully applied and reset changed flag for file {$file->filepath}",
                        LOG_DEBUG
                    );
                }
            }
        }
    }


    /**
     * Get the name of this action for logging
     *
     * @return string
     */
    public static function getActionName(): string
    {
        return 'ApplyCustomFiles';
    }
}