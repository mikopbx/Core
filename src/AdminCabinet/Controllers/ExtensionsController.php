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
use MikoPBX\Common\Models\PbxSettings;

class ExtensionsController extends BaseController
{
    private const string WSS_PATH = '/asterisk/ws';


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
        $this->view->form = new ExtensionEditForm();

        // All data loading moved to JavaScript via REST API - no server-side DB queries needed
        if (empty($id) || $id === 'new') {
            $this->view->represent = $this->translation->_("ex_CreateNewExtension");
        } else {
            // Generic placeholder - actual data will be loaded via JavaScript
            $this->view->represent = $this->translation->_("ex_ModifyEmployee");
        }

        $settings   = PbxSettings::getAllPbxSettings();
        $sipPort    = (int) ($settings[PbxSettings::SIP_PORT] ?? 0);
        $tlsPort    = (int) ($settings[PbxSettings::TLS_PORT] ?? 0);
        $extSipPort = (int) ($settings[PbxSettings::EXTERNAL_SIP_PORT] ?? 0);
        $extTlsPort = (int) ($settings[PbxSettings::EXTERNAL_TLS_PORT] ?? 0);

        $this->view->sipConnectionParams = [
            'sipPort'    => $sipPort,
            'tlsPort'    => $tlsPort,
            'extSipPort' => $extSipPort > 0 ? $extSipPort : $sipPort,
            'extTlsPort' => $extTlsPort > 0 ? $extTlsPort : $tlsPort,
            'hasExtSip'  => $extSipPort > 0 && $extSipPort !== $sipPort,
            'hasExtTls'  => $extTlsPort > 0 && $extTlsPort !== $tlsPort,
            'wssPort'    => (int) ($settings[PbxSettings::AJAM_PORT_TLS] ?? 0),
            'wssPath'    => self::WSS_PATH,
            'authPrefix' => (string) ($settings[PbxSettings::SIP_AUTH_PREFIX] ?? ''),
        ];
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
