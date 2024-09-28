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
    public const string STATUS_NOT_FOUND = 'NOT_FOUND';
    public const string DOWNLOAD_ERROR = 'DOWNLOAD_ERROR';
    public const string DOWNLOAD_COMPLETE = 'DOWNLOAD_COMPLETE';
    public const string DOWNLOAD_IN_PROGRESS = 'DOWNLOAD_IN_PROGRESS';

    public const string UPLOAD_IN_PROGRESS = 'UPLOAD_IN_PROGRESS';
    public const string UPLOAD_MERGING = 'MERGING';
    public const string UPLOAD_WAITING_FOR_NEXT_PART = 'WAITING_FOR_NEXT_PART';
    public const string UPLOAD_COMPLETE = 'UPLOAD_COMPLETE';

    public const string D_STATUS  = 'd_status';
    public const string D_STATUS_PROGRESS = 'd_status_progress';
    public const string D_ERROR  = 'd_error';

    public const string FILE_PATH = 'filePath';
}