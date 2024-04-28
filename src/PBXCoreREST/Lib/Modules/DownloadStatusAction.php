<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class DownloadStatus
 *  Returns the download status of a module.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class DownloadStatusAction extends \Phalcon\Di\Injectable
{

    /**
     * Returns the download status of a module.
     *
     * @param string $moduleUniqueID The unique ID of the module.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID): PBXApiResult
    {
        clearstatcache();
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getShared(ConfigProvider::SERVICE_NAME)->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }
        $moduleDirTmp = $tempDir . '/' . $moduleUniqueID;
        $progress_file = $moduleDirTmp . '/progress';
        $error = '';
        if (file_exists($moduleDirTmp . '/error')) {
            $error = trim(file_get_contents($moduleDirTmp . '/error'));
        }

        // Wait until a download process started
        $d_pid = Processes::getPidOfProcess("{$moduleDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }

        if (!file_exists($progress_file)) {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::STATUS_NOT_FOUND;
            $res->success = false;
        } elseif ('' !== $error) {
            $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_ERROR;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = file_get_contents($progress_file);
            $res->data[FilesConstants::D_ERROR] = $error;
            $res->messages[] = file_get_contents($moduleDirTmp . '/error');
            $res->success = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '100';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_COMPLETE;
            $res->data[FilesConstants::FILE_PATH] = "$moduleDirTmp/modulefile.zip";
            $res->success = true;
        } else {
            $res->data[FilesConstants::D_STATUS_PROGRESS] = file_get_contents($progress_file);
            $d_pid = Processes::getPidOfProcess($moduleDirTmp . '/download_settings.json');
            if (empty($d_pid)) {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_ERROR;
                if (file_exists($moduleDirTmp . '/error')) {
                    $res->messages[] = file_get_contents($moduleDirTmp . '/error');
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