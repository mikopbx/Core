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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\Common\Providers\TranslationProvider;
use Throwable;
use ZipArchive;

/**
 * Class ModuleArchiveExtractor
 *
 * Extracts a module zip package into a target directory with the hardening
 * rules shared by every install path (legacy WorkerModuleInstaller and the
 * orchestrator pipeline):
 *
 *  - Zip Slip protection: path traversal sequences, absolute paths and
 *    backslash separators are rejected before extraction;
 *  - symlink entries are rejected by their Unix external attributes
 *    (ZipArchive writes a symlink entry as a regular file, so a post-check
 *    could never catch it);
 *  - post-extraction confinement re-verifies every extracted path stays
 *    inside the target directory.
 *
 * On any failure extraction stops and the error text is returned; cleaning
 * up the half-extracted directory is the caller's responsibility (callers
 * differ: legacy removes the live dir, the pipeline removes staging).
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Pipeline
 */
class ModuleArchiveExtractor
{
    /**
     * Failure texts must never depend on a working DI container: a broken
     * translator in a detached process must not mask the extraction error.
     */
    private static function tr(string $key, array $params = []): string
    {
        try {
            return TranslationProvider::translate($key, $params);
        } catch (Throwable) {
            return $key;
        }
    }

    /**
     * Extracts the archive into the target directory.
     *
     * @param string $filePath Path to the module zip archive
     * @param string $targetDir Directory to extract into (created if missing)
     * @param callable|null $onProgress Optional callback(int $percent 0..100)
     *
     * @return string Empty string on success, error text on failure
     */
    public static function extract(string $filePath, string $targetDir, ?callable $onProgress = null): string
    {
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            return self::tr('rest_err_module_extraction_failed');
        }

        try {
            $totalFiles = $zip->numFiles;

            // An archive that opened but contains no entries is not a valid
            // module package — treat it as a failure instead of "success".
            if ($totalFiles === 0) {
                return self::tr('rest_err_module_extraction_failed');
            }

            if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
                return self::tr('rest_err_module_extraction_failed');
            }
            $realTargetDir = realpath($targetDir);
            if ($realTargetDir === false) {
                return self::tr('rest_err_module_extraction_failed');
            }

            for ($i = 0; $i < $totalFiles; $i++) {
                $entryName = $zip->getNameIndex($i);

                // Zip Slip protection (getNameIndex() returns false on a bad index)
                if (
                    $entryName === false
                    || str_contains($entryName, '..')
                    || str_starts_with($entryName, '/')
                    || str_contains($entryName, '\\')
                ) {
                    return self::tr(
                        'rest_err_module_path_traversal',
                        ['entryName' => (string)$entryName]
                    );
                }

                // Reject symlink entries BEFORE extracting: the symlink bit
                // lives in the ZIP entry's Unix external attributes
                // (high 16 bits of the mode; S_IFLNK == 0120000).
                $opsys = 0;
                $attr = 0;
                if (
                    $zip->getExternalAttributesIndex($i, $opsys, $attr)
                    && $opsys === ZipArchive::OPSYS_UNIX
                    && (($attr >> 16) & 0xF000) === 0xA000
                ) {
                    return self::tr(
                        'rest_err_module_path_escape',
                        ['entryName' => $entryName]
                    );
                }

                if (!$zip->extractTo($targetDir, [$entryName])) {
                    return self::tr('rest_err_module_extraction_failed');
                }

                // Post-extraction confinement: realpath() === false is left as
                // a pass — directory entries and freshly-created paths can
                // legitimately fail to resolve, and the pre-extraction guards
                // already cover the real traversal vectors.
                $extractedPath = realpath($targetDir . '/' . $entryName);
                if (
                    $extractedPath !== false
                    && !str_starts_with($extractedPath, $realTargetDir . '/')
                    && $extractedPath !== $realTargetDir
                ) {
                    @unlink($extractedPath);
                    return self::tr(
                        'rest_err_module_path_escape',
                        ['entryName' => $entryName]
                    );
                }

                if ($onProgress !== null) {
                    $onProgress((int)round(($i + 1) / $totalFiles * 100));
                }
            }
        } finally {
            $zip->close();
        }

        return '';
    }
}
