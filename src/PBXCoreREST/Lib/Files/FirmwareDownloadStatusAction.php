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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class FirmwareDownloadStatus
 * Get the progress status of the firmware file download.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class FirmwareDownloadStatusAction extends \Phalcon\Di\Injectable
{
    /**
     * Get the progress status of the firmware file download.
     *
     * @param string $imgFileName The filename of the firmware file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $imgFileName): PBXApiResult
    {
        clearstatcache();
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $firmwareDirTmp = dirname($imgFileName);
        $progress_file = $firmwareDirTmp . '/progress';

        // Wait until a download process started
        $d_pid = Processes::getPidOfProcess("{$firmwareDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }
        $error = '';
        if (file_exists("{$firmwareDirTmp}/error")) {
            $error = trim(file_get_contents("{$firmwareDirTmp}/error"));
        }

        if (!file_exists($progress_file)) {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
            $res->messages[] = FilesConstants::STATUS_NOT_FOUND;
            $res->success = false;
        } elseif ('' !== $error) {
            $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_ERROR;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = file_get_contents($progress_file);
            $res->messages[] = file_get_contents("{$firmwareDirTmp}/error");
            $res->success = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '100';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_COMPLETE;
            $res->data[FilesConstants::FILE_PATH] = $imgFileName;
            $res->success = true;
        } else {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = file_get_contents($progress_file);
            $d_pid = Processes::getPidOfProcess("{$firmwareDirTmp}/download_settings.json");
            if (empty($d_pid)) {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_ERROR;
                if (file_exists("{$firmwareDirTmp}/error")) {
                    $res->messages[] = file_get_contents("{$firmwareDirTmp}/error");
                } else {
                    $res->messages[] = "Download process interrupted at {$res->data['d_status_progress']}%";
                }
                $res->success = false;
            } else {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_IN_PROGRESS;
                $res->success = true;
            }
        }

        return $res;
    }
}