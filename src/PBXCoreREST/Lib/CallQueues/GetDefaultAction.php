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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting default values for a new call queue
 * 
 * This action is used when creating a new call queue to provide
 * default values for form initialization
 * 
 * @api {get} /pbxcore/api/v3/call-queues:getDefault Get default values for new call queue
 * @apiVersion 3.0.0
 * @apiName GetDefault
 * @apiGroup CallQueues
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default call queue data
 * @apiSuccess {String} data.uniqid Unique identifier (generated)
 * @apiSuccess {String} data.extension Next available extension number
 * @apiSuccess {String} data.name Empty name for user input
 * @apiSuccess {String} data.strategy Default strategy (ringall)
 * @apiSuccess {String} data.isNew Always "1" for new records
 */
class GetDefaultAction
{
    /**
     * Get default values for a new call queue
     *
     * Uses OpenAPI schema to generate default data structure automatically,
     * ensuring consistency between API documentation and implementation.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Generate unique ID for the new call queue using ModelsBase method
            $uniqid = CallQueues::generateUniqueID(Extensions::PREFIX_QUEUE);

            // Get next available extension number using centralized method
            $extensionNumber = Extensions::getNextFreeApplicationNumber();

            // Create default data structure from OpenAPI schema with overrides
            // The schema provides default values for all fields with proper types
            $data = DataStructure::createFromSchema('detail', [
                'id' => $uniqid,
                'extension' => $extensionNumber,
                'isNew' => '1'  // Special flag for frontend to indicate new record
            ]);

            $res->data = $data;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}