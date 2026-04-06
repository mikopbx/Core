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

namespace MikoPBX\PBXCoreREST\Lib\GeneralSettings;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetDefaultAction - returns default values for general settings
 *
 * This action provides default values for new installations or
 * when resetting settings to factory defaults.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class GetDefaultAction extends AbstractGetRecordAction
{
    /**
     * Get default values for all general settings
     *
     * @return PBXApiResult Result with default settings and codecs
     */
    public static function main(): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Get default values from model
            $defaultSettings = PbxSettings::getDefaultArrayValues();

            // Filter out special markers and convert to API format
            $filteredSettings = [];
            foreach ($defaultSettings as $key => $value) {
                // Skip special marker keys
                if (strpos($key, '***') === 0) {
                    continue;
                }

                // Use DataStructure to determine field type (Single Source of Truth)
                // This ensures consistency with parameter definitions
                $filteredSettings[$key] = DataStructure::convertValueToApiFormat($key, $value);
            }

            // Get default codec configuration
            $codecs = self::getDefaultCodecs();

            // Return structured response using DataStructure for consistency
            $res->data = DataStructure::createFromData(
                $filteredSettings,
                $codecs,
                [
                    'isDefaultWebPassword' => true,
                    'isDefaultSSHPassword' => true
                ]
            );
            $res->success = true;

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Get default codec configuration
     *
     * @return array<int, array<string, mixed>> Array of default codec configurations
     */
    private static function getDefaultCodecs(): array
    {
        $result = [];

        // Get all codecs with default ordering
        $codecs = Codecs::find([
            'order' => 'type, priority'
        ]);

        // Track sequential priority per codec type
        $audioPriority = 0;
        $videoPriority = 0;

        /** @var Codecs[] $codecs */
        foreach ($codecs as $codec) {
            // Assign sequential priority based on order in result set
            if ($codec->type === 'audio') {
                $priority = $audioPriority++;
            } else {
                $priority = $videoPriority++;
            }

            // Default: all codecs enabled
            $result[] = [
                'name' => $codec->name,
                'type' => $codec->type,
                'priority' => $priority,
                'disabled' => false,
                'description' => $codec->description
            ];
        }

        return $result;
    }
}