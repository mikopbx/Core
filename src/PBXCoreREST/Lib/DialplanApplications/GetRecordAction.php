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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for getting dialplan application record
 * 
 * @api {get} /pbxcore/api/v2/dialplan-applications/getRecord/:id Get dialplan application record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Dialplan application data
 */
class GetRecordAction
{
    /**
     * Get dialplan application record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            if (empty($id) || $id === 'new') {
                // Create structure for new record
                $newApp = new DialplanApplications();
                $newApp->id = '';
                $newApp->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
                $newApp->extension = Extensions::getNextFreeApplicationNumber();
                $newApp->name = '';
                $newApp->hint = '';
                $newApp->applicationlogic = '';
                $newApp->type = 'php';
                $newApp->description = '';
                
                $res->data = DataStructure::createFromModel($newApp);
                $res->success = true;
            } else {
                // Find existing record
                $app = DialplanApplications::findFirst([
                    'conditions' => 'uniqid = :uniqid: OR id = :id:',
                    'bind' => ['uniqid' => $id, 'id' => $id]
                ]);
                
                if ($app) {
                    $res->data = DataStructure::createFromModel($app);
                    $res->success = true;
                } else {
                    $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                }
            }
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}