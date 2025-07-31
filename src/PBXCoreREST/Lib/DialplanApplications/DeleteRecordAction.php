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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for deleting dialplan application record
 * 
 * @api {delete} /pbxcore/api/v2/dialplan-applications/deleteRecord/:id Delete dialplan application
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 */
class DeleteRecordAction
{
    /**
     * Delete dialplan application record
     * 
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            return $res;
        }
        
        try {
            $app = DialplanApplications::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$app) {
                $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                return $res;
            }
            
            // Delete in transaction
            BaseActionHelper::executeInTransaction(function() use ($app) {
                // Delete related extension
                $extension = Extensions::findFirstByNumber($app->extension);
                if ($extension && !$extension->delete()) {
                    throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                }
                
                // Delete dialplan application
                if (!$app->delete()) {
                    throw new \Exception('Failed to delete dialplan application: ' . implode(', ', $app->getMessages()));
                }
                
                return true;
            });
            
            $res->success = true;
            $res->data = ['deleted_id' => $id];
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}