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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Gets partially filtered log file strings.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class GetLogFromFileAction extends Injectable
{
    /**
     * Gets partially filtered log file strings.
     *
     * @param array $data An array containing the following parameters:
     *                    - filename (string): The name of the log file.
     *                    - filter (string): The filter string.
     *                    - lines (int): The number of lines to return.
     *                    - offset (int): The number of lines to skip.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $filename = (string)($data['filename'] ?? '');
        $filter = (string)($data['filter'] ?? '');
        $lines = (int)($data['lines'] ?? '');
        $offset = (int)($data['offset'] ?? '');

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages[] = 'No access to the file ' . $filename;
        } else {
            $res->success = true;
            $head = Util::which('head');
            $grep = '/bin/grep'; //can work with -text option
            if (!is_executable($grep)) {
                $grep = Util::which('grep');
            }
            $tail = Util::which('tail');
            $filter = escapeshellarg($filter);
            $linesPlusOffset = $lines + $offset;

            $cacheDir = Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR);
            if (!file_exists($cacheDir)) {
                Util::mwMkdir($cacheDir, true);
            }
            $filenameTmp = $cacheDir . '/' . __FUNCTION__ . '_' . time() . '.log';
            
            // Check if the file is an archive
            $isArchive = false;
            $fileExtension = pathinfo($filename, PATHINFO_EXTENSION);
            if (in_array($fileExtension, ['gz', 'zip', 'bz2', 'xz'])) {
                $isArchive = true;
                $decompressedFile = $cacheDir . '/' . basename($filename, '.' . $fileExtension);
                
                // Decompress based on file extension
                switch ($fileExtension) {
                    case 'gz':
                        $cmd = Util::which('gunzip') . ' -c ' . $filename . ' > ' . $decompressedFile;
                        Processes::mwExec($cmd);
                        break;
                    case 'bz2':
                        $cmd = Util::which('bunzip2') . ' -c ' . $filename . ' > ' . $decompressedFile;
                        Processes::mwExec($cmd);
                        break;
                    case 'xz':
                        $cmd = Util::which('unxz') . ' -c ' . $filename . ' > ' . $decompressedFile;
                        Processes::mwExec($cmd);
                        break;
                    case 'zip':
                        // Use ZipArchive for ZIP files
                        $zip = new \ZipArchive();
                        if ($zip->open($filename) === true) {
                            // Assuming there's only one file in the archive or we want the first one
                            if ($zip->numFiles > 0) {
                                $zipEntryContent = $zip->getFromIndex(0);
                                file_put_contents($decompressedFile, $zipEntryContent);
                            }
                            $zip->close();
                        } else {
                            $isArchive = false;
                        }
                        break;
                    default:
                        $isArchive = false;
                        break;
                }
                
                if ($isArchive && file_exists($decompressedFile)) {
                    // Use decompressed file for further operations
                    $fileToProcess = $decompressedFile;
                    $res->data['decompressed'] = true;
                } else {
                    $fileToProcess = $filename;
                }
            } else {
                $fileToProcess = $filename;
            }
            
            if (empty($filter)) {
                $cmd = "$tail -n $linesPlusOffset $fileToProcess";
            } else {
                $cmd = "$grep --text -h -e " . str_replace('&', "' -e '", $filter) . " -F $fileToProcess | $tail -n $linesPlusOffset";
            }
            if ($offset > 0) {
                $cmd .= " | $head -n $lines";
            }

            $sed = Util::which('sed');
            $cmd .= ' | ' . $sed . ' -E \'s/\\\\([tnrfvb]|040)/ /g\'';
            $cmd .= " > $filenameTmp";

            Processes::mwExec($cmd);
            $res->data['cmd'] = $cmd;
            $res->data['filename'] = $filenameTmp;
            $res->data['content'] = mb_convert_encoding('' . file_get_contents($filenameTmp), 'UTF-8', 'UTF-8');
            unlink($filenameTmp);
            
            // Clean up decompressed file if it was created
            if ($isArchive && file_exists($decompressedFile)) {
                unlink($decompressedFile);
            }
        }

        return $res;
    }
}