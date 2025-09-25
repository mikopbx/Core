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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Update Storage Settings Action
 *
 * Updates storage configuration settings
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class UpdateSettingsAction
{
    /**
     * Update storage settings
     *
     * @param array<string, mixed> $data Settings data to update
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $errors = [];
            $updated = [];

            // Update record save period if provided
            if (isset($data['PBXRecordSavePeriod'])) {
                $messages = [];
                $result = PbxSettings::setValueByKey(
                    PbxSettings::PBX_RECORD_SAVE_PERIOD,
                    $data['PBXRecordSavePeriod'],
                    $messages
                );

                if ($result) {
                    $updated[] = 'PBXRecordSavePeriod';
                } else {
                    // Process error messages
                    foreach ($messages as $message) {
                        if (is_array($message)) {
                            foreach ($message as $msg) {
                                $errors[] = $msg->getMessage();
                            }
                        } else {
                            $errors[] = $message;
                        }
                    }
                }
            }

            // Check if there were any errors
            if (!empty($errors)) {
                $res->messages['error'] = $errors;
                $res->success = false;
            } else {
                $res->success = true;
                $res->messages['info'][] = 'Storage settings updated successfully';
                $res->data = [
                    'updated' => $updated
                ];
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}