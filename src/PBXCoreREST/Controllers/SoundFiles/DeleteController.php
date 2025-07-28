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
 * DELETE controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/sound-files/deleteRecord/123
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Sound file ID to delete
     * 
     * Deletes sound file record
     * @Delete("/deleteRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }
        
        $deleteData = ['id' => $id];
        
        $this->sendRequestToBackendWorker(
            SoundFilesManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}