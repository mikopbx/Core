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

use MikoPBX\AdminCabinet\Forms\{IaxProviderEditForm, SipProviderEditForm};
use MikoPBX\Common\Models\{Iax, NetworkFilters, Providers, Sip};

class ProvidersController extends BaseController
{
    /**
     * Builds the index page for providers.
     * View contains empty table structure, data loaded dynamically via REST API
     */
    public function indexAction(): void
    {
        // View will contain empty table - data loaded by JavaScript via REST API
        $this->view->providerlist = [];
    }

    /**
     * Opens the SIP provider card for editing or creating.
     * Creates form structure with empty data, actual values loaded via REST API
     *
     * @param string $uniqId Provider unique identifier (empty for new provider)
     */
    public function modifysipAction(string $uniqId = ''): void
    {
        // Create empty form - JS will populate via REST API
        $this->setupModifyView('SIP', $uniqId);
    }

    /**
     * Opens the IAX provider card for editing or creating.
     * Creates form structure with empty data, actual values loaded via REST API
     *
     * @param string $uniqId Provider unique identifier (empty for new provider)
     */
    public function modifyiaxAction(string $uniqId = ''): void
    {
        // Create empty form - JS will populate via REST API
        $this->setupModifyView('IAX', $uniqId);
    }
    
    /**
     * Common setup logic for SIP and IAX provider modification views
     * 
     * @param string $type Provider type (SIP or IAX)
     * @param string $uniqId Provider unique identifier
     */
    private function setupModifyView(string $type, string $uniqId): void
    {
        $options = ['note' => ''];
        
        if ($type === 'SIP') {
            // Create empty SIP model for form generation
            $emptyProvider = new Sip();
            $emptyProvider->uniqid = $uniqId ?: '';
            $emptyProvider->type = 'friend';
            $form = new SipProviderEditForm($emptyProvider, $options);
            
            // Empty arrays that will be filled by JavaScript
            $this->view->hostsTable = [];
            $this->view->secret = '';
        } else {
            // Create empty IAX model for form generation
            $emptyProvider = new Iax();
            $emptyProvider->uniqid = $uniqId ?: '';
            $form = new IaxProviderEditForm($emptyProvider, $options);
            
            // Get network filters for the dropdown
            $this->view->networkFilters = NetworkFilters::find();
        }
        
        $this->view->form = $form;
        $this->view->uniqid = $uniqId;
        $this->view->represent = '';
        $this->view->providerType = $type;
    }

    /**
     * Save action - deprecated, returns 404
     * All saves are now handled through REST API v2
     * @deprecated Use REST API v2 /pbxcore/api/v2/providers/saveRecord instead
     */
    public function saveAction(): void
    {
        // Return 404 - this endpoint is deprecated
        $this->response->setStatusCode(404, 'Not Found');
        $this->response->setJsonContent([
            'result' => false,
            'messages' => ['error' => ['This endpoint is deprecated. Use REST API v2 instead']]
        ]);
        $this->response->send();
        $this->view->disable();
    }

    /**
     * Enable action - handled by REST API
     * @deprecated Use REST API instead
     */
    public function enableAction(string $type, string $uniqid = ''): void
    {
        $this->view->success = false;
        $this->view->disable();
        echo json_encode(['result' => false, 'message' => 'Use REST API']);
    }

    /**
     * Disable action - handled by REST API
     * @deprecated Use REST API instead
     */
    public function disableAction(string $type, string $uniqid = ''): void
    {
        $this->view->success = false;
        $this->view->disable();
        echo json_encode(['result' => false, 'message' => 'Use REST API']);
    }

    /**
     * Delete action - handled by REST API
     * @deprecated Use REST API instead
     */
    public function deleteAction(string $uniqid = ''): void
    {
        $this->forward('providers/index');
    }
}