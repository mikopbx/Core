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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Action for creating new outbound route
 * 
 * @api {post} /pbxcore/api/v3/outbound-routes Create new outbound route
 * @apiVersion 3.0.0
 * @apiName Create
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} rulename Rule name
 * @apiParam {String} providerid Provider ID
 * @apiParam {String} [numberbeginswith] Number pattern prefix
 * @apiParam {String} [restnumbers=9] Remaining digits count
 * @apiParam {String} [trimfrombegin=0] Digits to trim from beginning
 * @apiParam {String} [prepend] Prefix to add
 * @apiParam {String} [note] Additional notes
 * @apiParam {String} [priority] Rule priority (auto-calculated if not provided)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Created outbound route data
 */
class CreateAction
{
    /**
     * Create new outbound route
     * 
     * @param array $data Route data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Validate input data
            $validationResult = self::validateRouteData($data);
            if (!$validationResult['valid']) {
                $res->messages['error'] = $validationResult['errors'];
                return $res;
            }
            
            // Create new model
            $model = new OutgoingRoutingTable();
            
            // Set fields from data
            $model->rulename = $data['rulename'] ?? '';
            $model->providerid = $data['providerid'] ?? '';
            $model->numberbeginswith = $data['numberbeginswith'] ?? '';
            $model->restnumbers = $data['restnumbers'] ?? '9';
            $model->trimfrombegin = $data['trimfrombegin'] ?? '0';
            $model->prepend = $data['prepend'] ?? '';
            $model->note = $data['note'] ?? '';
            
            // Set priority - use provided or calculate new
            if (!empty($data['priority'])) {
                $model->priority = (string)$data['priority'];
            } else {
                $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
                $model->priority = (string)((int)$maxPriority + 1);
            }
            
            // Save model
            if ($model->save()) {
                $res->data = DataStructure::createFromModel($model);
                $res->success = true;
            } else {
                $res->messages['error'] = $model->getMessages();
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Validate route data
     * 
     * @param array $data Data to validate
     * @return array Validation result with 'valid' and 'errors' keys
     */
    private static function validateRouteData(array $data): array
    {
        $errors = [];
        $di = Di::getDefault();
        $t = $di->get(TranslationProvider::SERVICE_NAME);
        
        // Rule name validation (required)
        if (empty($data['rulename']) || trim($data['rulename']) === '') {
            $errors[] = $t->_('or_ValidationPleaseEnterRuleName');
        }
        
        // Provider validation (required)
        if (empty($data['providerid'])) {
            $errors[] = $t->_('or_ValidationPleaseSelectProvider');
        }
        
        // Number begins with pattern validation
        if (!empty($data['numberbeginswith']) && !preg_match('/^[0-9#+\\*()\\[\\-\\]\\{\\}|]{0,64}$/', $data['numberbeginswith'])) {
            $errors[] = $t->_('or_ValidateBeginPattern');
        }
        
        // Rest numbers validation (-1 or 0-20)
        if (isset($data['restnumbers']) && $data['restnumbers'] !== '') {
            $restNum = (int)$data['restnumbers'];
            if ($restNum < -1 || $restNum > 20) {
                $errors[] = $t->_('or_ValidateRestNumbers');
            }
        }
        
        // Trim from begin validation (0-30)
        if (isset($data['trimfrombegin']) && $data['trimfrombegin'] !== '') {
            $trimNum = (int)$data['trimfrombegin'];
            if ($trimNum < 0 || $trimNum > 30) {
                $errors[] = $t->_('or_ValidateTrimFromBegin');
            }
        }
        
        // Prepend validation (only digits, #, *, +, max 20 chars)
        if (!empty($data['prepend']) && !preg_match('/^[0-9#*+]{0,20}$/', $data['prepend'])) {
            $errors[] = $t->_('or_ValidatePrepend');
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}