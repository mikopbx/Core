<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Class RemoveAudioFile
 * Delete file from disk by filepath
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class RemoveAudioFileAction extends Injectable
{
    /**
     * Delete file from disk by filepath
     *
     * @param string $filePath
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $extension      = Util::getExtensionOfFile($filePath);

        // Whitelist must mirror everything SoundFilesConf::convertAudioFile() can produce
        // (and SoundFiles::afterDelete() cleans up), otherwise replacing an existing sound
        // through the edit flow rejects the cleanup of the previous physical file by
        // extension and leaks it on disk together with all its siblings.
        $allowedExtensions = ['mp3', 'wav', 'wav16', 'wav48', 'ulaw', 'alaw', 'gsm', 'g722', 'sln', 'opus', 'webm'];
        if (! in_array($extension, $allowedExtensions, true)) {
            $res->success    = false;
            $res->messages[] = "It is forbidden to remove the file type $extension.";

            return $res;
        }

        if (! file_exists($filePath)) {
            $res->success         = true;
            $res->data['message'] = "File '$filePath' already deleted";

            return $res;
        }

        $out = [];

        // Sibling list = same whitelist; the converter writes one file per extension under
        // the shared basename, so cleanup must hit them all to avoid leftover ulaw/gsm/etc.
        $basePath = Util::trimExtensionForFile($filePath);
        $arrDeletedFiles = array_map(
            static fn(string $ext): string => escapeshellarg($basePath . '.' . $ext),
            $allowedExtensions
        );

        $rm = Util::which('rm');
        Processes::mwExec("$rm -rf " . implode(' ', $arrDeletedFiles), $out);
        if (file_exists($filePath)) {
            $res->success  = false;
            $res->messages = $out;
        } else {
            $res->success = true;
        }

        return $res;
    }
}
