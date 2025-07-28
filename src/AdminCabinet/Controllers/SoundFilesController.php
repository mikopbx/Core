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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\SoundFilesEditForm;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class SoundFilesController extends BaseController
{
    /**
     * Build sounds list
     */
    public function indexAction(): void
    {
        // Data will be loaded via JavaScript REST API calls
        // No need to load data here
    }


    /**
     * Opens and edits a record.
     *
     * @param string $id The ID of the record being edited.
     */
    public function modifyAction(string $id = ''): void
    {
        // Check if it's a category or record ID
        if (in_array($id, [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH], true)) {
            // Creating new record with specified category
            $getRecordStructure = new \stdClass();
            $getRecordStructure->id = '';
            $getRecordStructure->name = '';
            $getRecordStructure->path = '';
            $getRecordStructure->category = $id;
        } else {
            // Get data via REST API
            $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/v2/sound-files/getRecord',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                ['id' => $id]
            ]);
            
            if (!$restAnswer->success) {
                $this->flash->error(json_encode($restAnswer->messages));
                $this->dispatcher->forward([
                    'controller' => 'sound-files',
                    'action' => 'index'
                ]);
                return;
            }
            
            $getRecordStructure = (object)$restAnswer->data;
        }
        
        // Create form based on API data structure
        $this->view->form = new SoundFilesEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->name ?: '';
        $this->view->category = $getRecordStructure->category ?: SoundFiles::CATEGORY_CUSTOM;
    }


}
