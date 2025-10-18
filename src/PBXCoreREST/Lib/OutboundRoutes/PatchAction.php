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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for partial update (modify) of outbound route
 * 
 * @api {patch} /pbxcore/api/v3/outbound-routes/:id Partial update outbound route
 * @apiVersion 3.0.0
 * @apiName Patch
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} id Route ID
 * @apiParam {String} [rulename] Rule name
 * @apiParam {String} [providerid] Provider ID
 * @apiParam {String} [numberbeginswith] Number pattern prefix
 * @apiParam {String} [restnumbers] Remaining digits count
 * @apiParam {String} [trimfrombegin] Digits to trim from beginning
 * @apiParam {String} [prepend] Prefix to add
 * @apiParam {String} [note] Additional notes
 * @apiParam {String} [priority] Rule priority
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated outbound route data
 */
class PatchAction
{
    /**
     * Partial update (modify) outbound route
     * 
     * @param array $data Route data with id and fields to update
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Check ID
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Route ID is required';
                return $res;
            }
            
            // Find existing model
            $model = OutgoingRoutingTable::findFirstById($data['id']);
            if (!$model) {
                $res->messages['error'][] = 'Outbound route not found';
                $res->httpCode = 404;
                return $res;
            }
            
            // Update only provided fields (partial update)
            if (isset($data['rulename'])) {
                $model->rulename = $data['rulename'];
            }
            if (isset($data['providerid'])) {
                $model->providerid = $data['providerid'];
            }
            if (isset($data['numberbeginswith'])) {
                $model->numberbeginswith = $data['numberbeginswith'];
            }
            if (isset($data['restnumbers'])) {
                $model->restnumbers = $data['restnumbers'];
            }
            if (isset($data['trimfrombegin'])) {
                $model->trimfrombegin = $data['trimfrombegin'];
            }
            if (isset($data['prepend'])) {
                $model->prepend = $data['prepend'];
            }
            if (isset($data['note'])) {
                $model->note = $data['note'];
            }
            if (isset($data['priority'])) {
                $model->priority = $data['priority'];
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
}