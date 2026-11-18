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


namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Patch (partial update) IVR menu
 *
 * Merges the provided fields into the stored record and saves it through
 * SaveRecordAction, so a partial update gets the same sanitization and
 * validation as create/update (extension, actions, timeout extension) and
 * keeps the Extensions record in sync. Unspecified fields remain unchanged.
 *
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class PatchAction
{
    /**
     * Partially update IVR menu
     *
     * @param array $data Update data with 'id' field required
     * @return PBXApiResult Result of the patch operation
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $id = $data['id'] ?? '';
        if (!is_string($id) || $id === '') {
            $res->messages['error'][] = 'IVR menu ID is required for patch operation';
            return $res;
        }

        if (IvrMenu::findFirstByUniqid($id) === null) {
            $res->messages['error'][] = 'IVR menu not found';
            $res->httpCode = 404;
            return $res;
        }

        $recordResult = GetRecordAction::main($id);
        if (!$recordResult->success) {
            return $recordResult;
        }

        // Overlay only the provided fields on the stored record
        $fullData = $recordResult->data;
        foreach ($data as $key => $value) {
            if ($key !== 'id' && array_key_exists($key, $fullData)) {
                $fullData[$key] = $value;
            }
        }
        $fullData['httpMethod'] = 'PATCH';

        return SaveRecordAction::main($fullData);
    }
}
