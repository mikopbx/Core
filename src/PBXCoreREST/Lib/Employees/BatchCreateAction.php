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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class BatchCreateAction
 * 
 * Synchronously creates multiple employees (max 20 per request)
 * Each employee record can have partial data - missing fields will be filled
 * with defaults from DataStructure::createForNewEmployee()
 * Uses intelligent merging similar to PatchRecordAction
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class BatchCreateAction
{
    private const int MAX_BATCH_SIZE = 20;
    
    /**
     * Batch create employees from JSON array
     * 
     * @param array $data Request data containing:
     *   - employees: array of employee data (max 20 records)
     *   - mode: 'validate' - only validate, 'create' - create employees
     *   - skip_errors: bool - continue on errors (default: false)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Validate input
        if (empty($data['employees']) || !is_array($data['employees'])) {
            $res->messages['error'][] = TranslationProvider::translate('ex_BatchEmployeesArrayRequired');
            return $res;
        }
        
        $employees = $data['employees'];
        $mode = $data['mode'] ?? 'create';
        $skipErrors = $data['skip_errors'] ?? false;
        
        // Validate mode
        if (!in_array($mode, ['validate', 'create'], true)) {
            $res->messages['error'][] = TranslationProvider::translate('ex_BatchInvalidMode');
            return $res;
        }
        
        // Enforce batch size limit
        if (count($employees) > self::MAX_BATCH_SIZE) {
            $res->messages['error'][] = TranslationProvider::translate('ex_BatchSizeExceeded', [
                'maxSize' => self::MAX_BATCH_SIZE,
                'providedSize' => count($employees)
            ]);
            return $res;
        }
        
        // Process employees
        $results = [];
        $stats = [
            'total' => count($employees),
            'validated' => 0,
            'created' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($employees as $index => $employeeData) {
            $recordResult = [
                'index' => $index,
                'status' => 'pending',
                'data' => [],
                'errors' => []
            ];
            
            try {
                // Intelligently merge with defaults
                $preparedData = self::intelligentMergeWithDefaults($employeeData);
                
                // Validate data
                $validationErrors = SaveEmployeeAction::validateEmployeeData($preparedData, true);
                
                if (!empty($validationErrors)) {
                    $recordResult['status'] = 'validation_failed';
                    $recordResult['errors'] = $validationErrors;
                    $stats['failed']++;
                    $stats['errors'][] = TranslationProvider::translate('ex_BatchRecordValidationFailed', [
                        'index' => $index
                    ]);
                    
                    if (!$skipErrors) {
                        $results[] = $recordResult;
                        break; // Stop on first error
                    }
                } else {
                    $stats['validated']++;
                    
                    if ($mode === 'validate') {
                        $recordResult['status'] = 'validated';
                        $recordResult['data'] = $preparedData;
                    } else {
                        // Create employee
                        $saveResult = SaveEmployeeAction::main($preparedData);
                        
                        if ($saveResult->success) {
                            $recordResult['status'] = 'created';
                            $recordResult['data'] = $saveResult->data;
                            $stats['created']++;
                        } else {
                            $recordResult['status'] = 'create_failed';
                            $recordResult['errors'] = $saveResult->messages['error'] ?? ['Unknown error'];
                            $stats['failed']++;
                            $stats['errors'][] = TranslationProvider::translate('ex_BatchRecordCreateFailed', [
                                'index' => $index
                            ]);
                            
                            if (!$skipErrors) {
                                $results[] = $recordResult;
                                break; // Stop on first error
                            }
                        }
                    }
                }
                
            } catch (\Throwable $e) {
                $recordResult['status'] = 'error';
                $recordResult['errors'][] = $e->getMessage();
                $stats['failed']++;
                $stats['errors'][] = TranslationProvider::translate('ex_BatchRecordError', [
                    'index' => $index,
                    'error' => $e->getMessage()
                ]);
                
                if (!$skipErrors) {
                    $results[] = $recordResult;
                    break; // Stop on first error
                }
            }
            
            $results[] = $recordResult;
        }
        
        // Prepare response
        $res->data = [
            'mode' => $mode,
            'results' => $results,
            'stats' => $stats
        ];
        
        // Determine success
        if ($mode === 'validate') {
            $res->success = $stats['failed'] === 0;
        } else {
            $res->success = $stats['created'] > 0;
        }
        
        // Add messages
        if ($stats['created'] > 0) {
            $res->messages['info'][] = TranslationProvider::translate('ex_BatchCreatedSuccess', [
                'count' => $stats['created']
            ]);
        }
        
        if ($stats['failed'] > 0) {
            $res->messages['warning'][] = TranslationProvider::translate('ex_BatchFailedWarning', [
                'count' => $stats['failed']
            ]);
            if (!empty($stats['errors'])) {
                $res->messages['error'] = array_slice($stats['errors'], 0, 5); // Limit error messages
            }
        }
        
        return $res;
    }
    
    /**
     * Intelligently merge employee data with defaults
     * Based on PatchRecordAction::intelligentMerge logic
     * 
     * @param array $employeeData Input employee data
     * @return array Merged and prepared data
     */
    private static function intelligentMergeWithDefaults(array $employeeData): array
    {
        // Get default structure for new employee
        $defaults = DataStructure::createForNewEmployee();
        
        // Start with defaults
        $mergedData = $defaults;
        
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
        
        foreach ($employeeData as $key => $value) {
            // Skip ID - always create new
            if ($key === 'id') {
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
                // If empty, keep default value
                continue;
            }
            
            // Handle clearable fields
            if (in_array($key, $clearableFields)) {
                // Update even if empty (allows clearing)
                $mergedData[$key] = $value;
                
                // Handle related fields
                if (isset($relatedFields[$key])) {
                    foreach ($relatedFields[$key] as $relatedField) {
                        // If main field is cleared, also clear related field
                        // unless it's explicitly provided
                        if (empty($value) && !array_key_exists($relatedField, $employeeData)) {
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
        // If forwarding is set but ringlength is not provided, keep default
        if (array_key_exists('fwd_forwarding', $employeeData) && 
            !empty($employeeData['fwd_forwarding']) &&
            !array_key_exists('fwd_ringlength', $employeeData)) {
            // Keep default value from DataStructure (45)
        }
        
        // Ensure ID is empty for new record
        $mergedData['id'] = '';
        
        // Sanitize using SaveEmployeeAction's public method
        return SaveEmployeeAction::prepareData($mergedData);
    }
}