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
     * Modifies Asterisk Managers
     *
     * @param string $id AsteriskManagerUsers record ID
     */
    public function modifyAction(string $id = ''): void
    {
        // Load manager record if editing, create new if creating
        if (!empty($id)) {
            $manager = AsteriskManagerUsers::findFirstById($id);
            if (!$manager) {
                $this->forward('asterisk-managers/index');
                return;
            }
            $represent = $manager->getRepresent();
        } else {
            $manager = new AsteriskManagerUsers();
            $represent = $this->translation->_('am_NewRecord');
        }

        // Load allowed network filters for AMI/AJAM (original logic)
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(['AJAM', 'AMI']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }

        // Create form with manager data and original options structure
        $this->view->form = new AsteriskManagerEditForm(
            $manager,
            [
                'network_filters' => $arrNetworkFilters,
                'array_of_checkboxes' => $this->arrCheckBoxes,
            ]
        );

        // Set view variables
        $this->view->setVar('arrCheckBoxes', $this->arrCheckBoxes);
        $this->view->setVar('represent', $represent);
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
