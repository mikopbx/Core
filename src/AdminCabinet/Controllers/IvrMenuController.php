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

use MikoPBX\AdminCabinet\Forms\IvrMenuEditForm;

class IvrMenuController extends BaseController
{
    /**
     * Build the list of IVR menus.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Modify IVR menu action.
     * 
     * Simplified controller - all data loading is handled by JavaScript via REST API.
     * This only provides the basic form structure.
     *
     * @param string $ivrmenuid - The ID of the IVR menu to modify.
     */
    public function modifyAction(string $ivrmenuid = ''): void
    {
     
        // Create form with minimal options - all dropdowns populated dynamically
        $form = new IvrMenuEditForm(
            null,
            [
                'extensions' => ['' => 'Select number'], // Minimal - loaded via Extensions API
                'soundfiles' => ['' => 'Select sound file'], // Minimal - loaded via SoundFiles API
            ]
        );
        
        // Pass form to JavaScript
        $this->view->form = $form;
    }


    /**
     * Saves the IVR menu
     * This action is kept for backward compatibility but the actual saving
     * is handled by the REST API through JavaScript (Form.js integration)
     */
    public function saveAction(): void
    {
        // This method is intentionally empty as all save operations
        // are handled through REST API calls from the frontend JavaScript
        // using Form.js integration with IvrMenuAPI.saveRecord()
    }

}
