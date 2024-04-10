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


/**
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
abstract class FilesConstants
{
    const STATUS_NOT_FOUND = 'NOT_FOUND';
    const DOWNLOAD_ERROR = 'DOWNLOAD_ERROR';
    const DOWNLOAD_COMPLETE = 'DOWNLOAD_COMPLETE';
    const DOWNLOAD_IN_PROGRESS = 'DOWNLOAD_IN_PROGRESS';

    const UPLOAD_IN_PROGRESS = 'UPLOAD_IN_PROGRESS';
    const UPLOAD_MERGING = 'MERGING';
    const UPLOAD_WAITING_FOR_NEXT_PART = 'WAITING_FOR_NEXT_PART';
    const UPLOAD_COMPLETE = 'UPLOAD_COMPLETE';

    const D_STATUS  = 'd_status';
    const D_STATUS_PROGRESS = 'd_status_progress';
    const D_ERROR  = 'd_error';

    const FILE_PATH = 'filePath';
}