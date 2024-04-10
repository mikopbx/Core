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
use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use Phalcon\Di;

/**
 *  Class DownloadNewFirmware
 *  Downloads new firmware from repository.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class DownloadNewFirmwareAction extends \Phalcon\Di\Injectable
{
    /**
     * Downloads the firmware file from the provided URL.
     *
     * @param array $data The data array containing the following parameters:
     *   - Md5: The MD5 hash of the file.
     *   - size: The size of the file.
     *   - version: The version of the file.
     *   - Url: The download URL of the file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $di = Di::getDefault();
        if ($di !== null) {
            $uploadDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $uploadDir = '/tmp';
        }
        $firmwareDirTmp = "{$uploadDir}/{$data['version']}";

        if (file_exists($firmwareDirTmp)) {
            $rmPath = Util::which('rm');
            Processes::mwExec("{$rmPath} -rf {$firmwareDirTmp}/* ");
        } else {
            Util::mwMkdir($firmwareDirTmp);
        }

        $download_settings = [
            'res_file' => "{$firmwareDirTmp}/update.img",
            'url'      => $data['url'],
            'size'     => $data['size'],
            'md5'      => $data['md5'],
        ];

        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);
        file_put_contents(
            "{$firmwareDirTmp}/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $phpPath = Util::which('php');
        Processes::mwExecBg("{$phpPath} -f {$workerDownloaderPath} start {$firmwareDirTmp}/download_settings.json");

        $res                   = new PBXApiResult();
        $res->processor        = __METHOD__;
        $res->success          = true;
        $res->data['filename'] = $download_settings['res_file'];
        $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_IN_PROGRESS;

        return $res;
    }
}