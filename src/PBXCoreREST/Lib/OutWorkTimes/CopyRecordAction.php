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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying an out-of-work-time condition
 *
 * This action creates a copy of an existing time condition with:
 * - New unique ID generated automatically
 * - Description prefixed with "copy of"
 * - All settings and routing rules copied
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
 * @apiSuccess {String} data.id Empty for new record
 * @apiSuccess {String} data.uniqid New unique identifier
 * @apiSuccess {String} data.description Description prefixed with "copy of"
 */
class CopyRecordAction
{
    /**
     * Copy time condition record with new unique ID
     *
     * @param string $sourceId Source time condition ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source time condition
            $sourceCondition = OutWorkTimes::findFirst("id='{$sourceId}'");

            if (!$sourceCondition) {
                $res->messages['error'][] = "Source time condition not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source time condition not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create new time condition model with copied values
            $newCondition = self::createCopyFromSource($sourceCondition);

            // Create data structure for the copied condition
            $res->data = DataStructure::createFromModel($newCondition);

            // Clear the ID field for new condition creation
            // The frontend should treat this as a new condition
            $res->data['id'] = '';

            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying time condition: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of OutWorkTimes from source record
     *
     * @param OutWorkTimes $sourceCondition
     * @return OutWorkTimes
     */
    private static function createCopyFromSource(OutWorkTimes $sourceCondition): OutWorkTimes
    {
        $newCondition = new OutWorkTimes();

        // Generate new identifiers
        $newCondition->id = null;
        $newCondition->uniqid = OutWorkTimes::generateUniqueID(Extensions::PREFIX_OUT_WORK_TIME);

        // Copy all fields with modifications
        $newCondition->description = 'copy of ' . ($sourceCondition->description ?? '');
        $newCondition->calType = $sourceCondition->calType;
        $newCondition->date_from = $sourceCondition->date_from;
        $newCondition->date_to = $sourceCondition->date_to;
        $newCondition->weekday_from = $sourceCondition->weekday_from;
        $newCondition->weekday_to = $sourceCondition->weekday_to;
        $newCondition->time_from = $sourceCondition->time_from;
        $newCondition->time_to = $sourceCondition->time_to;
        $newCondition->action = $sourceCondition->action;
        $newCondition->extension = $sourceCondition->extension;
        $newCondition->audio_message_id = $sourceCondition->audio_message_id;
        $newCondition->calUrl = $sourceCondition->calUrl;
        $newCondition->priority = $sourceCondition->priority;
        $newCondition->allowRestriction = $sourceCondition->allowRestriction;

        // Copy routing rules
        $sourceRoutes = OutWorkTimesRouts::find("timeConditionId='{$sourceCondition->id}'");
        $copiedRoutes = [];
        foreach ($sourceRoutes as $sourceRoute) {
            $newRoute = new OutWorkTimesRouts();
            $newRoute->timeConditionId = ''; // Will be set when saved
            $newRoute->routId = $sourceRoute->routId;
            $newRoute->oldExtension = $sourceRoute->oldExtension;
            $newRoute->oldExtensionType = $sourceRoute->oldExtensionType;
            $newRoute->oldRuleName = $sourceRoute->oldRuleName;
            $newRoute->priority = $sourceRoute->priority;
            $copiedRoutes[] = $newRoute;
        }

        // Attach routes to the new condition for DataStructure
        $newCondition->OutWorkTimesRouts = $copiedRoutes;

        return $newCondition;
    }
}