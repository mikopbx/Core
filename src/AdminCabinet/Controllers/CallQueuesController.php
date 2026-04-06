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

use MikoPBX\AdminCabinet\Forms\CallQueueEditForm;

/**
 * CallQueuesController
 *
 * Optimized controller following IVR Menu pattern - minimal server-side logic,
 * JavaScript handles data loading via REST API. No unnecessary REST API calls
 * in controller methods.
 */
class CallQueuesController extends BaseController
{
    /**
     * Display the list of call queues
     *
     * DataTable handles all data loading via AJAX to REST API.
     * No server-side data processing required.
     */
    public function indexAction(): void
    {
        // Provide empty array for template compatibility during migration
        // JavaScript will handle actual data loading via REST API call-queues-index.js
        $this->view->callQueuesList = [];
    }

    /**
     * Modify call queue action with copy support.
     * 
     * Simplified controller following IVR Menu pattern - all data loading is handled by JavaScript via REST API.
     * This only provides the basic form structure and copy mode information.
     *
     * @param string $uniqid - The unique identifier of the call queue to modify.
     */
    public function modifyAction(string $uniqid = ''): void
    {
        // Pass form, uniqid and copy mode information to JavaScript
        $this->view->form = new CallQueueEditForm();
    }

    /**
     * Saves the call queue
     * This action is kept for backward compatibility but the actual saving
     * is handled by the REST API through JavaScript (Form.js integration)
     */
    public function saveAction(): void
    {
    }
}
