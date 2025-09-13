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

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{Extensions, Sip};

class ExtensionsController extends BaseController
{
    /**
     * Build the list of internal numbers and employees.
     */
    public function indexAction(): void
    {

    }


    /**
     * Modify extension settings.
     * 
     * V5.0 Architecture: Data loading moved to JavaScript via REST API
     * Controller only provides form structure and basic context.
     *
     * @param string $id The ID of the extension being modified.
     *
     * @return void
     */
    public function modifyAction(string $id = ''): void
    {
        // Create empty form structure like IVR Menu - JavaScript will populate everything via REST API
        $emptyExtension = new \stdClass();
        $emptyExtension->id = $id ?: '';
        $emptyExtension->type = Extensions::TYPE_SIP;
        $emptyExtension->number = '';
        $emptyExtension->user_username = '';
        $emptyExtension->user_email = '';
        $emptyExtension->mobile_number = '';
        $emptyExtension->mobile_dialstring = '';
        $emptyExtension->sip_secret = '';
        $emptyExtension->sip_dtmfmode = 'auto';
        $emptyExtension->sip_networkfilterid = '';
        $emptyExtension->sip_enableRecording = true;
        $emptyExtension->sip_transport = Sip::TRANSPORT_AUTO;
        $emptyExtension->sip_manualattributes = '';
        $emptyExtension->fwd_ringlength = 45;
        $emptyExtension->fwd_forwarding = '';
        $emptyExtension->fwd_forwardingonbusy = '';
        $emptyExtension->fwd_forwardingonunavailable = '';
        
        $form = new ExtensionEditForm($emptyExtension);
        $this->view->form = $form;
        
        // All data loading moved to JavaScript via REST API - no server-side DB queries needed
        if (empty($id) || $id === 'new') {
            $this->view->represent = $this->translation->_("ex_CreateNewExtension");
        } else {
            // Generic placeholder - actual data will be loaded via JavaScript
            $this->view->represent = $this->translation->_("ex_ModifyEmployee");
        }
    }

    /**
     * Bulk upload extensions from CSV file.
     * 
     * @return void
     */
    public function bulkuploadAction(): void
    {
        // Set page title and metadata for bulk upload interface
        $this->view->represent = '<i class="file excel outline icon"></i>'.$this->translation->_("ex_BulkUploadTitle");
        $this->view->representSubHeader = $this->translation->_("ex_BulkUploadDescription");

        $this->view->urlToWiki = 'https://docs.mikopbx.com/mikopbx/manual/telefoniya/extensions#bulk-upload';
        $this->view->controllerName = 'Extensions';
        $this->view->controllerClass = 'ExtensionsController';
        $this->view->actionName = 'bulkupload';
    }
}
