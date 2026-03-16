<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Core\System\{Directories, Upgrade\UpgradeSystemConfigInterface};
use Phalcon\Di\Injectable;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Class UpdateConfigsUpToVer2026184
 *
 * Resets failed WAV-to-WebM conversion tasks so they are retried after ffmpeg update.
 *
 * Prior firmware versions shipped a broken ffmpeg build (missing codecs or crashes),
 * causing all conversion tasks to exhaust their retry limit and be renamed to .failed.json.
 * After the ffmpeg fix in this release, those tasks need to be reset so the worker
 * picks them up again.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026184 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.84';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->resetFailedConversionTasks();
    }

    /**
     * Reset all failed WAV-to-WebM conversion tasks for re-processing
     *
     * Scans the conversion-tasks directory for .failed.json files,
     * resets their attempt counters and renames them back to .json
     * so WorkerWav2Webm will pick them up on its next iteration.
     *
     * @return void
     */
    private function resetFailedConversionTasks(): void
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $tasksDir = $monitorDir . '/conversion-tasks';

        if (!is_dir($tasksDir)) {
            return;
        }

        $failedFiles = $this->findFailedTaskFiles($tasksDir);

        if (empty($failedFiles)) {
            echo "No failed conversion tasks found, skipping\n";
            return;
        }

        $resetCount = 0;
        $errorCount = 0;

        foreach ($failedFiles as $failedFile) {
            if ($this->resetTaskFile($failedFile)) {
                $resetCount++;
            } else {
                $errorCount++;
            }
        }

        echo "Reset {$resetCount} failed conversion tasks for re-processing";
        if ($errorCount > 0) {
            echo " ({$errorCount} errors)";
        }
        echo "\n";
    }

    /**
     * Find all .failed.json task files in the conversion-tasks directory
     *
     * @param string $directory Directory to scan
     * @return array<int, string> Array of file paths
     */
    private function findFailedTaskFiles(string $directory): array
    {
        $failedFiles = [];

        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($iterator as $file) {
                if ($file->isFile() && str_ends_with($file->getFilename(), '.failed.json')) {
                    $failedFiles[] = $file->getPathname();
                }
            }
        } catch (\Throwable) {
            // Directory not accessible — nothing to reset
        }

        return $failedFiles;
    }

    /**
     * Reset a single failed task file: clear attempts and rename back to .json
     *
     * @param string $failedFile Path to .failed.json file
     * @return bool True on success
     */
    private function resetTaskFile(string $failedFile): bool
    {
        $contents = @file_get_contents($failedFile);
        if ($contents === false) {
            return false;
        }

        try {
            $taskData = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            // Corrupted JSON — delete the broken task file
            @unlink($failedFile);
            return false;
        }

        if (!is_array($taskData)) {
            @unlink($failedFile);
            return false;
        }

        // Reset retry state
        $taskData['attempts'] = 0;
        $taskData['last_attempt_at'] = 0;
        $taskData['last_error_code'] = 0;

        // Build new filename: .failed.json -> .json
        $newFile = preg_replace('/\.failed\.json$/', '.json', $failedFile);
        if ($newFile === null || $newFile === $failedFile) {
            return false;
        }

        // Write updated task data to new filename
        $jsonData = json_encode($taskData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($jsonData === false) {
            return false;
        }

        if (file_put_contents($newFile, $jsonData) === false) {
            return false;
        }

        // Remove the old .failed.json file
        @unlink($failedFile);

        return true;
    }
}
