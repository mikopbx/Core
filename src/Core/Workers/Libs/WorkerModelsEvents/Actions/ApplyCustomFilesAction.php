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
use MikoPBX\Core\System\Util;
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

                // Only apply MODE_CUSTOM files
                if ($file->mode !== CustomFiles::MODE_CUSTOM) {
                    continue;
                }

                $this->applyCustomFile($file);
            }
        }
    }

    /**
     * Apply a single custom file to the filesystem
     *
     * @param CustomFiles $file The custom file to apply
     * @return void
     */
    private function applyCustomFile(CustomFiles $file): void
    {
        $filepath = $file->filepath;

        if (empty($filepath)) {
            return;
        }


        // Ensure directory exists
        $dir = dirname($filepath);
        if (!is_dir($dir)) {
            Util::mwMkdir($dir, true);
        }

        // Get decoded content
        $content = $file->getContent();

        // For MODE_CUSTOM, we directly write the content to the file
        try {
            // Create backup of the original file if it exists and no backup exists yet
            $backupFile = $filepath . '.orgn';
            if (file_exists($filepath) && !file_exists($backupFile)) {
                copy($filepath, $backupFile);
            }

            // Write the file
            if (file_put_contents($filepath, $content) !== false) {
                // Check if file should be executable based on extension or path
                if ($this->shouldBeExecutable($filepath)) {
                    chmod($filepath, 0755);
                } else {
                    chmod($filepath, 0644);
                }
            } else {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Failed to write custom file: $filepath",
                    LOG_ERR
                );
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error applying custom file $filepath: " . $e->getMessage(),
                LOG_ERR
            );
        }
    }

    /**
     * Check if file should be executable based on its path or extension
     *
     * @param string $filepath The file path to check
     * @return bool True if file should be executable
     */
    private function shouldBeExecutable(string $filepath): bool
    {
        // Check if it's in a bin directory
        if (preg_match('#/s?bin/#', $filepath)) {
            return true;
        }

        // Check common script extensions
        $executableExtensions = ['sh', 'py', 'pl', 'rb', 'php', 'bash', 'zsh', 'ksh'];
        $extension = pathinfo($filepath, PATHINFO_EXTENSION);

        // Check by extension
        if ($extension && in_array(strtolower($extension), $executableExtensions)) {
            return true;
        }

        // Check for scripts in specific directories (even with extensions)
        if (preg_match('#^/etc/rc/#', $filepath) ||
            preg_match('#^/etc/init\.d/#', $filepath) ||
            preg_match('#^/usr/local/s?bin/#', $filepath)) {
            return true;
        }

        // Check for shebang scripts without extension
        $filename = basename($filepath);
        if (!str_contains($filename, '.')) {
            // Files without extension in certain directories are often scripts
            if (preg_match('#^/usr/local/#', $filepath)) {
                return true;
            }
        }

        return false;
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