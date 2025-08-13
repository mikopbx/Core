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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for updating provider status (enabled/disabled)
 * 
 * @api {post} /pbxcore/api/v2/providers/updateStatus Update provider status
 * @apiVersion 2.0.0
 * @apiName UpdateStatus
 * @apiGroup Providers
 * 
 * @apiParam {String} id Provider unique ID
 * @apiParam {String} type Provider type (SIP/IAX)
 * @apiParam {Boolean} disabled Provider disabled status
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated provider data
 */
class UpdateStatusAction
{
    /**
     * Update provider status only
     * 
     * @param array $data Data containing id, type, and disabled status
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Validate required fields
            if (empty($data['id'])) {
                $res->messages['error'][] = 'api_ProviderIdRequired';
                return $res;
            }
            
            if (empty($data['type']) || !in_array(strtoupper($data['type']), ['SIP', 'IAX'])) {
                $res->messages['error'][] = 'api_InvalidProviderType';
                return $res;
            }
            
            // Sanitize inputs
            $providerId = trim($data['id']);
            $providerType = strtoupper(trim($data['type']));
            $disabled = isset($data['disabled']) ? (bool)$data['disabled'] : false;
            
            // Execute status update in transaction
            $result = BaseActionHelper::executeInTransaction(function() use ($providerId, $providerType, $disabled) {
                return self::updateProviderStatusInTransaction($providerId, $providerType, $disabled);
            });
            
            $res->data = $result;
            $res->success = true;
            
            // Log the status change
            $status = $disabled ? 'disabled' : 'enabled';
            $description = $result['description'];
            error_log("Provider '{$description}' ({$providerType}) has been {$status} via API");
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
    
    /**
     * Update provider status in transaction
     * 
     * @param string $providerId Provider unique ID
     * @param string $providerType Provider type (SIP/IAX)
     * @param bool $disabled Disabled status
     * @return array Updated provider data
     * @throws \Exception
     */
    private static function updateProviderStatusInTransaction(string $providerId, string $providerType, bool $disabled): array
    {
        // Find provider by uniqid
        $provider = Providers::findFirst([
            'conditions' => 'uniqid = :id: AND type = :type:',
            'bind' => [
                'id' => $providerId,
                'type' => $providerType
            ]
        ]);
        
        if (!$provider) {
            throw new \Exception('api_ProviderNotFound');
        }
        
        // Update status in the type-specific table
        if ($providerType === 'SIP') {
            $config = $provider->Sip;
            if (!$config) {
                throw new \Exception('api_SipConfigNotFound');
            }
        } else {
            $config = $provider->Iax;
            if (!$config) {
                throw new \Exception('api_IaxConfigNotFound');
            }
        }
        
        // Update disabled status
        $config->disabled = $disabled ? '1' : '0';
        
        if (!$config->save()) {
            throw new \Exception('Failed to save config: ' . implode(', ', $config->getMessages()));
        }
        
        // Return updated data
        return [
            'id' => $provider->uniqid,
            'type' => $provider->type,
            'disabled' => $disabled,
            'description' => $config->description ?? $provider->note
        ];
    }
}