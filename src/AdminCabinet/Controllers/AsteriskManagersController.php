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

use MikoPBX\AdminCabinet\Forms\AsteriskManagerEditForm;
use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;

/**
 * Asterisk Managers Controller
 * 
 * Handles the web interface for managing Asterisk Manager Interface (AMI) users.
 * Uses REST API v2 for all data operations.
 */
class AsteriskManagersController extends BaseController
{
    private array $arrCheckBoxes;

    /**
     * Base class initialization
     */
    public function initialize(): void
    {
        $this->arrCheckBoxes = [
            'call',
            'cdr',
            'originate',
            'reporting',
            'agent',
            'config',
            'dialplan',
            'dtmf',
            'log',
            'system',
            'user',
            'verbose',
            'command'
        ];
        parent::initialize();
    }

    /**
     * Generates Asterisk Managers index page
     * Data is loaded via REST API from JavaScript
     */
    public function indexAction(): void
    {
        // Empty arrays - data will be loaded via REST API
        $this->view->setVar('networkFilters', []);
        $this->view->setVar('amiUsers', []);
    }

    /**
     * Shows the edit form for an Asterisk manager.
     * Creates empty form structure, data is loaded via REST API.
     *
     * @param string $id AsteriskManagerUsers record ID
     */
    public function modifyAction(string $id = ''): void
    {
        // V5.0 Architecture: Create empty form, data loaded via REST API
        $emptyManager = new AsteriskManagerUsers();
        $form = new AsteriskManagerEditForm($emptyManager);
        
        $this->view->form = $form;
        $this->view->managerId = $id;
        $this->view->represent = '';
        $this->view->arrCheckBoxes = $this->arrCheckBoxes;
    }

    /**
     * Save action - handled by REST API
     * @deprecated Use REST API v2 instead
     */
    public function saveAction(): void
    {
        // Redirect to index - actual save is handled by REST API
        $this->forward('asterisk-managers/index');
    }

    /**
     * Delete action - handled by REST API
     * @deprecated Use REST API v2 instead
     * 
     * @param string $amiId Manager ID to delete
     */
    public function deleteAction(string $amiId = ''): void
    {
        // Redirect to index - actual delete is handled by REST API
        $this->forward('asterisk-managers/index');
    }

    /**
     * Check username availability - handled by REST API
     * @deprecated Use REST API v2 instead
     *
     * @param string $username Username to check
     */
    public function availableAction(string $username): void
    {
        // This is now handled by REST API
        // Keep for backward compatibility but return empty result
        $this->view->setVar('nameAvailable', true);
        $this->view->setVar('success', true);
    }
}
