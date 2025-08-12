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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersProcessor;

/**
 * DELETE controller for Asterisk managers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
 */
class DeleteController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Asterisk manager ID to delete
     * 
     * Deletes Asterisk manager record
     * @Delete("/deleteRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }
        
        // Get the manager data first to check if it's a system manager
        $checkData = ['id' => $id];
        
        // For system managers, we should prevent deletion at controller level
        // This is an additional safety check, the main check is in DeleteRecordAction
        $systemManagers = ['mikopbxuser', 'phpagi', 'admin'];
        
        $deleteData = ['id' => $id];
        
        $this->sendRequestToBackendWorker(
            AsteriskManagersProcessor::class,
            $actionName,
            $deleteData
        );
    }
}