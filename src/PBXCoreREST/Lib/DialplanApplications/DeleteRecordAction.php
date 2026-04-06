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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting dialplan application record
 * 
 * @api {delete} /pbxcore/api/v2/dialplan-applications/deleteRecord/:id Delete dialplan application
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete dialplan application record
     * 
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        return self::executeStandardDelete(
            DialplanApplications::class,           // Model class
            $id,                                   // ID to delete
            'Dialplan application',                // Entity type for logging
            'api_DialplanApplicationNotFound'      // Error message when not found
            // No additional cleanup needed - extensions are handled automatically
        );
    }
}