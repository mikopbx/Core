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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\CustomFiles;
use Phalcon\Di\Injectable;

/**
 * CustomFilesApplier - applies user-created custom files to the filesystem
 *
 * This class handles the application of custom files that were manually created
 * by users (not system-managed files created by Util::fileWriteContent).
 */
class CustomFilesApplier extends Injectable
{
    /**
     * Apply all user-created custom files to the filesystem
     * This is typically called during system initialization
     *
     * @return void
     */
    public static function applyUserCreatedFiles(): void
    {
        // Find all user-created custom files (MODE_CUSTOM)
        // Apply all CUSTOM mode files on boot, regardless of changed flag
        $userFiles = CustomFiles::find([
            'conditions' => 'mode = :mode:',
            'bind' => [
                'mode' => CustomFiles::MODE_CUSTOM
            ]
        ]);

        if (!$userFiles || $userFiles->count() === 0) {
            return;
        }

        foreach ($userFiles as $file) {
            self::applyCustomFile($file);
        }
    }

    /**
     * Apply a single custom file to the filesystem
     *
     * @param CustomFiles $file The custom file to apply
     * @return bool True if successful, false otherwise
     */
    public static function applyCustomFile(CustomFiles $file): bool
    {
        $filepath = $file->filepath;

        if (empty($filepath)) {
            return false;
        }

        // Ensure directory exists
        $dir = dirname($filepath);
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Failed to create directory for custom file: $dir",
                    LOG_ERR
                );
                return false;
            }
        }

        $content = $file->getContent(); // Decodes from base64
        $filepathOrgn = "$filepath.orgn";

        try {
            switch ($file->mode) {
                case CustomFiles::MODE_NONE:
                    // Just write the file without backup
                    if (file_exists($filepathOrgn)) {
                        unlink($filepathOrgn);
                    }
                    file_put_contents($filepath, $content);
                    break;

                case CustomFiles::MODE_APPEND:
                    // Save original if it exists
                    if (file_exists($filepath) && !file_exists($filepathOrgn)) {
                        copy($filepath, $filepathOrgn);
                    }

                    // Append content to existing file
                    if (file_exists($filepathOrgn)) {
                        $originalContent = file_get_contents($filepathOrgn);
                        $finalContent = $originalContent . "\n\n" . $content;
                        file_put_contents($filepath, $finalContent);
                    } else {
                        file_put_contents($filepath, $content);
                    }
                    break;

                case CustomFiles::MODE_OVERRIDE:
                case CustomFiles::MODE_CUSTOM:
                    // Save original if it exists
                    if (file_exists($filepath) && !file_exists($filepathOrgn)) {
                        copy($filepath, $filepathOrgn);
                    }

                    // Override with new content
                    file_put_contents($filepath, $content);
                    break;

                case CustomFiles::MODE_SCRIPT:
                    // Save original if it exists
                    if (file_exists($filepath) && !file_exists($filepathOrgn)) {
                        copy($filepath, $filepathOrgn);
                    }

                    // Execute the content as a shell script against the file
                    $tempScriptFile = tempnam(sys_get_temp_dir(), 'custom_script_');
                    file_put_contents($tempScriptFile, $content);
                    chmod($tempScriptFile, 0755);

                    $command = "/bin/sh $tempScriptFile $filepath";
                    Processes::mwExec($command);

                    unlink($tempScriptFile);
                    break;

                default:
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Unknown mode for custom file: {$file->mode}",
                        LOG_WARNING
                    );
                    return false;
            }

            // Check if file should be executable based on extension or path
            if (self::shouldBeExecutable($filepath)) {
                chmod($filepath, 0755);
            }

            // Don't reset changed flag on boot - it's only for tracking runtime changes
            // The changed flag is managed by ApplyCustomFilesAction for runtime changes

            return true;

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to apply custom file $filepath: " . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }
    }

    /**
     * Check if file should be executable based on its path or extension
     *
     * @param string $filepath The file path to check
     * @return bool True if file should be executable
     */
    private static function shouldBeExecutable(string $filepath): bool
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
     * Initialize user-created custom files on system boot
     * This should be called early in the boot process
     *
     * @return void
     */
    public static function initializeOnBoot(): void
    {
        self::applyUserCreatedFiles();
    }
}