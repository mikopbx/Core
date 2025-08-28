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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting conference room record
 * 
 * Extends AbstractGetRecordAction to leverage:
 * - Standard record retrieval patterns
 * - Automatic new record structure creation
 * - Extension number allocation
 * - Consistent error handling
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getRecord/:id Get conference room record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID (uniqid) or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Conference room data
 * @apiSuccess {String} data.id Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 * @apiSuccess {String} data.represent Display representation
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get conference room record or create new structure
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $isNew = empty($id) || $id === 'new';
        
        // Use standard get record execution from parent class
        $result = self::executeStandardGetRecord(
            $id,
            ConferenceRooms::class,
            DataStructure::class,
            Extensions::TYPE_CONFERENCE . '-',  // Unique ID prefix
            [                                    // Default values for new records
                'name' => '',
                'pinCode' => ''
            ],
            'Conference room not found',        // Not found error message
            true                                 // Needs extension number
        );
        
        // Always add isNew field for form population
        if ($result->success) {
            $result->data['isNew'] = $isNew ? '1' : '0';
        }
        
        return $result;
    }
}