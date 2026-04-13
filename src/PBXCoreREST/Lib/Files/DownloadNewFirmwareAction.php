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
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class DownloadNewFirmware
 *  Downloads new firmware from repository.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class DownloadNewFirmwareAction extends Injectable
{
    /**
     * Downloads the firmware file from the provided URL.
     *
     * @param array $data The data array containing the following parameters:
     *   - url: The download URL of the file (required).
     *   - md5: The MD5 hash of the file (required, used for integrity verification).
     *   - version: The version of the file (optional, used as directory name).
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $url = is_string($data['url'] ?? null) ? trim($data['url']) : '';
        $md5 = is_string($data['md5'] ?? null) ? trim($data['md5']) : '';

        if ($url === '') {
            $res->success = false;
            $res->messages['error'][] = 'Download URL is required';
            $res->httpCode = 400;
            return $res;
        }
        if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url)) {
            $res->success = false;
            $res->messages['error'][] = 'Download URL must be a valid http(s) URL';
            $res->httpCode = 400;
            return $res;
        }
        if ($md5 === '' || !preg_match('/^[a-f0-9]{32}$/i', $md5)) {
            $res->success = false;
            $res->messages['error'][] = 'A valid MD5 hash (32 hex characters) is required';
            $res->httpCode = 400;
            return $res;
        }
        // Normalize to lowercase: WorkerDownloader compares against md5_file() which returns lowercase.
        $md5 = strtolower($md5);

        $di = Di::getDefault();
        if ($di !== null) {
            $uploadDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $uploadDir = '/tmp';
        }
        $version = $data['version'] ?? $md5;
        // Security: sanitize version to prevent shell injection via directory path
        $version = preg_replace('/[^a-zA-Z0-9._\-]/', '', (string)$version);
        if ($version === '') {
            $version = (string)time();
        }
        $firmwareDirTmp = "$uploadDir/{$version}";

        if (file_exists($firmwareDirTmp)) {
            $rm = Util::which('rm');
            Processes::mwExec("$rm -rf " . escapeshellarg($firmwareDirTmp) . "/* ");
        } else {
            Util::mwMkdir($firmwareDirTmp);
        }

        $download_settings = [
            'res_file' => "$firmwareDirTmp/update.img",
            'url'      => $url,
            'md5'      => $md5,
        ];

        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);
        file_put_contents(
            "$firmwareDirTmp/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $php = Util::which('php');
        Processes::mwExecBg("$php -f $workerDownloaderPath start " . escapeshellarg("$firmwareDirTmp/download_settings.json"));

        $res->success          = true;
        $res->data['filename'] = $download_settings['res_file'];
        $res->data[FilesConstants::D_STATUS] = FilesConstants::DOWNLOAD_IN_PROGRESS;

        return $res;
    }
}
