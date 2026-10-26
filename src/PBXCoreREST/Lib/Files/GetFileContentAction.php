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

namespace MikoPBX\PBXCoreREST\Lib\Files;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 *  Class GetFileContent
 * Returns file content
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class GetFileContentAction extends Injectable
{
    /**
     * Returns file content
     *
     * @param string $filename
     * @param bool   $needOriginal
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filename, bool $needOriginal = true): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        // Normalize the file path (add leading slash if missing)
        if (!str_starts_with($filename, '/')) {
            $filename = '/' . $filename;
        }

        // Resolve real path to prevent path traversal via ".." or symlinks
        $realPath = realpath($filename);
        if ($realPath === false) {
            $res->success    = false;
            $res->messages[] = 'File not found: ' . $filename;
            return $res;
        }
        $filename = $realPath;

        // Check if file exists in CustomFiles table
        $customFile = CustomFiles::findFirst([
            'conditions' => 'filepath = :path:',
            'bind' => ['path' => $filename],
        ]);

        if ($customFile !== null) {
            // File is registered in CustomFiles - verify it's in allowed directory
            if (!self::isFileInAllowedDirectory($filename)) {
                $res->success    = false;
                $res->messages[] = 'No access to the file ' . $filename;
                return $res;
            }
            $filename_orgn = "{$filename}.orgn";
            if ($needOriginal && file_exists($filename_orgn)) {
                $filename = $filename_orgn;
            }
            $res->success = true;
            $res->data['content'] = mb_convert_encoding('' . file_get_contents($filename), 'UTF-8', 'UTF-8');
        } else {
            // File is not in CustomFiles - check if it's allowed to be read.
            // SECURITY (GHSA-6pqh-9vhp-2qrc): an unregistered file must NOT be readable
            // from /etc/. CustomFiles::ALLOWED_DIRECTORIES lists /etc/ so that files
            // *registered* as CustomFiles (above) can be served, but allowing the same
            // prefix here turned this endpoint into an arbitrary local-file read
            // (/etc/passwd, /etc/inc/mikopbx-settings.json, ...). Unregistered reads are
            // confined to the data directories only.
            if (self::isFileInUnregisteredReadDirectory($filename)) {
                $res->success = true;
                $res->data['content'] = mb_convert_encoding('' . file_get_contents($filename), 'UTF-8', 'UTF-8');
            } else {
                $res->success    = false;
                $res->messages[] = 'No access to the file ' . $filename;
            }
        }

        return $res;
    }

    /**
     * Check if file path is in one of the allowed directories
     *
     * @param string $filepath
     * @return bool
     */
    private static function isFileInAllowedDirectory(string $filepath): bool
    {
        foreach (CustomFiles::ALLOWED_DIRECTORIES as $allowedDir) {
            if (str_starts_with($filepath, $allowedDir)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Directories an UNREGISTERED file (not present in CustomFiles) may be read from.
     * Deliberately excludes /etc/: configuration under /etc/ is readable only when the
     * exact path is registered as a CustomFiles record (GHSA-6pqh-9vhp-2qrc).
     */
    private const array UNREGISTERED_READ_DIRECTORIES = [
        '/storage/usbdisk1/mikopbx/',
        '/tmp/',
    ];

    /**
     * Check if an unregistered file path is in a directory allowed for direct read.
     *
     * @param string $filepath
     * @return bool
     */
    private static function isFileInUnregisteredReadDirectory(string $filepath): bool
    {
        foreach (self::UNREGISTERED_READ_DIRECTORIES as $allowedDir) {
            if (str_starts_with($filepath, $allowedDir)) {
                return true;
            }
        }
        return false;
    }
}
