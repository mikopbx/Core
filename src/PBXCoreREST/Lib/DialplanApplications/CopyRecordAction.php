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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractCopyRecordAction;

/**
 * Action for copying a dialplan application with automatic extension assignment
 *
 * Extends AbstractCopyRecordAction to leverage:
 * - Automatic unique ID generation
 * - Next available extension number assignment
 * - Name prefixed with "copy of"
 * - Consistent error handling and logging
 *
 * @api {get} /pbxcore/api/v3/dialplan-applications/{id}:copy Copy dialplan application
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup DialplanApplications
 *
 * @apiParam {String} id Source dialplan application ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied dialplan application data ready for creation
 * @apiSuccess {String} data.id New unique identifier
 * @apiSuccess {String} data.extension New extension number (automatically assigned)
 * @apiSuccess {String} data.name Name prefixed with "copy of"
 * @apiSuccess {String} data.applicationlogic Copied application code
 */
class CopyRecordAction extends AbstractCopyRecordAction
{
    /**
     * Copy dialplan application record with new extension and ID
     *
     * @param string $sourceId Source dialplan application ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        return self::executeStandardCopy(
            $sourceId,
            DialplanApplications::class,
            DataStructure::class,
            Extensions::PREFIX_DIALPLAN,  // Unique ID prefix (tilde will be added by generateUniqueID)
            [                             // Fields to copy
                'name',
                'hint',
                'applicationlogic',
                'type',
                'description'
            ],
            true,                         // Needs extension
            null,                         // No related records
            'Dialplan application'        // Entity type for messages
        );
    }
}
