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

namespace MikoPBX\PBXCoreREST\Lib\Storage;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Storage;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get Storage Settings Action
 *
 * Retrieves current storage settings and usage information
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class GetSettingsAction
{
    /**
     * Get storage settings
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get record save period setting
            $recordSavePeriod = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);

            // Get storage usage statistics
            $storage = new Storage();
            $usageData = $storage->getStorageUsageByCategory();
            $devicesList = $storage->getAllHdd();

            // Prepare response data
            $res->data = [
                'PBXRecordSavePeriod' => $recordSavePeriod,
                'usage' => $usageData,
                'devices' => $devicesList
            ];

            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}