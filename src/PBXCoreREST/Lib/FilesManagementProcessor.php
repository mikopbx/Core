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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use Phalcon\Http\Message\StreamFactory;
use Phalcon\Http\Message\UploadedFile;


/**
 * Class FilesManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class FilesManagementProcessor extends Injectable
{

    /**
     * Processes file upload requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action   = $request['action'];
        $postData = $request['data'];
        switch ($action) {
            case 'uploadFile':
                $res = self::uploadFile($postData);
                break;
            case 'statusUploadFile':
                $res = self::statusUploadFile($request['data']);
                break;
            case 'removeAudioFile':
                $res = self::removeAudioFile($postData['filename']);
                break;
            case 'getFileContent':
                $res = self::getFileContent($postData['filename'], $postData['needOriginal']==='true');
                break;
            case 'downloadNewFirmware':
                $res = self::downloadNewFirmware($request['data']);
                break;
            case 'firmwareDownloadStatus':
                $res = self::firmwareDownloadStatus($postData['filename']);
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in uploadCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Process upload files by chunks.
     *
     * @param array $parameters The upload parameters.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function uploadFile(array $parameters): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $parameters['uploadDir'] = $di->getShared('config')->path('www.uploadDir');
        $parameters['tempDir']   = "{$parameters['uploadDir']}/{$parameters['resumableIdentifier']}";
        if ( ! Util::mwMkdir($parameters['tempDir'])) {
            $res->messages[] = 'Temp dir does not exist ' . $parameters['tempDir'];

            return $res;
        }

        $fileName = (string)pathinfo($parameters['resumableFilename'], PATHINFO_FILENAME);
        $fileName = preg_replace('/[\W]/', '', $fileName);
        if (strlen($fileName) < 10) {
            $fileName = '' . md5(time()) . '-' . $fileName;
        }
        $extension                          = (string)pathinfo($parameters['resumableFilename'], PATHINFO_EXTENSION);
        $fileName                           .= '.' . $extension;
        $parameters['resumableFilename']    = $fileName;
        $parameters['fullUploadedFileName'] = "{$parameters['tempDir']}/{$fileName}";

        // Delete old progress and result file
        $oldMergeProgressFile = "{$parameters['tempDir']}/merging_progress";
        if (file_exists($oldMergeProgressFile)) {
            unlink($oldMergeProgressFile);
        }
        if (file_exists($parameters['fullUploadedFileName'])) {
            unlink($parameters['fullUploadedFileName']);
        }

        foreach ($parameters['files'] as $file_data) {
            if ( ! self::moveUploadedPartToSeparateDir($parameters, $file_data)) {
                $res->messages[] = 'Does not found any uploaded chunks on with path ' . $file_data['file_path'];
                break;
            }
            $res->success           = true;
            $res->data['upload_id'] = $parameters['resumableIdentifier'];
            $res->data['filename']  = $parameters['fullUploadedFileName'];

            if (self::tryToMergeChunksIfAllPartsUploaded($parameters)) {
                $res->data['d_status'] = 'MERGING';
            } else {
                $res->data['d_status'] = 'WAITING_FOR_NEXT_PART';
            }
        }

        return $res;
    }

    /**
     * Moves uploaded file part to separate directory with "upload_id" name on the system uploadDir folder.
     *
     * @param array $parameters data from of resumable request
     * @param array $file_data  data from uploaded file part
     *
     * @return bool
     */
    private static function moveUploadedPartToSeparateDir(array $parameters, array $file_data): bool
    {
        if ( ! file_exists($file_data['file_path'])) {
            return false;
        }
        $factory          = new StreamFactory();
        $stream           = $factory->createStreamFromFile($file_data['file_path'], 'r');
        $file             = new UploadedFile(
            $stream,
            $file_data['file_size'],
            $file_data['file_error'],
            $file_data['file_name'],
            $file_data['file_type']
        );
        $chunks_dest_file = "{$parameters['tempDir']}/{$parameters['resumableFilename']}.part{$parameters['resumableChunkNumber']}";
        if (file_exists($chunks_dest_file)) {
            $rm = Util::which('rm');
            Processes::mwExec("{$rm} -f {$chunks_dest_file}");
        }
        $file->moveTo($chunks_dest_file);

        return true;
    }

    /**
     * If the size of all the chunks on the server is equal to the size of the file uploaded starts a merge process.
     *
     * @param array $parameters
     *
     * @return bool
     */
    private static function tryToMergeChunksIfAllPartsUploaded(array $parameters): bool
    {
        $totalFilesOnServerSize = 0;
        foreach (scandir($parameters['tempDir']) as $file) {
            $totalFilesOnServerSize += filesize($parameters['tempDir'] . '/' . $file);
        }

        if ($totalFilesOnServerSize >= $parameters['resumableTotalSize']) {
            // Parts upload complete
            $merge_settings = [
                'fullUploadedFileName' => $parameters['fullUploadedFileName'],
                'tempDir'              => $parameters['tempDir'],
                'resumableFilename'    => $parameters['resumableFilename'],
                'resumableTotalSize'   => $parameters['resumableTotalSize'],
                'resumableTotalChunks' => $parameters['resumableTotalChunks'],
            ];
            $settings_file  = "{$parameters['tempDir']}/merge_settings";
            file_put_contents(
                $settings_file,
                json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
            );

            // We will start the background process to merge parts into one file
            $phpPath               = Util::which('php');
            $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
            Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");

            return true;
        }

        return false;
    }

    /**
     * Returns Status of uploading and merging process
     *
     * @param array $postData
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function statusUploadFile(array $postData): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $uploadDir = $di->getShared('config')->path('www.uploadDir');

        $upload_id     = $postData['id'] ?? null;
        $progress_dir  = $uploadDir . '/' . $upload_id;
        $progress_file = $progress_dir . '/merging_progress';
        if (empty($upload_id)) {
            $res->success                   = false;
            $res->data['d_status_progress'] = '0';
            $res->data['d_status']          = 'ID_NOT_SET';
            $res->messages[]                = 'Upload ID does not set';
        } elseif ( ! file_exists($progress_file) && file_exists($progress_dir)) {
            $res->success                   = true;
            $res->data['d_status_progress'] = '0';
            $res->data['d_status']          = 'INPROGRESS';
        } elseif ( ! file_exists($progress_dir)) {
            $res->success                   = false;
            $res->data['d_status_progress'] = '0';
            $res->data['d_status']          = 'NOT_FOUND';
            $res->messages[]                = 'Does not found anything with path: ' . $progress_dir;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success                   = true;
            $res->data['d_status_progress'] = '100';
            $res->data['d_status']          = 'UPLOAD_COMPLETE';
        } else {
            $res->success                   = true;
            $res->data['d_status_progress'] = file_get_contents($progress_file);
        }


        return $res;
    }

    /**
     * Delete file from disk by filepath
     *
     * @param string $filePath
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function removeAudioFile(string $filePath): PBXApiResult
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

    /**
     * Returns file content
     *
     * @param string $filename
     * @param bool   $needOriginal
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getFileContent(string $filename, bool $needOriginal = true): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $customFile     = CustomFiles::findFirst("filepath = '{$filename}'");
        if ($customFile !== null) {
            $filename_orgn = "{$filename}.orgn";
            if ($needOriginal && file_exists($filename_orgn)) {
                $filename = $filename_orgn;
            }
            $res->success = true;
            $cat          = Util::which('cat');
            $di           = Di::getDefault();
            $dirsConfig   = $di->getShared('config');
            $filenameTmp  = $dirsConfig->path('www.downloadCacheDir') . '/' . __FUNCTION__ . '_' .time(). '.conf';
            $cmd          = "{$cat} {$filename} > {$filenameTmp}";
            Processes::mwExec("{$cmd}; chown www:www {$filenameTmp}");
            $res->data['filename'] = $filenameTmp;
        } else {
            $res->success    = false;
            $res->messages[] = 'No access to the file ' . $filename;
        }

        return $res;
    }

    /**
     * Downloads the firmware file from the provided URL.
     *
     * @param array $data The data array containing the following parameters:
     *   - md5: The MD5 hash of the file.
     *   - size: The size of the file.
     *   - version: The version of the file.
     *   - url: The download URL of the file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function downloadNewFirmware(array $data): PBXApiResult
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
        $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';

        return $res;
    }

    /**
     * Get the progress status of the firmware file download.
     *
     * @param string $imgFileName The filename of the firmware file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function firmwareDownloadStatus(string $imgFileName): PBXApiResult
    {
        clearstatcache();
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success   = true;

        $firmwareDirTmp = dirname($imgFileName);
        $progress_file  = $firmwareDirTmp . '/progress';

        // Wait until download process started
        $d_pid = Processes::getPidOfProcess("{$firmwareDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }
        $error = '';
        if (file_exists("{$firmwareDirTmp}/error")) {
            $error = trim(file_get_contents("{$firmwareDirTmp}/error"));
        }

        if ( ! file_exists($progress_file)) {
            $res->data['d_status_progress'] = '0';
            $res->messages[]                = 'NOT_FOUND';
            $res->success                   = false;
        } elseif ('' !== $error) {
            $res->data['d_status']          = 'DOWNLOAD_ERROR';
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $res->messages[]                = file_get_contents("{$firmwareDirTmp}/error");
            $res->success                   = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data['d_status_progress'] = '100';
            $res->data['d_status']          = 'DOWNLOAD_COMPLETE';
            $res->data['filePath']          = $imgFileName;
            $res->success                   = true;
        } else {
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $d_pid                          = Processes::getPidOfProcess("{$firmwareDirTmp}/download_settings.json");
            if (empty($d_pid)) {
                $res->data['d_status'] = 'DOWNLOAD_ERROR';
                if (file_exists("{$firmwareDirTmp}/error")) {
                    $res->messages[] = file_get_contents("{$firmwareDirTmp}/error");
                } else {
                    $res->messages[] = "Download process interrupted at {$res->data['d_status_progress']}%";
                }
                $res->success = false;
            } else {
                $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
                $res->success          = true;
            }
        }

        return $res;
    }

}