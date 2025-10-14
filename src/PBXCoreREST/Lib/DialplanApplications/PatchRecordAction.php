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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction
 * Partially updates a dialplan application record (PATCH).
 *
 * Uses schema-based approach to merge existing data with patch updates,
 * eliminating manual field mapping and ensuring consistency.
 * Dialplan reload is handled by SaveRecordAction automatically.
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class PatchRecordAction extends AbstractSaveRecordAction
{
    /**
     * Partially update a dialplan application record.
     *
     * @param array<string, mixed> $data Partial dialplan application data to update
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate that ID is provided
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Dialplan application ID is required for patch';
                return $res;
            }

            // v3 API: ID is the uniqid value
            $app = DialplanApplications::findFirst("uniqid='{$data['id']}'");

            if (!$app) {
                $res->messages['error'][] = "Dialplan application not found: {$data['id']}";
                return $res;
            }

            // Build full data by creating structure from model
            // This uses DataStructure to get complete current state
            $currentData = DataStructure::createFromModel($app);

            // Merge patch data on top of current data
            // This ensures only provided fields are updated
            $fullData = array_merge($currentData, $data);

            // Ensure ID is preserved (v3 API uses uniqid)
            $fullData['id'] = $app->uniqid;

            // Use existing SaveRecordAction logic for actual update
            // Note: Dialplan reload is handled automatically by system mechanism
            $res = SaveRecordAction::main($fullData);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
