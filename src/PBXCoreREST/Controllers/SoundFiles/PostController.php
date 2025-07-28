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

namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;

/**
 * POST controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/sound-files/saveRecord \
 *   -d "name=Welcome Message&description=Main IVR greeting"
 * 
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/sound-files/uploadFile \
 *   -F "file=@welcome.wav" -F "category=custom"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates sound file record
     * @Post("/saveRecord")
     * 
     * Uploads sound file
     * @Post("/uploadFile")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        // Handle file uploads
        if ($actionName === 'uploadFile') {
            $postData = array_merge($postData, $_REQUEST);
        }
        
        $this->sendRequestToBackendWorker(
            SoundFilesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}