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
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying a dialplan application with automatic extension assignment
 *
 * This action creates a copy of an existing dialplan application with:
 * - New unique ID generated automatically
 * - Next available extension number assigned
 * - Name prefixed with "copy of"
 * - All settings and application logic copied
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
 * @apiSuccess {String} data.id Empty string (new record)
 * @apiSuccess {String} data.extension New extension number (automatically assigned)
 * @apiSuccess {String} data.name Name prefixed with "copy of"
 * @apiSuccess {String} data.applicationlogic Copied application code
 */
class CopyRecordAction
{
    /**
     * Copy dialplan application record with new extension and ID
     *
     * @param string $sourceId Source dialplan application ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source dialplan application - try uniqid first, then numeric id
            $sourceApp = DialplanApplications::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $sourceId, 'id' => $sourceId]
            ]);

            if (!$sourceApp) {
                $res->messages['error'][] = "Source dialplan application not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source dialplan application not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create new dialplan application model with copied values
            $newApp = self::createCopyFromSource($sourceApp);

            // Create data structure for the copied dialplan application
            $res->data = DataStructure::createFromModel($newApp);
            // Override ID to be empty for copy (new unsaved record)
            $res->data['id'] = '';
            $res->success = true;

            SystemMessages::sysLogMsg(__METHOD__,
                "Dialplan application copied from '{$sourceApp->name}' to '{$newApp->name}'",
                LOG_DEBUG
            );

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying dialplan application: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of dialplan application from source record
     *
     * @param DialplanApplications $sourceApp
     * @return DialplanApplications
     */
    private static function createCopyFromSource(DialplanApplications $sourceApp): DialplanApplications
    {
        $newApp = new DialplanApplications();

        // Don't generate uniqid here - it will be generated on save
        // This is a new unsaved record, so it should not have an ID yet
        
        // Get new extension number automatically
        $newApp->extension = Extensions::getNextFreeApplicationNumber();
        
        // Copy all other fields
        $newApp->name = 'copy of ' . $sourceApp->name;
        $newApp->hint = $sourceApp->hint;
        $newApp->applicationlogic = $sourceApp->applicationlogic;
        $newApp->type = $sourceApp->type;
        $newApp->description = $sourceApp->description;
        
        return $newApp;
    }
}