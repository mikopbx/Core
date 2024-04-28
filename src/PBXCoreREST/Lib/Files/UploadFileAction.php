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
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di;
use Phalcon\Http\Message\StreamFactory;
use Phalcon\Http\Message\UploadedFile;

/**
 *  Class UploadFile
 *  Process upload files by chunks.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class UploadFileAction extends \Phalcon\Di\Injectable
{
    /**
     * Process upload files by chunks.
     *
     * @param array $parameters The upload parameters.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $parameters): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di === null) {
            $res->success = false;
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $parameters['uploadDir'] = $di->getShared('config')->path('www.uploadDir');
        $parameters['tempDir'] = "{$parameters['uploadDir']}/{$parameters['resumableIdentifier']}";
        if (!Util::mwMkdir($parameters['tempDir'])) {
            $res->messages[] = 'Temp dir does not exist ' . $parameters['tempDir'];

            return $res;
        }

        $fileName = (string)pathinfo($parameters['resumableFilename'], PATHINFO_FILENAME);
        $fileName = preg_replace('/[\W]/', '', $fileName);
        if (strlen($fileName) < 10) {
            $fileName = '' . md5(microtime()) . '-' . $fileName;
        }
        $extension = (string)pathinfo($parameters['resumableFilename'], PATHINFO_EXTENSION);
        $fileName .= '.' . $extension;
        $parameters['resumableFilename'] = $fileName;
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
            if (!self::moveUploadedPartToSeparateDir($parameters, $file_data)) {
                $res->messages[] = 'Does not found any uploaded chunks on with path ' . $file_data['file_path'];
                break;
            }
            $res->success = true;
            $res->data['upload_id'] = $parameters['resumableIdentifier'];
            $res->data['filename'] = $parameters['fullUploadedFileName'];

            if (self::tryToMergeChunksIfAllPartsUploaded($parameters)) {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_MERGING;
            } else {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_WAITING_FOR_NEXT_PART;
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
}