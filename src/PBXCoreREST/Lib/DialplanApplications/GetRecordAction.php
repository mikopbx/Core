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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for getting dialplan application record with copy support
 * 
 * @api {get} /pbxcore/api/v2/dialplan-applications/getRecord/:id Get dialplan application record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} [id] Record ID, "new" for new record structure, or "copy-{id}" for copy mode
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Dialplan application data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Application name
 * @apiSuccess {String} data.hint BLF hint
 * @apiSuccess {String} data.applicationlogic Application code
 * @apiSuccess {String} data.type Application type (php/plaintext)
 * @apiSuccess {String} data.description Application description
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get dialplan application record with copy support
     * @param string|null $id - Record ID, "new", or "copy-{sourceId}"
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Check for copy mode
        $copyMode = false;
        $sourceId = '';
        if (!empty($id) && strpos($id, 'copy-') === 0) {
            $copyMode = true;
            $sourceId = substr($id, 5); // Remove 'copy-' prefix
        }

        $isNew = empty($id) || $id === 'new' || $copyMode;

        if ($isNew) {
            if ($copyMode && !empty($sourceId)) {
                // Copy mode - load source record and modify it
                $sourceApp = self::findRecordById(DialplanApplications::class, $sourceId);
                
                if ($sourceApp) {
                    // Create copy of the source dialplan application
                    $newApp = self::createCopyFromSource($sourceApp);
                    
                    $res->data = DataStructure::createFromModel($newApp);
                    $res->success = true;

                    SystemMessages::sysLogMsg(__METHOD__,
                        "Dialplan application copied from '{$sourceApp->name}' to '{$newApp->name}'",
                        LOG_DEBUG
                    );
                } else {
                    // Fallback to new record if source not found
                    $newApp = self::createNewRecord();
                    $res->data = DataStructure::createFromModel($newApp);
                    $res->success = true;
                    
                    SystemMessages::sysLogMsg(__METHOD__,
                        "Source dialplan application not found for copy, created new record instead",
                        LOG_WARNING
                    );
                }
            } else {
                // Create structure for new record with default values
                $newApp = self::createNewRecord();
                $res->data = DataStructure::createFromModel($newApp);
                $res->success = true;

                SystemMessages::sysLogMsg(__METHOD__,
                    "New dialplan application structure generated",
                    LOG_DEBUG
                );
            }
        } else {
            // Find existing record
            $app = self::findRecordById(DialplanApplications::class, $id);

            if ($app) {
                $res->data = DataStructure::createFromModel($app);
                $res->success = true;

                SystemMessages::sysLogMsg(__METHOD__,
                    "Dialplan application '{$app->name}' ({$app->extension}) loaded successfully",
                    LOG_DEBUG
                );
            } else {
                $res->messages['error'][] = 'Dialplan application not found';
                SystemMessages::sysLogMsg(__METHOD__,
                    "Dialplan application not found: {$id}",
                    LOG_WARNING
                );
            }
        }

        // Always add isNew field for form population
        if ($res->success) {
            $res->data['isNew'] = $isNew ? '1' : '0';
        }
        
        return $res;
    }

    /**
     * Create new dialplan application record with default values
     * 
     * @return DialplanApplications
     */
    private static function createNewRecord(): DialplanApplications
    {
        $newApp = new DialplanApplications();
        $newApp->id = '';
        $newApp->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
        $newApp->extension = Extensions::getNextFreeApplicationNumber();
        $newApp->name = '';
        $newApp->hint = '';
        $newApp->applicationlogic = '';
        $newApp->type = 'php';
        $newApp->description = '';
        
        return $newApp;
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
        
        // Clear identifiers
        $newApp->id = '';
        $newApp->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
        
        // Get new extension number
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