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
 * UpdateRecordAction
 * Updates an existing dialplan application record (full update - PUT).
 *
 * Uses standard pattern: validate ID exists, then delegate to SaveRecordAction.
 * Dialplan reload is handled by SaveRecordAction automatically.
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class UpdateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Update an existing dialplan application record (full update).
     *
     * @param array<string, mixed> $data Dialplan application data with all fields to replace existing
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate that ID is provided
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Dialplan application ID is required for update';
                return $res;
            }

            // v3 API: ID is the uniqid value
            $app = DialplanApplications::findFirst("uniqid='{$data['id']}'");

            if (!$app) {
                $res->messages['error'][] = "Dialplan application not found: {$data['id']}";
                return $res;
            }

            // Ensure id field with uniqid value is preserved for SaveRecordAction
            $data['id'] = $app->uniqid;

            // Use existing SaveRecordAction logic for actual update
            // Note: Dialplan reload is handled automatically by system mechanism
            $res = SaveRecordAction::main($data);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
