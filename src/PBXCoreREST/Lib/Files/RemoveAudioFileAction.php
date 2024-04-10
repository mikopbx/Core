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

/**
 * Class RemoveAudioFile
 * Delete file from disk by filepath
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class RemoveAudioFileAction extends \Phalcon\Di\Injectable
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
        if ( ! in_array($extension, ['mp3', 'wav', 'alaw'])) {
            $res->success    = false;
            $res->messages[] = "It is forbidden to remove the file type $extension.";

            return $res;
        }

        if ( ! file_exists($filePath)) {
            $res->success         = true;
            $res->data['message'] = "File '{$filePath}' already deleted";

            return $res;
        }

        $out = [];

        $arrDeletedFiles = [
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".wav"),
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".mp3"),
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".alaw"),
        ];

        $rmPath = Util::which('rm');
        Processes::mwExec("{$rmPath} -rf " . implode(' ', $arrDeletedFiles), $out);
        if (file_exists($filePath)) {
            $res->success  = false;
            $res->messages = $out;
        } else {
            $res->success = true;
        }

        return $res;
    }
}