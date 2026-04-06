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

use MikoPBX\AdminCabinet\Plugins\SecurityPlugin;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;

/**
 * AclController
 * 
 * Provides centralized access control checks for JavaScript components.
 * This controller handles permission queries from DataTable and other UI components
 * that need to dynamically show/hide features based on user permissions.
 */
class AclController extends BaseController
{
    /**
     * Check permissions for a specific controller
     * 
     * This action provides ACL permissions data for JavaScript components.
     * It accepts a controller parameter and returns permissions for common actions.
     * 
     * @return void
     */
    public function checkPermissionsAction(): void
    {
        // Only allow AJAX requests
        if (!$this->request->isAjax()) {
            $this->forward('errors/show404');
            return;
        }

        // Get controller parameter from request
        $controller = $this->request->get('controller', 'string', '');
        
        if (empty($controller)) {
            $this->view->success = false;
            $this->view->message = 'Controller parameter is required';
            return;
        }
        
        // Build full controller class name
        $controllerClass = $controller;
        
        // If it's not a full class name, assume it's in the AdminCabinet namespace
        if (strpos($controller, '\\') === false) {
            // Convert controller name to proper format (e.g., 'call-queues' to 'CallQueuesController')
            $controllerName = str_replace('-', '', ucwords($controller, '-'));
            if (!str_ends_with($controllerName, 'Controller')) {
                $controllerName .= 'Controller';
            }
            $controllerClass = "MikoPBX\\AdminCabinet\\Controllers\\{$controllerName}";
        }

        // Create SecurityPlugin instance with proper DI context for ACL checks
        $securityPlugin = new SecurityPlugin();
        $securityPlugin->setDI($this->di);

        // Check permissions using 3-level model:
        // Level 1: View list (index) - can see list of records
        // Level 2: View record (modify) - can open and view individual record
        // Level 3: Edit/Delete (save) - can modify, delete, copy records
        //
        // ModuleUsersUI stores permissions as: index, modify, save
        // UI components need: index, modify, edit, save, delete, copy, getNewRecords
        // We map granular checks to the 3-level model

        $canViewList = $securityPlugin->isAllowedAction($controllerClass, 'index');
        $canViewRecord = $securityPlugin->isAllowedAction($controllerClass, 'modify');
        $canEdit = $securityPlugin->isAllowedAction($controllerClass, 'save');

        $permissions = [
            // Level 1: View list
            'index' => $canViewList,
            'getNewRecords' => $canViewList,

            // Level 2: View record
            'modify' => $canViewRecord,
            'edit' => $canViewRecord,

            // Level 3: Edit/Delete (all modification actions map to 'save' permission)
            'save' => $canEdit,
            'delete' => $canEdit,
            'copy' => $canEdit,
        ];

        // Allow modules to add custom permissions for specific controllers
        $customPermissions = [];
        
        PBXConfModulesProvider::hookModulesMethod(
             WebUIConfigInterface::ON_GET_CONTROLLER_PERMISSIONS,
             [$controllerClass, &$customPermissions]
         );
        
        if (!empty($customPermissions)) {
            $permissions['custom'] = $customPermissions;
        } else {
            $permissions['custom'] = [];
        }

        // Return permissions as JSON
        $this->view->success = true;
        $this->view->data = $permissions;
        $this->view->controller = $controllerClass;
    }
}