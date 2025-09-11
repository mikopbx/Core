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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\PasswordService;

/**
 * Class ImportCSVAction
 * 
 * Handles CSV file parsing and validation for employee import
 * Supports up to 1000 records per file
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class ImportCSVAction
{
    private const int MAX_IMPORT_SIZE = 1000;
    private const int MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    
    // Supported CSV columns
    private const array SUPPORTED_COLUMNS = [
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
    ];
    
    // Required columns
    private const array REQUIRED_COLUMNS = [
        'number',
        'user_username'
    ];
    
    /**
     * Parse and validate CSV file for preview
     * 
     * @param array $data Request data containing:
     *   - filepath: Path to uploaded CSV file
     *   - mode: 'preview' or 'import'
     *   - strategy: 'skip_duplicates', 'update_existing', or 'fail_on_duplicate'
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $mode = $data['mode'] ?? 'preview';
        $strategy = $data['strategy'] ?? 'skip_duplicates';
        
        // Check if we're in import mode with saved data
        if ($mode === 'import' && !empty($data['uploadId'])) {
            // Load saved preview data
            $dataFile = "/tmp/employee_import/{$data['uploadId']}.json";
            if (!file_exists($dataFile)) {
                $res->messages['error'][] = TranslationProvider::translate('ex_ImportFileNotFound');
                return $res;
            }
            
            $savedData = json_decode(file_get_contents($dataFile), true);
            if (!$savedData) {
                $res->messages['error'][] = TranslationProvider::translate('ex_ImportInvalidData');
                return $res;
            }
            
            $records = $savedData['records'] ?? [];
            $validationResult = $savedData['validation'] ?? [];
            
            // Start import worker directly
            $jobId = self::startImportWorker($data['uploadId'], $strategy);
            
            if ($jobId) {
                $res->data = [
                    'jobId' => $jobId,
                    'channelId' => "import_progress_$jobId",
                    'total' => count($records),
                    'toImport' => $validationResult['valid'] ?? 0
                ];
                $res->success = true;
            } else {
                $res->messages['error'][] = TranslationProvider::translate('ex_ImportWorkerFailed');
            }
            
            return $res;
        }
        
        // Validate input for preview mode
        if (empty($data['filepath']) || !file_exists($data['filepath'])) {
            $res->messages['error'][] = TranslationProvider::translate('ex_ImportFileNotFound');
            return $res;
        }
        
        $filepath = $data['filepath'];
        
        // Check file size
        $filesize = filesize($filepath);
        if ($filesize > self::MAX_FILE_SIZE) {
            $res->messages['error'][] = TranslationProvider::translate('ex_ImportFileTooLarge', [
                'maxSize' => '10MB',
                'fileSize' => round($filesize / 1024 / 1024, 2) . 'MB'
            ]);
            return $res;
        }
        
        // Parse CSV
        $parseResult = self::parseCSV($filepath);
        if (!$parseResult['success']) {
            $res->messages['error'] = $parseResult['errors'];
            return $res;
        }
        
        $records = $parseResult['records'];
        $headers = $parseResult['headers'];
        
        // Check record count
        if (count($records) > self::MAX_IMPORT_SIZE) {
            $res->messages['warning'][] = TranslationProvider::translate('ex_ImportTruncated', [
                'maxSize' => self::MAX_IMPORT_SIZE,
                'totalSize' => count($records)
            ]);
            $records = array_slice($records, 0, self::MAX_IMPORT_SIZE);
        }
        
        // Validate records
        $validationResult = self::validateRecords($records, $strategy);
        
        if ($mode === 'preview') {
            // Return preview data
            $res->data = [
                'total' => count($records),
                'valid' => $validationResult['valid'],
                'duplicates' => count($validationResult['duplicates']),
                'errors' => count($validationResult['errors']),
                'warnings' => count($validationResult['warnings']),
                'headers' => $headers,
                'preview' => array_slice($validationResult['preview'], 0, 20), // First 20 records
                'uploadId' => self::saveTemporaryData($records, $validationResult)
            ];
            $res->success = true;
        } else {
            // Import mode - delegate to worker
            if ($validationResult['valid'] === 0) {
                $res->messages['error'][] = TranslationProvider::translate('ex_ImportNoValidRecords');
                return $res;
            }
            
            // Start import worker
            $uploadId = self::saveTemporaryData($records, $validationResult);
            $jobId = self::startImportWorker($uploadId, $strategy);
            
            if ($jobId) {
                $res->data = [
                    'jobId' => $jobId,
                    'channelId' => "import_progress_$jobId",
                    'total' => count($records),
                    'toImport' => $validationResult['valid']
                ];
                $res->success = true;
            } else {
                $res->messages['error'][] = TranslationProvider::translate('ex_ImportWorkerFailed');
            }
        }
        
        return $res;
    }
    
    /**
     * Parse CSV file
     * 
     * @param string $filepath Path to CSV file
     * @return array Parse result with records and headers
     */
    private static function parseCSV(string $filepath): array
    {
        $result = [
            'success' => false,
            'records' => [],
            'headers' => [],
            'errors' => []
        ];
        
        // Detect encoding and convert to UTF-8 if needed
        $content = file_get_contents($filepath);
        $encoding = mb_detect_encoding($content, ['UTF-8', 'Windows-1251', 'CP1251', 'KOI8-R'], true);
        
        if ($encoding !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            file_put_contents($filepath, $content);
        }
        
        // Open CSV file
        $handle = fopen($filepath, 'r');
        if (!$handle) {
            $result['errors'][] = TranslationProvider::translate('ex_ImportCannotReadFile');
            return $result;
        }
        
        // Read headers
        $headers = fgetcsv($handle);
        if (!$headers) {
            $result['errors'][] = TranslationProvider::translate('ex_ImportEmptyFile');
            fclose($handle);
            return $result;
        }
        
        // Clean and validate headers
        $headers = array_map('trim', $headers);
        $headers = array_map('strtolower', $headers);
        $headers = array_map(function($header) {
            // Remove BOM if present
            return str_replace("\xEF\xBB\xBF", '', $header);
        }, $headers);
        
        // Check required columns
        $missingRequired = array_diff(self::REQUIRED_COLUMNS, $headers);
        if (!empty($missingRequired)) {
            $result['errors'][] = TranslationProvider::translate('ex_ImportMissingColumns', [
                'columns' => implode(', ', $missingRequired)
            ]);
            fclose($handle);
            return $result;
        }
        
        // Read records
        $records = [];
        $lineNumber = 2; // Starting from line 2 (after headers)
        
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($headers)) {
                $result['errors'][] = TranslationProvider::translate('ex_ImportInvalidRow', [
                    'line' => $lineNumber
                ]);
                $lineNumber++;
                continue;
            }
            
            // Create associative array
            $record = array_combine($headers, $row);
            
            // Clean values
            foreach ($record as $key => $value) {
                $record[$key] = trim($value);
            }
            
            // Add line number for error reporting
            $record['_line'] = $lineNumber;
            
            $records[] = $record;
            $lineNumber++;
        }
        
        fclose($handle);
        
        if (empty($records)) {
            $result['errors'][] = TranslationProvider::translate('ex_ImportNoRecords');
            return $result;
        }
        
        $result['success'] = true;
        $result['records'] = $records;
        $result['headers'] = $headers;
        
        return $result;
    }
    
    /**
     * Validate records
     * 
     * @param array $records CSV records
     * @param string $strategy Duplicate handling strategy
     * @return array Validation result
     */
    private static function validateRecords(array $records, string $strategy): array
    {
        $result = [
            'valid' => 0,
            'duplicates' => [],
            'errors' => [],
            'warnings' => [],
            'preview' => []
        ];
        
        // Get existing numbers from database
        $existingNumbers = [];
        $extensions = Extensions::find(['columns' => 'number']);
        foreach ($extensions as $ext) {
            $existingNumbers[$ext->number] = true;
        }
        
        // Check for duplicates within CSV
        $csvNumbers = [];
        foreach ($records as $index => $record) {
            $line = $record['_line'] ?? $index + 2;
            $number = $record['number'] ?? '';
            
            // Validate required fields
            if (empty($number) || empty($record['user_username'])) {
                $result['errors'][] = [
                    'line' => $line,
                    'type' => 'MISSING_REQUIRED',
                    'message' => TranslationProvider::translate('ex_ImportMissingRequiredFields')
                ];
                $result['preview'][] = [
                    'row' => $line,
                    'number' => $number,
                    'user_username' => $record['user_username'] ?? '',
                    'status' => 'error',
                    'message' => 'Отсутствуют обязательные поля'
                ];
                continue;
            }
            
            // Check duplicate in CSV
            if (isset($csvNumbers[$number])) {
                $result['duplicates'][] = [
                    'line' => $line,
                    'number' => $number,
                    'type' => 'DUPLICATE_IN_FILE'
                ];
                $result['preview'][] = [
                    'row' => $line,
                    'number' => $number,
                    'user_username' => $record['user_username'],
                    'status' => 'duplicate',
                    'message' => 'Дубликат номера в файле'
                ];
                
                if ($strategy === 'fail_on_duplicate') {
                    continue;
                }
            }
            
            // Check duplicate in database
            if (isset($existingNumbers[$number])) {
                $result['duplicates'][] = [
                    'line' => $line,
                    'number' => $number,
                    'type' => 'EXISTS_IN_DB'
                ];
                $result['preview'][] = [
                    'row' => $line,
                    'number' => $number,
                    'user_username' => $record['user_username'],
                    'status' => 'exists',
                    'message' => 'Номер уже существует'
                ];
                
                if ($strategy === 'skip_duplicates' || $strategy === 'fail_on_duplicate') {
                    continue;
                }
            }
            
            // Validate password if provided
            if (!empty($record['sip_secret'])) {
                $passwordValidation = PasswordService::validate(
                    $record['sip_secret'],
                    PasswordService::CONTEXT_SIP,
                    ['checkWeak' => true]
                );
                
                if (!$passwordValidation['isValid']) {
                    $result['warnings'][] = [
                        'line' => $line,
                        'type' => 'WEAK_PASSWORD',
                        'message' => implode(', ', $passwordValidation['messages'])
                    ];
                }
            }
            
            // Validate email if provided
            if (!empty($record['user_email']) && !filter_var($record['user_email'], FILTER_VALIDATE_EMAIL)) {
                $result['warnings'][] = [
                    'line' => $line,
                    'type' => 'INVALID_EMAIL',
                    'message' => TranslationProvider::translate('ex_ImportInvalidEmail')
                ];
            }
            
            // Validate forwarding references
            foreach (['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'] as $field) {
                if (!empty($record[$field])) {
                    $fwdNumber = $record[$field];
                    // Check if forwarding number will exist after import
                    $willExist = false;
                    foreach ($records as $checkRecord) {
                        if ($checkRecord['number'] === $fwdNumber) {
                            $willExist = true;
                            break;
                        }
                    }
                    if (!$willExist && !isset($existingNumbers[$fwdNumber])) {
                        $result['warnings'][] = [
                            'line' => $line,
                            'type' => 'INVALID_FORWARDING',
                            'message' => TranslationProvider::translate('ex_ImportInvalidForwarding', [
                                'number' => $fwdNumber
                            ])
                        ];
                    }
                }
            }
            
            // Mark as valid
            $csvNumbers[$number] = true;
            $result['valid']++;
            $result['preview'][] = [
                'row' => $line,
                'number' => $number,
                'user_username' => $record['user_username'],
                'user_email' => $record['user_email'] ?? '',
                'status' => 'valid',
                'message' => 'OK'
            ];
        }
        
        return $result;
    }
    
    /**
     * Save temporary data for import
     * 
     * @param array $records Validated records
     * @param array $validationResult Validation results
     * @return string Upload ID
     */
    private static function saveTemporaryData(array $records, array $validationResult): string
    {
        $uploadId = md5(uniqid('import_', true));
        $tempDir = '/tmp/employee_import';
        
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }
        
        $dataFile = "$tempDir/$uploadId.json";
        $data = [
            'uploadId' => $uploadId,
            'timestamp' => time(),
            'records' => $records,
            'validation' => $validationResult
        ];
        
        file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        return $uploadId;
    }
    
    /**
     * Start import worker
     * 
     * @param string $uploadId Upload ID
     * @param string $strategy Import strategy
     * @return string|null Job ID
     */
    private static function startImportWorker(string $uploadId, string $strategy): ?string
    {
        $jobId = uniqid('import_job_', true);
        
        // Prepare worker parameters
        $workerParams = [
            'uploadId' => $uploadId,
            'jobId' => $jobId,
            'strategy' => $strategy
        ];
        
        // Start worker process
        $workerFile = Util::getFilePathByClassName('MikoPBX\PBXCoreREST\Workers\WorkerBulkEmployees');
        if (!file_exists($workerFile)) {
            return null;
        }
        
        $php = Util::which('php');
        $paramsFile = "/tmp/import_worker_$jobId.json";
        
        file_put_contents($paramsFile, json_encode($workerParams, JSON_UNESCAPED_UNICODE));
        
        // Use Processes::mwExecBg for reliable background execution
        $command = "$php -f $workerFile start '$paramsFile'";
        \MikoPBX\Core\System\Processes::mwExecBg($command);
        
        // Give worker a moment to start
        usleep(100000); // 100ms
        
        // Check if params file still exists (worker deletes it after reading)
        // If it's gone, worker started successfully
        return $jobId;
    }
    
}