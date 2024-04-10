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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use Phalcon\Di;

/**
 *  Class StartDownload
 *  Starts the module download in a separate background process.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class StartDownloadAction extends \Phalcon\Di\Injectable
{
    /**
     * Starts the module download in a separate background process.
     *
     * @param string $moduleUniqueID The module unique id.
     * @param string $url The download URL of the module.
     * @param string $md5 The MD5 hash of the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID, string $url, string $md5): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getShared(ConfigProvider::SERVICE_NAME)->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }

        $moduleDirTmp = "{$tempDir}/{$moduleUniqueID}";
        Util::mwMkdir($moduleDirTmp);

        $download_settings = [
            'res_file' => "$moduleDirTmp/modulefile.zip",
            'url' => $url,
            'module' => $moduleUniqueID,
            'md5' => $md5,
            'action' => 'moduleInstall',
        ];
        if (file_exists("$moduleDirTmp/error")) {
            unlink("$moduleDirTmp/error");
        }
        if (file_exists("$moduleDirTmp/installed")) {
            unlink("$moduleDirTmp/installed");
        }
        file_put_contents("$moduleDirTmp/progress", '0');
        file_put_contents(
            "$moduleDirTmp/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);
        $phpPath = Util::which('php');
        Processes::mwExecBg("{$phpPath} -f {$workerDownloaderPath} start {$moduleDirTmp}/download_settings.json");

        $res->data['uniqid'] = $moduleUniqueID;
        $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_IN_PROGRESS;
        $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
        $res->success = true;

        return $res;
    }
}