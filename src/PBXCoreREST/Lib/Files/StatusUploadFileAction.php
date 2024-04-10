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


use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class StatusUploadFile
 *  Returns Status of uploading and merging process
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class StatusUploadFileAction extends \Phalcon\Di\Injectable
{

    /**
     * Returns Status of uploading and merging process
     *
     * @param string $upload_id
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $upload_id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di === null) {
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $uploadDir = $di->getShared('config')->path('www.uploadDir');

        $progress_dir = $uploadDir . '/' . $upload_id;
        $progress_file = $progress_dir . '/merging_progress';
        if (empty($upload_id)) {
            $res->success = false;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::STATUS_NOT_FOUND;
            $res->messages[] = 'Upload ID does not set';
        } elseif (!file_exists($progress_file) && file_exists($progress_dir)) {
            $res->success = true;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_IN_PROGRESS;
        } elseif (!file_exists($progress_dir)) {
            $res->success = false;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '0';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::STATUS_NOT_FOUND;
            $res->messages[] = 'Does not found anything with path: ' . $progress_dir;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success = true;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = '100';
            $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_COMPLETE;
        } else {
            $res->success = true;
            $res->data[FilesConstants::D_STATUS_PROGRESS] = file_get_contents($progress_file);
        }

        return $res;
    }
}