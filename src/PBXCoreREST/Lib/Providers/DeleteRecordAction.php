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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting provider record
 * 
 * @api {delete} /pbxcore/api/v2/providers/deleteRecord/:id Delete provider
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} id Provider ID or uniqid to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} messages Operation messages
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete provider record
     * 
     * @param string $id Provider ID or uniqid
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id)) {
            $res->messages['error'][] = 'api_ProviderIdRequired';
            return $res;
        }
        
        try {
            // Find provider by ID or uniqid
            $provider = Providers::findFirst([
                'conditions' => 'id = :id: OR uniqid = :uniqid:',
                'bind' => [
                    'id' => $id,
                    'uniqid' => $id
                ]
            ]);
            
            if (!$provider) {
                $res->messages['error'][] = 'api_ProviderNotFound';
                return $res;
            }
            
            // Delete provider - the model will check dependencies automatically
            $deleted = BaseActionHelper::executeInTransaction(function() use ($provider) {
                return self::deleteProviderInTransaction($provider);
            });
            
            if ($deleted) {
                $res->success = true;
                $res->messages['info'][] = 'api_ProviderDeleted';
                
                // Log successful deletion
                $configType = ucfirst(strtolower($provider->type));
                $config = $provider->$configType;
                $description = $config ? $config->description : $provider->note;
                SystemMessages::sysLogMsg(__METHOD__, "Provider '$description' ($provider->type) deleted successfully");
            } else {
                // Get error messages from the model
                foreach ($provider->getMessages() as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
                // If no specific messages, add generic error
                if (empty($res->messages['error'])) {
                    $res->messages['error'][] = 'api_ProviderDeleteFailed';
                }
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            \MikoPBX\Common\Handlers\CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
    
    
    /**
     * Delete provider and all related data in transaction
     * 
     * @param Providers $provider Provider model
     * @return bool Success status
     * @throws \Exception
     */
    private static function deleteProviderInTransaction(Providers $provider): bool
    {
        // Best Practice: Let the ORM handle cascade deletions through defined relationships
        
        // 1. Delete IAX configuration if exists
        // IAX will automatically delete the Provider through its CASCADE relation
        if ($provider->Iax) {
            if (!$provider->Iax->delete()) {
                $messages = [];
                foreach ($provider->Iax->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new \Exception('Failed to delete IAX configuration: ' . implode(', ', $messages));
            }
        }
        
        // 2. Delete SIP configuration if exists
        // SIP will automatically:
        // - Delete all related SipHosts through CASCADE relation
        // - Delete the Provider through its CASCADE relation
        if ($provider->Sip) {
            if (!$provider->Sip->delete()) {
                $messages = [];
                foreach ($provider->Sip->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new \Exception('Failed to delete SIP configuration: ' . implode(', ', $messages));
            }
        }
        
        // 3. Edge case: If neither Sip nor Iax exists, delete Provider directly
        // This shouldn't happen in normal operation, but handles edge cases
        if (!$provider->Iax && !$provider->Sip) {
            $provider = Providers::findFirstByUniqid($provider->uniqid);
            if ($provider !== null && !$provider->delete()) {
                $messages = [];
                foreach ($provider->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new \Exception('Failed to delete provider: ' . implode(', ', $messages));
            }
        }
        
        return true;
    }
}