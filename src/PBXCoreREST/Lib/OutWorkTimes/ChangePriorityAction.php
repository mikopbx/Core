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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractChangePriorityAction;

/**
 * Action for changing priority of out-of-work-time conditions
 *
 * Extends AbstractChangePriorityAction to leverage:
 * - Bulk priority updates for drag-and-drop reordering
 * - Transaction-based updates with proper error handling
 * - Validation of priority data
 * - Consistent logging and error reporting
 *
 * @api {post} /pbxcore/api/v2/out-work-times/changePriority Change out-of-work times priority
 * @apiVersion 2.0.0
 * @apiName ChangePriority
 * @apiGroup OutWorkTimes
 *
 * @apiParam {Object} priorities Map of condition ID to new priority value
 * @apiParamExample {json} Request-Example:
 *     {
 *       "priorities": {
 *         "2": 10,
 *         "3": 20,
 *         "4": 30
 *       }
 *     }
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Operation details
 * @apiSuccess {Number} data.updated Number of updated conditions
 * @apiSuccess {String} data.message Success message
 */
class ChangePriorityAction extends AbstractChangePriorityAction
{
    /**
     * Update priorities for multiple time conditions
     *
     * @param array $data Request data with priorities map
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        return self::executeStandardPriorityChange(
            $data,
            OutWorkTimes::class,
            'Time condition',
            'priority',      // Priority field name in model
            'description'    // Name field for logging
        );
    }
}