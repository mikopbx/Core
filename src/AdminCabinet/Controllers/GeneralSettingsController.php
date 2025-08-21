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

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use MikoPBX\Common\Models\PbxSettings;

/**
 * Class GeneralSettingsController
 *
 * This class handles general settings for the application.
 */
class GeneralSettingsController extends BaseController
{
    /**
     * Builds the general settings form.
     *
     * This action is responsible for preparing the data required to populate the general settings form.
     * It retrieves the audio and video codecs from the database, sorts them by priority, and assigns them to the view.
     * It also retrieves all PBX settings and creates an instance of the GeneralSettingsEditForm.
     *
     * @return void
     */
    public function modifyAction(): void
    {

        // Fetch all PBX settings
        // $pbxSettings = PbxSettings::getAllPbxSettings(false);
        // Use default values only to prevent form errors, but empty values for actual data
        $pbxSettings = PbxSettings::getDefaultArrayValues();
        // Clear actual values to test REST API loading
        foreach ($pbxSettings as $key => &$value) {
            // Keep the key structure but clear values except for hidden fields
            if (!in_array($key, ['***ALL HIDDEN ABOVE***', '***ALL NUMBERIC ABOVE***', 
                                  '***ALL TEXTAREA ABOVE***', '***ALL CHECK BOXES ABOVE***'])) {
                $value = '';
            }
        }

        // Initialize empty array for simple passwords - will be checked asynchronously
        $this->view->simplePasswords = [];
        
        // Check if WEBHTTPSPrivateKey exists (without exposing the actual value)
        $privateKey = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PRIVATE_KEY);
        $this->view->WEBHTTPSPrivateKeyExists = !empty($privateKey);

        // Create an instance of the GeneralSettingsEditForm and assign it to the view
        // Pass default structure with empty values
        $this->view->form = new GeneralSettingsEditForm(null, $pbxSettings);
        $this->view->submitMode = null;
    }
}
