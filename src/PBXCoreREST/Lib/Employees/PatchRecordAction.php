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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class PatchRecordAction
 * 
 * Handles PATCH /employees/{id} - Partial update of an employee record
 * 
 * This action allows updating only specific fields without providing the complete record.
 * It implements intelligent field merging that:
 * - Only updates fields that are present in the request
 * - Preserves existing data for non-provided fields
 * - Handles special fields like passwords correctly
 * - Manages related entities (mobile numbers, forwarding) properly
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class PatchRecordAction
{
    /**
     * Partially update an employee record with intelligent field merging
     * 
     * @param array $data Partial employee data from request
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // For patch operation, we must have an ID
        if (empty($data['id'])) {
            $res = new PBXApiResult();
            $res->messages['error'][] = 'Employee ID is required for patch operation';
            return $res;
        }
        
        // First, get the existing record
        $existingRecord = GetRecordAction::main($data['id']);

        if (!$existingRecord->success) {
            $res = new PBXApiResult();
            $res->messages['error'][] = "Employee not found for patch operation (ID: {$data['id']})";
            $res->httpCode = 404;
            return $res;
        }
        
        // Perform intelligent merge of data
        $mergedData = self::intelligentMerge($existingRecord->data, $data);
        
        // Use SaveRecordAction with fully merged data
        return SaveRecordAction::main($mergedData);
    }
    
    /**
     * Intelligently merge patch data with existing data
     * 
     * This method handles special cases for PATCH operations:
     * - Passwords are only updated if provided and non-empty
     * - Empty strings can clear certain fields (like mobile_number)
     * - Related fields are preserved (e.g., mobile_dialstring with mobile_number)
     * - Null values are ignored (field not provided in request)
     * 
     * @param array $existingData Current employee data
     * @param array $patchData Partial data from PATCH request
     * @return array Merged data ready for saving
     */
    private static function intelligentMerge(array $existingData, array $patchData): array
    {
        $mergedData = $existingData;
        
        // Fields that should be skipped during merge
        $skipFields = ['id']; // ID should always be preserved from patch request
        
        // Fields that can be cleared with empty string
        $clearableFields = [
            'user_email',
            'user_avatar', 
            'mobile_number',
            'mobile_dialstring',
            'sip_manualattributes',
            'fwd_forwarding',
            'fwd_forwardingonbusy', 
            'fwd_forwardingonunavailable'
        ];
        
        // Fields that should only be updated if non-empty
        $nonEmptyFields = ['sip_secret'];
        
        // Related field groups (if one is updated, check related ones)
        $relatedFields = [
            'mobile_number' => ['mobile_dialstring'],
            'fwd_forwarding' => ['fwd_ringlength'],
        ];
        
        foreach ($patchData as $key => $value) {
            // Skip fields that shouldn't be merged
            if (in_array($key, $skipFields)) {
                continue;
            }
            
            // Skip representation fields (they are calculated)
            if (str_ends_with($key, '_represent')) {
                continue;
            }
            
            // Handle non-empty fields (like passwords)
            if (in_array($key, $nonEmptyFields)) {
                // Only update if value is not empty
                if (!empty($value)) {
                    $mergedData[$key] = $value;
                }
                // If empty, keep existing value
                continue;
            }
            
            // Handle clearable fields
            if (in_array($key, $clearableFields)) {
                // Update even if empty (allows clearing)
                $mergedData[$key] = $value;
                
                // Handle related fields
                if (isset($relatedFields[$key])) {
                    foreach ($relatedFields[$key] as $relatedField) {
                        // If main field is cleared, also check if related field should be cleared
                        if (empty($value) && !array_key_exists($relatedField, $patchData)) {
                            // Clear related field if main field is cleared
                            // and related field is not explicitly provided
                            $mergedData[$relatedField] = '';
                        }
                    }
                }
                continue;
            }
            
            // Handle boolean fields
            if (is_bool($value) || $value === 'true' || $value === 'false') {
                $mergedData[$key] = $value;
                continue;
            }
            
            // Handle numeric fields (including 0)
            if (is_numeric($value)) {
                $mergedData[$key] = $value;
                continue;
            }
            
            // For all other fields, update if value is not null
            if ($value !== null) {
                $mergedData[$key] = $value;
            }
        }
        
        // Special handling for forwarding ring length
        // If forwarding is set but ringlength is not provided, set default
        if (array_key_exists('fwd_forwarding', $patchData) && 
            !empty($patchData['fwd_forwarding']) &&
            !array_key_exists('fwd_ringlength', $patchData)) {
            $mergedData['fwd_ringlength'] = 45;
        }
        
        // Ensure ID is always set from patch data
        $mergedData['id'] = $patchData['id'];
        
        return $mergedData;
    }
}