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

use MikoPBX\AdminCabinet\Forms\AsteriskRestUserEditForm;

/**
 * Asterisk REST Interface (ARI) Users Controller
 * 
 * Handles the web interface for managing Asterisk REST Interface (ARI) users.
 * Uses REST API v3 for all data operations.
 */
class AsteriskRestUsersController extends BaseController
{
    /**
     * Display list of ARI users
     */
    public function indexAction(): void
    {
        // The list is loaded via JavaScript and REST API
        // Just render the view
    }
    
    /**
     * Display form for creating/editing ARI user
     * 
     * @param string|null $id User ID
     */
    public function modifyAction($id = null): void
    { 
        // Create form
        $form = new AsteriskRestUserEditForm();
        
        // Pass data to view
        $this->view->form = $form;
    }
    
}