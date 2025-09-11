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
 * Class ExportCSVAction
 * 
 * Exports employees to CSV format for backup or migration
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class ExportCSVAction
{
    // Export formats
    private const array FORMATS = [
        'minimal' => [
            'number',
            'user_username'
        ],
        'standard' => [
            'number',
            'user_username',
            'user_email',
            'mobile_number',
            'sip_secret',
            'fwd_forwarding',
            'fwd_ringlength'
        ],
        'full' => [
            'number',
            'user_username',
            'user_email',
            'user_avatar',
            'mobile_number',
            'mobile_dialstring',
            'sip_secret',
            'sip_dtmfmode',
            'sip_transport',
            'sip_enableRecording',
            'sip_networkfilterid',
            'sip_manualattributes',
            'fwd_forwarding',
            'fwd_forwardingonbusy',
            'fwd_forwardingonunavailable',
            'fwd_ringlength'
        ]
    ];
    
    /**
     * Export employees to CSV
     * 
     * @param array $data Request data containing:
     *   - format: 'minimal', 'standard', or 'full'
     *   - filter: Array of filter conditions
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $format = $data['format'] ?? 'standard';
        $filter = $data['filter'] ?? [];
        
        // Validate format
        if (!isset(self::FORMATS[$format])) {
            $res->messages['error'][] = TranslationProvider::translate('ex_ExportInvalidFormat', [
                'format' => $format
            ]);
            return $res;
        }
        
        // Get employees
        $employees = self::getEmployees($filter);
        
        if (empty($employees)) {
            $res->messages['warning'][] = TranslationProvider::translate('ex_ExportNoEmployees');
            return $res;
        }
        
        // Generate CSV
        $csvContent = self::generateCSV($employees, $format);
        
        // Create temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'employee_export_');
        file_put_contents($tempFile, $csvContent);
        
        // Prepare response
        $res->data = [
            'fpassthru' => [
                'filename' => $tempFile,
                'need_delete' => true,
                'content_type' => 'text/csv',
                'download_name' => 'employees_' . date('Y-m-d_H-i-s') . '.csv'
            ],
            'count' => count($employees),
            'format' => $format
        ];
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Get employees based on filter
     * 
     * @param array $filter Filter conditions
     * @return array Employee records
     */
    private static function getEmployees(array $filter): array
    {
        // Use GetListAction to get all employees
        $listResult = GetListAction::main($filter);
        
        if (!$listResult->success) {
            return [];
        }
        
        $employees = $listResult->data ?? [];
        
        // Apply additional filters if needed
        if (!empty($filter['number_from']) && !empty($filter['number_to'])) {
            $employees = array_filter($employees, function($emp) use ($filter) {
                // Check if number key exists
                if (!isset($emp['number'])) {
                    return false;
                }
                $number = intval($emp['number']);
                $from = intval($filter['number_from']);
                $to = intval($filter['number_to']);
                return $number >= $from && $number <= $to;
            });
        }
        
        // Sort by number
        usort($employees, function($a, $b) {
            $aNumber = isset($a['number']) ? intval($a['number']) : 0;
            $bNumber = isset($b['number']) ? intval($b['number']) : 0;
            return $aNumber - $bNumber;
        });
        
        return $employees;
    }
    
    /**
     * Generate CSV content
     * 
     * @param array $employees Employee records
     * @param string $format Export format
     * @return string CSV content
     */
    private static function generateCSV(array $employees, string $format): string
    {
        $fields = self::FORMATS[$format];
        
        // Open memory stream
        $output = fopen('php://temp', 'r+');
        
        // Add BOM for Excel UTF-8 compatibility
        fprintf($output, "\xEF\xBB\xBF");
        
        // Write headers
        fputcsv($output, $fields);
        
        // Write data
        foreach ($employees as $employee) {
            $row = [];
            foreach ($fields as $field) {
                $value = $employee[$field] ?? '';
                
                // Special handling for boolean fields
                if ($field === 'sip_enableRecording') {
                    $value = $value ? 'true' : 'false';
                }
                
                // Clean passwords for security (optional - can be removed for full backup)
                if ($field === 'sip_secret' && !empty($value)) {
                    // Keep password for migration, but you might want to mask it
                    // $value = '***MASKED***';
                }
                
                $row[] = $value;
            }
            fputcsv($output, $row);
        }
        
        // Get content
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);
        
        return $csvContent;
    }
    
    /**
     * Generate template CSV for import
     * 
     * @param array $data Request data
     * @return PBXApiResult
     */
    public static function template(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $format = $data['format'] ?? 'standard';
        
        // Validate format
        if (!isset(self::FORMATS[$format])) {
            $format = 'standard';
        }
        
        $fields = self::FORMATS[$format];
        
        // Create sample data
        $sampleData = [
            [
                'number' => '201',
                'user_username' => 'Иван Петров',
                'user_email' => 'ivan@company.ru',
                'user_avatar' => '',
                'mobile_number' => '+79991234567',
                'mobile_dialstring' => '79991234567',
                'sip_secret' => 'SecurePass123!',
                'sip_dtmfmode' => 'auto',
                'sip_transport' => 'udp',
                'sip_enableRecording' => 'true',
                'sip_networkfilterid' => '',
                'sip_manualattributes' => '',
                'fwd_forwarding' => '100',
                'fwd_forwardingonbusy' => '',
                'fwd_forwardingonunavailable' => '',
                'fwd_ringlength' => '30'
            ],
            [
                'number' => '202',
                'user_username' => 'Maria Johnson',
                'user_email' => 'maria@example.com',
                'user_avatar' => '',
                'mobile_number' => '',
                'mobile_dialstring' => '',
                'sip_secret' => 'StrongPass456!',
                'sip_dtmfmode' => 'rfc2833',
                'sip_transport' => 'tcp',
                'sip_enableRecording' => 'false',
                'sip_networkfilterid' => '',
                'sip_manualattributes' => '',
                'fwd_forwarding' => '201',
                'fwd_forwardingonbusy' => '100',
                'fwd_forwardingonunavailable' => '100',
                'fwd_ringlength' => '45'
            ]
        ];
        
        // Generate CSV with sample data
        $output = fopen('php://temp', 'r+');
        
        // Add BOM for Excel UTF-8 compatibility
        fprintf($output, "\xEF\xBB\xBF");
        
        // Write headers
        fputcsv($output, $fields);
        
        // Write sample data
        foreach ($sampleData as $sample) {
            $row = [];
            foreach ($fields as $field) {
                $row[] = $sample[$field] ?? '';
            }
            fputcsv($output, $row);
        }
        
        // Get content
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);
        
        // Create temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'employee_template_');
        file_put_contents($tempFile, $csvContent);
        
        // Prepare response
        $res->data = [
            'fpassthru' => [
                'filename' => $tempFile,
                'need_delete' => true,
                'content_type' => 'text/csv',
                'download_name' => 'employee_import_template.csv'
            ],
            'format' => $format
        ];
        $res->success = true;
        
        return $res;
    }
}