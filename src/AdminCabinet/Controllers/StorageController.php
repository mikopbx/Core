<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Forms\StorageEditForm;
use MikoPBX\Common\Models\PbxSettings;

/**
 * StorageController
 *
 * Manages storage information and settings
 */
class StorageController extends BaseController
{
    /**
     * Display storage information and settings
     */
    public function indexAction(): void
    {
        // Get current storage settings
        $recordSavePeriod = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
        
        // Create form with current settings
        $options = [
            PbxSettings::PBX_RECORD_SAVE_PERIOD => $recordSavePeriod,
        ];
        
        $this->view->form = new StorageEditForm(null, $options);
        $this->view->submitMode = null;
    }
    
    /**
     * Save storage settings
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            $this->forward('storage/index');
            return;
        }

        $data = $this->request->getPost();
        $result = true;
        
        // Save record retention period
        if (isset($data[PbxSettings::PBX_RECORD_SAVE_PERIOD])) {
            $recordSavePeriod = PbxSettings::findFirstByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
            if ($recordSavePeriod !== null) {
                $recordSavePeriod->value = $data[PbxSettings::PBX_RECORD_SAVE_PERIOD];
                $result = $recordSavePeriod->save();
                
                if (!$result) {
                    $errors = $recordSavePeriod->getMessages();
                    $this->flash->error(implode('<br>', $errors));
                }
            }
        }

        // Handle response
        if ($this->request->isAjax()) {
            $this->view->success = $result;
            $this->view->reload = 'storage/index#/storage-settings';
        } else {
            if ($result) {
                $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            }
            $this->forward('storage/index#/storage-settings');
        }
    }
}