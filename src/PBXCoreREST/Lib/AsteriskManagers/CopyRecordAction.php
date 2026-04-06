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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class CopyRecordAction
 *
 * Get copy data for an Asterisk manager
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class CopyRecordAction
{
    /**
     * Get copy data for an Asterisk manager
     *
     * @param string|null $id Source AMI user ID
     * @return PBXApiResult
     */
    public static function main(?string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id)) {
            $res->messages['error'][] = 'ID is required for copy operation';
            return $res;
        }

        $sourceManager = AsteriskManagerUsers::findFirstById($id);
        if (!$sourceManager) {
            $res->messages['error'][] = "AMI user with ID $id not found";
            return $res;
        }

        // Create a structured data from the source manager using DataStructure
        $copyData = DataStructure::createFromModel($sourceManager);

        // Clear fields that should be unique for new record
        $copyData['id'] = '';
        $copyData['username'] = '';

        // Generate new secure password
        $copyData['secret'] = AsteriskManagerUsers::generateAMIPassword();

        // Prepare description to indicate it's a copy
        if (!empty($copyData['description'])) {
            $copyData['description'] = "Copy of: " . $copyData['description'];
        }

        // Reset system flag as copy cannot be a system manager
        $copyData['isSystem'] = false;

        $res->data = $copyData;
        $res->success = true;

        return $res;
    }
}