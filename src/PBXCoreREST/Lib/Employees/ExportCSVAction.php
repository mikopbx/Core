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

use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Files\RestAPIFilesUtils;
use MikoPBX\PBXCoreREST\Lib\Common\AvatarHelper;
use Phalcon\Di\Di;

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
            'user_username',
            'user_email',
            'mobile_number',
            'sip_secret',
            'fwd_ringlength',
            'fwd_forwarding'
        ],
        'standard' => [
            'number',
            'user_username',
            'user_email',
            'mobile_number',
            'mobile_dialstring',
            'sip_secret',
            'sip_dtmfmode',
            'sip_transport',
            'sip_enableRecording',
            'fwd_ringlength',
            'fwd_forwarding',
            'fwd_forwardingonbusy',
            'fwd_forwardingonunavailable'
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
            'sip_manualattributes',
            'fwd_ringlength',
            'fwd_forwarding',
            'fwd_forwardingonbusy',
            'fwd_forwardingonunavailable'
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
        
        // Create temporary file with proper extension
        $tempFileName = 'employees_' . date('Y-m-d_H-i-s') . '.csv';
        $tempFile = sys_get_temp_dir() . '/' . $tempFileName;
        file_put_contents($tempFile, $csvContent);
        
        // Create download link using RestAPIFilesUtils
        $downloadLink = RestAPIFilesUtils::makeFileLinkForDownload($tempFile, '');
        
        // Prepare response
        $res->data = [
            'filename' => $downloadLink,
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
        // Get full employee data directly from database
        $employees = [];
        
        // Build query with all necessary JOINs
        $di = Di::getDefault();
        if ($di === null) {
            return [];
        }
        
        $parameters = [
            'models' => [
                'Users' => Users::class,
            ],
            'joins' => [
                'InternalExtensions' => [
                    0 => Extensions::class,
                    1 => 'InternalExtensions.userid=Users.id AND InternalExtensions.is_general_user_number = "1" AND InternalExtensions.type="' . Extensions::TYPE_SIP . '"',
                    2 => 'InternalExtensions',
                    3 => 'INNER',
                ],
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=InternalExtensions.number',
                    2 => 'Sip',
                    3 => 'INNER',
                ],
                'MobileExtensions' => [
                    0 => Extensions::class,
                    1 => 'MobileExtensions.userid=Users.id AND MobileExtensions.is_general_user_number = "1" AND MobileExtensions.type="' . Extensions::TYPE_EXTERNAL . '"',
                    2 => 'MobileExtensions',
                    3 => 'LEFT',
                ],
                'ExternalPhones' => [
                    0 => ExternalPhones::class,
                    1 => 'ExternalPhones.extension=MobileExtensions.number',
                    2 => 'ExternalPhones',
                    3 => 'LEFT',
                ],
                'ForwardingRights' => [
                    0 => ExtensionForwardingRights::class,
                    1 => 'ForwardingRights.extension=InternalExtensions.number',
                    2 => 'ForwardingRights',
                    3 => 'LEFT',
                ],
            ],
            'columns' => [
                'user_id' => 'Users.id',
                'user_username' => 'Users.username',
                'user_email' => 'Users.email',
                'user_avatar' => 'Users.avatar',
                'number' => 'InternalExtensions.number',
                'sip_secret' => 'Sip.secret',
                'sip_dtmfmode' => 'Sip.dtmfmode',
                'sip_transport' => 'Sip.transport',
                'sip_manualattributes' => 'Sip.manualattributes',
                'sip_enableRecording' => 'Sip.enableRecording',
                'mobile_number' => 'MobileExtensions.number',
                'mobile_dialstring' => 'ExternalPhones.dialstring',
                'fwd_ringlength' => 'ForwardingRights.ringlength',
                'fwd_forwarding' => 'ForwardingRights.forwarding',
                'fwd_forwardingonbusy' => 'ForwardingRights.forwardingonbusy',
                'fwd_forwardingonunavailable' => 'ForwardingRights.forwardingonunavailable',
            ],
        ];
        
        // Apply number range filter if provided
        if (!empty($filter['number_from']) && !empty($filter['number_to'])) {
            $from = intval($filter['number_from']);
            $to = intval($filter['number_to']);
            $parameters['conditions'] = "CAST(InternalExtensions.number AS INTEGER) BETWEEN $from AND $to";
        }
        
        // Order by number
        $parameters['order'] = 'CAST(InternalExtensions.number AS INTEGER) ASC';
        
        // Execute query
        $query = $di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $result = $query->execute();
        
        if (!$result) {
            return [];
        }
        
        // Convert to array and return
        return $result->toArray();
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
        
        // Write field names as headers (English identifiers)
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
                
                // Decode base64 for manualattributes
                if ($field === 'sip_manualattributes' && !empty($value)) {
                    $value = base64_decode($value);
                }
                
                // Convert avatar to URL
                if ($field === 'user_avatar') {
                    $value = AvatarHelper::getAvatarUrl($value);
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
                'sip_dtmfmode' => 'rfc4733',
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
        
        // Write field names as headers (English identifiers)
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
        
        // Create temporary file with proper extension
        $tempFileName = 'employee_import_template.csv';
        $tempFile = sys_get_temp_dir() . '/' . $tempFileName;
        file_put_contents($tempFile, $csvContent);
        
        // Create download link using RestAPIFilesUtils
        $downloadLink = RestAPIFilesUtils::makeFileLinkForDownload($tempFile, '');
        
        // Prepare response
        $res->data = [
            'filename' => $downloadLink,
            'format' => $format
        ];
        $res->success = true;
        
        return $res;
    }
}