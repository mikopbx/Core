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

use MikoPBX\AdminCabinet\Forms\TimeFrameEditForm;
use MikoPBX\Common\Models\OutWorkTimes;

/**
 * OutOffWorkTimeController - manages out-of-work time conditions interface
 * 
 * This controller has been refactored to use REST API v2.
 * All data operations are now handled through JavaScript and REST API calls.
 * The controller only provides the basic page structure and forms.
 */
class OutOffWorkTimeController extends BaseController
{
    /**
     * Index page for out-of-work time conditions
     * Only provides the page structure, data loaded via REST API
     */
    public function indexAction(): void
    {
        // Empty table - data will be loaded via REST API
        $this->view->indexTable = [];
    }

    /**
     * Edit page for out-of-work time condition
     * Only creates empty form, data loaded via REST API
     *
     * @param string $id The ID of the time condition to edit
     */
    public function modifyAction(string $id = ''): void
    {
        // Create empty form - JS will populate via REST API
        $this->setupModifyView($id);
    }
    
    /**
     * Setup view for modify action
     * Creates empty form that will be populated by JavaScript
     * 
     * @param string $id Time condition ID
     * @return void
     */
    private function setupModifyView(string $id): void
    {
        // Create empty model for form structure
        $timeFrame = new OutWorkTimes();
        
        // Set the ID so it's available in the form
        if (!empty($id)) {
            $timeFrame->id = $id;
        }
        
        // Create form with empty dropdowns - will be populated by JS
        $form = new TimeFrameEditForm(
            $timeFrame,
            [
                'extensions' => [],        // Will be loaded by JS
                'audio-message' => [],     // Will be loaded by JS
                'available-actions' => [], // Will be loaded by JS
                'week-days' => []          // Will be loaded by JS
            ]
        );
        
        $this->view->form = $form;
        $this->view->id = $id;
        $this->view->represent = '';
        $this->view->rules = []; // Empty rules table - will be loaded by JS
        
        // Server timezone offset for calendar
        $dateTime = new \DateTime();
        $this->view->setVar('serverOffset', $dateTime->getOffset() / 60);
    }

    /**
     * @deprecated Use REST API instead
     * Change priority action - handled by REST API
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        echo json_encode(['result' => false, 'message' => 'Use REST API']);
    }

    /**
     * @deprecated Use REST API instead
     * Save action - handled by REST API
     */
    public function saveAction(): void
    {
        $this->forward('out-off-work-time/index');
    }

    /**
     * @deprecated Use REST API instead
     * Delete action - handled by REST API
     */
    public function deleteAction(string $id): void
    {
        $this->forward('out-off-work-time/index');
    }
}