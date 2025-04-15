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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Lib\Files\RestAPIFilesUtils;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;
use ZipArchive;

/**
 * Prepares a downloadable link for a log file with the provided name.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class DownloadLogFileAction extends Injectable
{
    /**
     * Prepares a downloadable link for a log file with the provided name.
     *
     * @param string $filename The name of the log file.
     * @param bool $archive Whether to archive the file before download.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function main(string $filename, bool $archive = false): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename       = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            if ($archive) {
                $tempDir = Directories::getDir(Directories::CORE_TEMP_DIR);
                $zipFilename = $tempDir . '/'. basename($filename) . '.zip';
                
                $zip = new ZipArchive();
                if ($zip->open($zipFilename, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
                    $zip->addFile($filename, basename($filename));
                    $zip->close();
                    
                    $res->data['filename'] = RestAPIFilesUtils::makeFileLinkForDownload($zipFilename, 'MikoPBXLog_');
                    $res->success = true;
                } else {
                    $res->success = false;
                    $res->messages[] = 'Unable to create ZIP archive';
                }
            } else {
                $res->data['filename'] = RestAPIFilesUtils::makeFileLinkForDownload($filename, 'MikoPBXLog_');
                $res->success = true;
            }
        }

        return $res;
    }
}