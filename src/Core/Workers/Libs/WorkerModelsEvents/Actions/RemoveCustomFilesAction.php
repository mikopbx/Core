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
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;

/**
 * Class RemoveCustomFilesAction
 *
 * Removes custom files from the filesystem when they are deleted from the database.
 * This action is triggered when a custom file with MODE_CUSTOM is deleted.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions
 */
class RemoveCustomFilesAction extends Injectable implements ReloadActionInterface
{

    /**
     * Execute the action to remove custom files
     *
     * @param array $parameters Array with 'filepath' and optional 'mode' parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        foreach ($parameters as $record) {

            // Check if filepath is provided
            if (empty($record['filepath'])) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'No filepath provided for removal',
                    LOG_WARNING
                );
                return;
            }

            // Only process MODE_CUSTOM files
            if (isset($record['mode']) && $record['mode'] !== 'custom') {
                return;
            }

            $this->removeCustomFile($record['filepath']);
        }
    }

    /**
     * Remove a custom file from the filesystem
     *
     * @param string $filepath The file path to remove
     * @return void
     */
    private function removeCustomFile(string $filepath): void
    {
        // Security check: ensure file is in allowed directory
        if (!CustomFiles::isPathAllowed($filepath)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                CustomFiles::getSecurityErrorMessage($filepath),
                LOG_ERR
            );
            return;
        }

        try {
            // Check if the custom file exists
            if (file_exists($filepath)) {
                // Check if there's an original backup file
                $backupFile = $filepath . '.orgn';
                if (file_exists($backupFile)) {
                    // Restore the original file
                    if (copy($backupFile, $filepath)) {
                        // Remove the backup file
                        unlink($backupFile);
                    } else {
                        // Still remove the custom file even if restore failed
                        unlink($filepath);
                    }
                } else {
                    // No backup exists, just remove the custom file
                    unlink($filepath);
                }
            } else {
                // File doesn't exist on disk, but we should still clean up any backup
                $backupFile = $filepath . '.orgn';
                if (file_exists($backupFile)) {
                    // If only backup exists, restore it as the main file
                    rename($backupFile, $filepath);
                }
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error removing custom file $filepath: " . $e->getMessage(),
                LOG_ERR
            );
        }
    }

    /**
     * Get the name of this action for logging
     *
     * @return string
     */
    public static function getActionName(): string
    {
        return 'RemoveCustomFiles';
    }
}