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
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractCopyRecordAction;

/**
 * Action for copying an out-of-work-time condition
 *
 * Extends AbstractCopyRecordAction to leverage:
 * - Automatic unique ID generation
 * - Description prefixed with "copy of"
 * - Related records copying (routing rules)
 * - Consistent error handling and logging
 *
 * @api {get} /pbxcore/api/v3/off-work-times/{id}:copy Copy time condition
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup OutOffWorkTime
 *
 * @apiParam {String} id Source time condition ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied time condition data ready for creation
 * @apiSuccess {String} data.id New unique identifier
 * @apiSuccess {String} data.description Description prefixed with "copy of"
 * @apiSuccess {Array} data.routes Copied routing rules
 */
class CopyRecordAction extends AbstractCopyRecordAction
{
    /**
     * Copy time condition record with new unique ID and routes
     *
     * @param string $sourceId Source time condition ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        return self::executeStandardCopy(
            $sourceId,
            OutWorkTimes::class,
            DataStructure::class,
            Extensions::PREFIX_OUT_WORK_TIME,  // Unique ID prefix (tilde will be added by generateUniqueID)
            [                                  // Fields to copy
                'description',
                'calType',
                'date_from',
                'date_to',
                'weekday_from',
                'weekday_to',
                'time_from',
                'time_to',
                'action',
                'extension',
                'audio_message_id',
                'calUrl',
                'priority',
                'allowRestriction'
            ],
            false,                             // Does NOT need extension (time conditions don't have extensions)
            self::createRelatedRecordsCallback(),  // Copy routing rules
            'Time condition',                  // Entity type for messages
            'description'                      // Name field for "copy of" prefix
        );
    }

    /**
     * Create callback for copying related routing rules
     *
     * @return callable
     */
    private static function createRelatedRecordsCallback(): callable
    {
        return function ($sourceCondition, $newCondition) {
            // Find source routing rules
            $sourceRoutes = OutWorkTimesRouts::find("timeConditionId='{$sourceCondition->id}'");

            // Convert to array format for DataStructure
            $routesArray = [];
            foreach ($sourceRoutes as $sourceRoute) {
                $routesArray[] = [
                    'id' => '',  // Clear ID for new record
                    'routId' => $sourceRoute->routId,
                    'oldExtension' => $sourceRoute->oldExtension,
                    'oldExtensionType' => $sourceRoute->oldExtensionType,
                    'oldRuleName' => $sourceRoute->oldRuleName,
                    'priority' => (int)$sourceRoute->priority
                ];
            }

            // Return routes array to be passed to DataStructure::createFromModel
            return $routesArray;
        };
    }
}
