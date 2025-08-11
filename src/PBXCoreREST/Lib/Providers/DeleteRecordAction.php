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
            
            // Check if provider is used in routes
            $usageCheck = self::checkProviderUsage($provider);
            if (!$usageCheck['canDelete']) {
                $res->messages['error'][] = 'api_ProviderInUse';
                $res->messages['info'] = $usageCheck['usage'];
                return $res;
            }
            
            // Delete in transaction
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
                $res->messages['error'][] = 'api_ProviderDeleteFailed';
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            \MikoPBX\Common\Handlers\CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
    
    /**
     * Check if provider is used in routing tables
     * 
     * @param Providers $provider Provider model
     * @return array Usage information
     */
    private static function checkProviderUsage(Providers $provider): array
    {
        $usage = [];
        $canDelete = true;
        
        // Check incoming routes
        $incomingRoutes = IncomingRoutingTable::find([
            'conditions' => 'provider = :provider:',
            'bind' => ['provider' => $provider->uniqid]
        ]);
        
        if ($incomingRoutes->count() > 0) {
            $canDelete = false;
            $routeNames = [];
            foreach ($incomingRoutes as $route) {
                $routeNames[] = $route->rulename;
            }
            $usage[] = sprintf('Used in incoming routes: %s', implode(', ', $routeNames));
        }
        
        // Check outgoing routes
        $outgoingRoutes = OutgoingRoutingTable::find([
            'conditions' => 'providerid = :provider:',
            'bind' => ['provider' => $provider->uniqid]
        ]);
        
        if ($outgoingRoutes->count() > 0) {
            $canDelete = false;
            $routeNames = [];
            foreach ($outgoingRoutes as $route) {
                $routeNames[] = $route->rulename;
            }
            $usage[] = sprintf('Used in outgoing routes: %s', implode(', ', $routeNames));
        }
        
        return [
            'canDelete' => $canDelete,
            'usage' => $usage
        ];
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
        // Delete type-specific configuration
        if ($provider->type === 'SIP') {
            // Delete additional hosts
            $sipHosts = SipHosts::find([
                'conditions' => 'provider_id = :uid:',
                'bind' => ['uid' => $provider->sipuid]
            ]);
            
            foreach ($sipHosts as $host) {
                if (!$host->delete()) {
                    throw new \Exception('Failed to delete SIP host');
                }
            }
            
            // Delete SIP configuration
            if ($provider->Sip && !$provider->Sip->delete()) {
                throw new \Exception('Failed to delete SIP configuration');
            }
        } else {
            // Delete IAX configuration
            if ($provider->Iax && !$provider->Iax->delete()) {
                throw new \Exception('Failed to delete IAX configuration');
            }
        }
        
        // Delete provider record
        if (!$provider->delete()) {
            throw new \Exception('Failed to delete provider: ' . implode(', ', $provider->getMessages()));
        }
        
        return true;
    }
}