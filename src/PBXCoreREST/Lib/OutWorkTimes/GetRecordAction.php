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

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for retrieving single out-of-work-time condition record
 * 
 * Returns either existing record or template for new record creation.
 * Includes complete data structure with all relationships loaded.
 * 
 * @api {get} /pbxcore/api/v2/out-work-times/getRecord/:id Get time condition
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup OutWorkTimes
 * 
 * @apiParam {String} [id] Record ID (omit for new record template)
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Time condition data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.name Time condition name
 * @apiSuccess {String} data.description Description
 * @apiSuccess {String} data.calType Calendar type
 * @apiSuccess {String} data.date_from Start date
 * @apiSuccess {String} data.date_to End date
 * @apiSuccess {String} data.weekday_from Start weekday
 * @apiSuccess {String} data.weekday_to End weekday
 * @apiSuccess {String} data.time_from Start time
 * @apiSuccess {String} data.time_to End time
 * @apiSuccess {String} data.failover_extension Failover extension
 * @apiSuccess {String} data.audio_message_id Audio message ID
 * @apiSuccess {Number} data.priority Priority
 * @apiSuccess {Boolean} data.enabled Status
 * @apiSuccess {Array} data.allowedExtensions Allowed extensions
 * @apiSuccess {Array} data.incomingRoutes Associated incoming routes
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get single out-of-work-time condition record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        return self::executeStandardGetRecord(
            $id,
            OutWorkTimes::class,
            DataStructure::class,
            'OUT-WORK-TIME-',
            self::getDefaultValues(),
            'api_OutWorkTimeNotFound',
            false, // OutWorkTimes does not need extension numbers
            null,  // No additional new record setup needed
            null   // No additional data loading needed
        );
    }

    /**
     * Get default values for new out-of-work-time condition
     * 
     * @return array Default field values
     */
    private static function getDefaultValues(): array
    {
        return [
            'calType' => 'timeframe',  // Default 'timeframe' for new records
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => '',
            'weekday_to' => '',
            'time_from' => '00:00',
            'time_to' => '23:59',
            'priority' => '0',  // String type to match model
            'allowRestriction' => '0',  // String type to match model ('0' = false, '1' = true)
            'action' => 'extension',  // Default action type
            'extension' => '',
            'extensionRepresent' => '',  // Extension display representation
            'audio_message_id' => '',
            'audio_message_id_Represent' => ''  // Audio file display representation
        ];
    }
}