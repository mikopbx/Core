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

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\Employees\DependencyResolver;
use MikoPBX\PBXCoreREST\Lib\Employees\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\SaveEmployeeAction;

/**
 * Worker for bulk employee import from CSV
 * Processes up to 1000 employees with reliable delays to avoid database locks
 * Sends progress updates via EventBus
 * Uses simple retry logic with 2-second delays on database lock errors
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerBulkEmployees extends WorkerBase
{
    private const int BATCH_SIZE = 3; // Small batch size for reliability
    private const int PROGRESS_INTERVAL = 10; // Send progress every N records
    private const int MAX_ERRORS = 50; // Stop if too many errors
    private const int MAX_RETRIES = 3; // Reasonable retry attempts
    private const int STANDARD_DELAY_MS = 500000; // 500ms standard delay between operations
    private const int RETRY_DELAY_MS = 2000000; // 2 seconds delay on retry
    
    private string $jobId;
    private string $channelId;
    private array $statistics;
    private EventBusProvider $eventBus;
    
    /**
     * Start the worker process
     *
     * @param array $argv Command line arguments
     */
    public function start(array $argv): void
    {
        $paramsFile = $argv[2] ?? '';

        if (!file_exists($paramsFile)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Parameters file not found: ' . $paramsFile, LOG_ERR);
            return;
        }

        $params = json_decode(file_get_contents($paramsFile), true);
        if (!$params) {
            SystemMessages::sysLogMsg(__CLASS__, 'Invalid parameters file: ' . $paramsFile, LOG_ERR);
            return;
        }

        $this->jobId = $params['jobId'] ?? '';
        $this->channelId = "import_progress_{$this->jobId}";
        $uploadId = $params['uploadId'] ?? '';
        $strategy = $params['strategy'] ?? 'skip_duplicates';

        // Initialize EventBus
        $this->eventBus = $this->di->get(EventBusProvider::SERVICE_NAME);
        
        // Initialize statistics
        $this->statistics = [
            'total' => 0,
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'errorDetails' => []
        ];
        
        // Load import data
        $dataFile = "/tmp/employee_import/{$uploadId}.json";
        if (!file_exists($dataFile)) {
            $this->sendError('Import data file not found');
            return;
        }
        
        $importData = json_decode(file_get_contents($dataFile), true);
        if (!$importData) {
            $this->sendError('Invalid import data');
            return;
        }
        
        $records = $importData['records'] ?? [];
        $validation = $importData['validation'] ?? [];

        // Clean up temporary file
        unlink($dataFile);

        // Process import
        $this->processImport($records, $validation, $strategy);
        
        // Clean up parameters file
        unlink($paramsFile);
    }
    
    /**
     * Process the import
     *
     * @param array $records Employee records to import
     * @param array $validation Validation results from preview
     * @param string $strategy Import strategy
     */
    private function processImport(array $records, array $validation, string $strategy): void
    {
        $this->statistics['total'] = count($records);

        // Pre-filter records based on validation results and strategy
        $recordsToProcess = $this->filterRecordsForProcessing($records, $validation, $strategy);
        $recordsToSkip = array_diff_key($records, $recordsToProcess);

        SystemMessages::sysLogMsg(__CLASS__,
            "Strategy: $strategy. Total: " . count($records) .
            ", to process: " . count($recordsToProcess) .
            ", to skip: " . count($recordsToSkip),
            LOG_INFO
        );

        // Update skipped statistics immediately
        $this->statistics['skipped'] += count($recordsToSkip);

        // Send start event FIRST so frontend can subscribe to channel
        $this->sendProgress('import_started', [
            'total' => $this->statistics['total'],
            'toProcess' => count($recordsToProcess),
            'toSkip' => count($recordsToSkip),
            'jobId' => $this->jobId
        ]);

        // Give frontend time to subscribe to EventBus
        usleep(200000); // 200ms delay

        // Send record updates with correct status based on preview validation
        foreach ($recordsToSkip as $record) {
            $this->statistics['processed']++;

            // Find the correct status from validation preview
            $previewStatus = $this->getRecordPreviewStatus($record['number'], $validation);
            $status = $previewStatus['status'] ?? 'skipped';
            $message = $previewStatus['message'] ?? TranslationProvider::translate('ex_ImportStatusSkipped');

            $this->sendRecordProgress($record['number'], $status, $message);
        }

        // If no records to process, finish early
        if (empty($recordsToProcess)) {
            $this->sendProgress('import_completed', [
                'total' => $this->statistics['total'],
                'created' => 0,
                'updated' => 0,
                'skipped' => $this->statistics['skipped'],
                'errors' => 0,
                'errorDetails' => []
            ]);
            return;
        }

        // Resolve dependencies only for records we'll actually process
        SystemMessages::sysLogMsg(__CLASS__, 'Resolving dependencies for ' . count($recordsToProcess) . ' records', LOG_INFO);
        
        $resolver = new DependencyResolver();
        $resolved = $resolver->resolve($recordsToProcess);
        
        $sortedEmployees = $resolved['sortedEmployees'];
        $brokenEdges = $resolved['brokenEdges'];
        $cycles = $resolved['cycles'];
        
        if (!empty($cycles)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Found ' . count($cycles) . ' dependency cycles', LOG_WARNING);
        }
        
        // Process in batches with reliable delays
        $batches = array_chunk($sortedEmployees, self::BATCH_SIZE);
        $totalBatches = count($batches);

        foreach ($batches as $batchIndex => $batch) {
            if ($this->statistics['errors'] >= self::MAX_ERRORS) {
                $this->sendError('Too many errors, stopping import');
                break;
            }

            $this->processBatch($batch, $strategy, $batchIndex + 1, $totalBatches);

            // Standard delay between batches to avoid database contention
            if ($batchIndex < $totalBatches - 1) {
                usleep(self::STANDARD_DELAY_MS); // 500ms between batches
            }

            // Send progress update
            if ($this->statistics['processed'] % self::PROGRESS_INTERVAL === 0 || 
                $this->statistics['processed'] === $this->statistics['total']) {
                $this->sendProgress('import_progress', [
                    'processed' => $this->statistics['processed'],
                    'total' => $this->statistics['total'],
                    'created' => $this->statistics['created'],
                    'updated' => $this->statistics['updated'],
                    'skipped' => $this->statistics['skipped'],
                    'errors' => $this->statistics['errors'],
                    'currentBatch' => $batchIndex + 1,
                    'totalBatches' => $totalBatches
                ]);
            }
        }
        
        // Restore broken edges (circular dependencies)
        if (!empty($brokenEdges)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Restoring ' . count($brokenEdges) . ' broken edges', LOG_INFO);
            $this->restoreBrokenEdges($brokenEdges);
        }
        
        // Send completion event
        $this->sendProgress('import_completed', [
            'total' => $this->statistics['total'],
            'created' => $this->statistics['created'],
            'updated' => $this->statistics['updated'],
            'skipped' => $this->statistics['skipped'],
            'errors' => $this->statistics['errors'],
            'errorDetails' => array_slice($this->statistics['errorDetails'], 0, 100) // Limit error details
        ]);
        
        SystemMessages::sysLogMsg(__CLASS__, 'Import completed: ' . json_encode($this->statistics), LOG_INFO);
    }
    
    /**
     * Filter records based on validation results and strategy
     *
     * @param array $records All employee records
     * @param array $validation Validation results from preview
     * @param string $strategy Import strategy
     * @return array Filtered records to actually process
     */
    private function filterRecordsForProcessing(array $records, array $validation, string $strategy): array
    {
        // If strategy is not skip_duplicates, process all records
        if ($strategy !== 'skip_duplicates') {
            return $records;
        }

        // Build lookup table of records to skip from validation preview
        $skipNumbers = [];
        foreach ($validation['preview'] as $preview) {
            // Skip records marked as duplicate, exists, or error in preview
            if (in_array($preview['status'], ['duplicate', 'exists', 'error'], true)) {
                $skipNumbers[$preview['number']] = true;
            }
        }

        // Filter records - only keep those NOT in skip list
        $filtered = [];
        foreach ($records as $index => $record) {
            $number = $record['number'] ?? '';
            if (!isset($skipNumbers[$number])) {
                $filtered[$index] = $record;
            } else {
                SystemMessages::sysLogMsg(__CLASS__,
                    "Pre-filtering: skipping record {$number} based on preview validation",
                    LOG_DEBUG
                );
            }
        }

        return $filtered;
    }

    /**
     * Get the preview status for a specific record number
     *
     * @param string $number Record number
     * @param array $validation Validation results from preview
     * @return array Status and message from preview
     */
    private function getRecordPreviewStatus(string $number, array $validation): array
    {
        foreach ($validation['preview'] as $preview) {
            if ($preview['number'] === $number) {
                return [
                    'status' => $preview['status'],
                    'message' => $preview['message']
                ];
            }
        }
        return [
            'status' => 'skipped',
            'message' => TranslationProvider::translate('ex_ImportStatusSkipped')
        ];
    }

    /**
     * Update employee if data is different from existing
     *
     * @param array $csvEmployee CSV employee data
     * @param \MikoPBX\Common\Models\Extensions $existingExtension Existing extension
     * @return bool Success status
     */
    private function updateIfDifferent(array $csvEmployee, \MikoPBX\Common\Models\Extensions $existingExtension): bool
    {
        // Get current data from system
        $currentData = $this->getCurrentEmployeeData($existingExtension);

        // Compare with CSV data
        if ($this->dataIsDifferent($csvEmployee, $currentData)) {
            // Data is different - update employee
            $csvEmployee['id'] = $existingExtension->userid;

            SystemMessages::sysLogMsg(__CLASS__,
                "Data differs for employee {$csvEmployee['number']}, updating",
                LOG_INFO);

            // Process update with retry logic
            return $this->processEmployeeUpdate($csvEmployee);
        } else {
            // Data is identical - skip with no_changes status
            $this->statistics['skipped']++;
            $this->sendRecordProgress($csvEmployee['number'], 'no_changes',
                TranslationProvider::translate('ex_ImportStatusNoChanges'));

            SystemMessages::sysLogMsg(__CLASS__,
                "No changes for employee {$csvEmployee['number']}, skipping",
                LOG_INFO);

            return true;
        }
    }

    /**
     * Get current employee data from the system
     *
     * @param \MikoPBX\Common\Models\Extensions $extension Extension entity
     * @return array Current employee data
     */
    private function getCurrentEmployeeData(\MikoPBX\Common\Models\Extensions $extension): array
    {
        $user = $extension->Users;
        $sip = $extension->Sip;
        $forwarding = $extension->ExtensionForwardingRights;

        // Find mobile extension if exists
        $mobileExtension = \MikoPBX\Common\Models\Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = :isgeneral: AND userid = :userid:',
            'bind' => [
                'type' => \MikoPBX\Common\Models\Extensions::TYPE_EXTERNAL,
                'isgeneral' => '1',
                'userid' => $extension->userid
            ]
        ]);

        return [
            'user_username' => $user?->username ?? '',
            'user_email' => $user?->email ?? '',
            'mobile_number' => $mobileExtension?->number ?? '',
            'mobile_dialstring' => $mobileExtension?->ExternalPhones?->dialstring ?? '',
            'sip_secret' => $sip?->secret ?? '',
            'sip_dtmfmode' => $sip?->dtmfmode ?? '',
            'sip_transport' => $sip?->transport ?? '',
            'sip_enableRecording' => $sip?->enableRecording ?? '0',
            'sip_networkfilterid' => $sip?->networkfilterid ?? '',
            'sip_manualattributes' => $sip?->manualattributes ?? '',
            'fwd_forwarding' => $forwarding?->forwarding ?? '',
            'fwd_forwardingonbusy' => $forwarding?->forwardingonbusy ?? '',
            'fwd_forwardingonunavailable' => $forwarding?->forwardingonunavailable ?? '',
            'fwd_ringlength' => $forwarding?->ringlength ?? 0,
        ];
    }

    /**
     * Compare CSV data with current system data
     *
     * @param array $csvData CSV employee data
     * @param array $currentData Current system data
     * @return bool True if data is different
     */
    private function dataIsDifferent(array $csvData, array $currentData): bool
    {
        // Fields to compare (excluding internal fields)
        $fieldsToCompare = [
            'user_username', 'user_email', 'mobile_number', 'mobile_dialstring',
            'sip_secret', 'sip_dtmfmode', 'sip_transport', 'sip_enableRecording',
            'sip_networkfilterid', 'sip_manualattributes',
            'fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable',
            'fwd_ringlength'
        ];

        foreach ($fieldsToCompare as $field) {
            $csvValue = trim((string)($csvData[$field] ?? ''));
            $currentValue = trim((string)($currentData[$field] ?? ''));

            // Special handling for boolean fields
            if ($field === 'sip_enableRecording') {
                $csvValue = $csvValue ? '1' : '0';
                $currentValue = $currentValue ? '1' : '0';
            }

            // Special handling for numeric fields
            if ($field === 'fwd_ringlength') {
                $csvValue = (string)(int)$csvValue;
                $currentValue = (string)(int)$currentValue;
            }

            if ($csvValue !== $currentValue) {
                SystemMessages::sysLogMsg(__CLASS__,
                    "Field {$field} differs: CSV='{$csvValue}' vs Current='{$currentValue}'",
                    LOG_DEBUG);
                return true;
            }
        }

        return false; // All fields are identical
    }

    /**
     * Process employee update with retry logic
     *
     * @param array $employeeData Employee data for update
     * @return bool Success status
     */
    private function processEmployeeUpdate(array $employeeData): bool
    {
        $saved = false;
        $lastError = 'Unknown error';

        // Simple retry logic with fixed delays
        for ($retry = 0; $retry <= self::MAX_RETRIES; $retry++) {
            if ($retry > 0) {
                SystemMessages::sysLogMsg(__CLASS__,
                    "Retry {$retry}/" . self::MAX_RETRIES . " for employee {$employeeData['number']}",
                    LOG_DEBUG);
                usleep(self::RETRY_DELAY_MS); // 2 seconds
            }

            // Try to save employee
            $result = SaveEmployeeAction::main($employeeData);

            if ($result->success) {
                $this->statistics['updated']++;
                $this->sendRecordProgress($employeeData['number'], 'updated',
                    TranslationProvider::translate('ex_ImportStatusUpdated'));

                SystemMessages::sysLogMsg(__CLASS__,
                    "Successfully updated employee {$employeeData['number']}",
                    LOG_INFO);

                $saved = true;
                break;
            }

            // Check if it's a database lock error
            $errors = $result->messages['error'] ?? [];
            $hasDbLockError = false;

            foreach ($errors as $error) {
                if (is_array($error)) {
                    $error = implode(', ', $error);
                }
                if (str_contains($error, 'database is locked') || str_contains($error, 'database table is locked')) {
                    $hasDbLockError = true;
                    $lastError = $error;
                    break;
                }
            }

            // If not a database lock, don't retry
            if (!$hasDbLockError) {
                $lastError = is_array($errors) ? implode(', ', $errors) : (string)$errors;
                SystemMessages::sysLogMsg(__CLASS__,
                    "Validation error for employee {$employeeData['number']}: $lastError",
                    LOG_WARNING);
                break;
            }
        }

        // Handle failure
        if (!$saved) {
            $this->statistics['errors']++;
            $this->statistics['errorDetails'][] = [
                'number' => $employeeData['number'],
                'error' => $lastError
            ];

            $this->sendRecordProgress($employeeData['number'], 'error', $lastError);

            SystemMessages::sysLogMsg(__CLASS__,
                "Failed to update employee {$employeeData['number']}: $lastError",
                LOG_ERR);
        }

        return $saved;
    }

    /**
     * Process a batch of employees with simple, reliable approach
     *
     * @param array $batch Batch of employee records
     * @param string $strategy Import strategy
     * @param int $batchNumber Current batch number
     * @param int $totalBatches Total number of batches
     */
    private function processBatch(array $batch, string $strategy, int $batchNumber, int $totalBatches): void
    {
        SystemMessages::sysLogMsg(__CLASS__, "Processing batch $batchNumber of $totalBatches with " . count($batch) . " records", LOG_INFO);

        // Simple approach: process each employee individually with delays
        foreach ($batch as $index => $employee) {
            $this->statistics['processed']++;

            // Add delay between employees to reduce database contention
            if ($index > 0) {
                usleep(self::STANDARD_DELAY_MS); // 500ms between employees
            }

            // Process with retries
            $this->processOneEmployee($employee, $strategy);

            // Send progress update periodically
            if ($this->statistics['processed'] % 5 === 0) {
                $this->sendProgress('import_progress', [
                    'processed' => $this->statistics['processed'],
                    'total' => $this->statistics['total'],
                    'created' => $this->statistics['created'],
                    'updated' => $this->statistics['updated'],
                    'skipped' => $this->statistics['skipped'],
                    'errors' => $this->statistics['errors']
                ]);
            }
        }
    }


    /**
     * Process single employee with simple retry logic
     *
     * @param array $employee Employee data
     * @param string $strategy Import strategy (skip_duplicates, overwrite, fail_on_duplicate)
     * @return bool True if saved successfully
     */
    private function processOneEmployee(array $employee, string $strategy): bool
    {
        // Prepare single employee data
        $employeeData = $employee;
        unset($employeeData['_line']);

        // Check for existing employee by internal number
        $existingExtension = \MikoPBX\Common\Models\Extensions::findFirst([
            'conditions' => 'number = :number: AND type = :type: AND is_general_user_number = :isgeneral:',
            'bind' => [
                'number' => $employee['number'],
                'type' => \MikoPBX\Common\Models\Extensions::TYPE_SIP,
                'isgeneral' => '1'
            ]
        ]);

        // Handle different strategies
        if ($existingExtension) {
            switch ($strategy) {
                case 'skip_existing':
                    // Skip existing employees completely
                    $this->statistics['skipped']++;
                    $this->sendRecordProgress($employee['number'], 'skipped',
                        TranslationProvider::translate('ex_ImportStatusSkipped'));
                    SystemMessages::sysLogMsg(__CLASS__,
                        "Skipped existing employee {$employee['number']} (skip_existing strategy)",
                        LOG_INFO);
                    return true;

                case 'update_different':
                    // Check if data is different and update if needed
                    return $this->updateIfDifferent($employee, $existingExtension);

                case 'skip_duplicates':
                    // Legacy strategy - skip (should be pre-filtered already)
                    $this->statistics['skipped']++;
                    $this->sendRecordProgress($employee['number'], 'skipped',
                        TranslationProvider::translate('ex_ImportStatusSkipped'));
                    return true;

                case 'overwrite':
                    // Legacy strategy - overwrite existing
                    $userId = $existingExtension->userid;
                    if ($userId) {
                        $employeeData['id'] = $userId;
                        SystemMessages::sysLogMsg(__CLASS__,
                            "Will update existing employee {$employee['number']} with user ID {$userId}",
                            LOG_INFO);
                    }
                    break;
            }
        }

        // If we reach here, employee doesn't exist or needs to be created/updated
        if (!empty($employeeData['id'])) {
            // Update existing employee (legacy overwrite strategy)
            return $this->processEmployeeUpdate($employeeData);
        } else {
            // Create new employee
            return $this->processEmployeeCreation($employeeData);
        }
    }

    /**
     * Process employee creation with retry logic
     *
     * @param array $employeeData Employee data for creation
     * @return bool Success status
     */
    private function processEmployeeCreation(array $employeeData): bool
    {
        $saved = false;
        $lastError = 'Unknown error';

        // Simple retry logic with fixed delays
        for ($retry = 0; $retry <= self::MAX_RETRIES; $retry++) {
            if ($retry > 0) {
                SystemMessages::sysLogMsg(__CLASS__,
                    "Retry {$retry}/" . self::MAX_RETRIES . " for employee {$employeeData['number']}",
                    LOG_DEBUG);
                usleep(self::RETRY_DELAY_MS); // 2 seconds
            }

            // Try to save employee
            $result = SaveEmployeeAction::main($employeeData);

            if ($result->success) {
                $this->statistics['created']++;
                $this->sendRecordProgress($employeeData['number'], 'created',
                    TranslationProvider::translate('ex_ImportStatusCreated'));

                SystemMessages::sysLogMsg(__CLASS__,
                    "Successfully created employee {$employeeData['number']}",
                    LOG_INFO);

                $saved = true;
                break;
            }

            // Check if it's a database lock error
            $errors = $result->messages['error'] ?? [];
            $hasDbLockError = false;

            foreach ($errors as $error) {
                if (is_array($error)) {
                    $error = implode(', ', $error);
                }
                if (str_contains($error, 'database is locked') || str_contains($error, 'database table is locked')) {
                    $hasDbLockError = true;
                    $lastError = $error;
                    break;
                }
            }

            // If not a database lock, don't retry
            if (!$hasDbLockError) {
                $lastError = is_array($errors) ? implode(', ', $errors) : (string)$errors;
                SystemMessages::sysLogMsg(__CLASS__,
                    "Validation error for employee {$employeeData['number']}: $lastError",
                    LOG_WARNING);
                break;
            }
        }

        // Handle failure
        if (!$saved) {
            $this->statistics['errors']++;
            $this->statistics['errorDetails'][] = [
                'number' => $employeeData['number'],
                'error' => $lastError
            ];

            $this->sendRecordProgress($employeeData['number'], 'error', $lastError);

            SystemMessages::sysLogMsg(__CLASS__,
                "Failed to create employee {$employeeData['number']}: $lastError",
                LOG_ERR);
        }

        return $saved;
    }

    /**
     * Restore broken edges (circular dependencies)
     * 
     * @param array $brokenEdges Edges to restore
     */
    private function restoreBrokenEdges(array $brokenEdges): void
    {
        foreach ($brokenEdges as $edge) {
            $patchData = [
                'id' => '', // Will be looked up by number
                'number' => $edge['number'],
                $edge['field'] => $edge['value']
            ];
            
            // Use PatchRecordAction to update forwarding
            $result = PatchRecordAction::main($patchData);
            
            if (!$result->success) {
                SystemMessages::sysLogMsg(
                    __CLASS__, 
                    "Failed to restore edge for {$edge['number']}: " . json_encode($result->messages), 
                    LOG_WARNING
                );
            }
        }
    }

    /**
     * Format import error message with proper translation and placeholders
     *
     * @param array $record Employee record
     * @param array $errors Array of error messages
     * @return string Formatted error message
     */
    private function formatImportErrorMessage(array $record, array $errors): string
    {
        // Build employee identifier with proper translation
        $line = $record['_line'] ?? '';
        $number = $record['number'] ?? '';
        $name = $record['user_username'] ?? '';
        $mobile = $record['mobile_number'] ?? '';

        // Choose appropriate template - simplified logic
        if (!empty($name)) {
            if (!empty($mobile)) {
                $prefix = TranslationProvider::translate('ex_ImportErrorEmployeeWithMobile', [
                    'line' => $line,
                    'name' => $name,
                    'number' => $number,
                    'mobile' => $mobile
                ]);
            } else {
                $prefix = TranslationProvider::translate('ex_ImportErrorEmployee', [
                    'line' => $line,
                    'name' => $name,
                    'number' => $number
                ]);
            }
        } else {
            $prefix = TranslationProvider::translate('ex_ImportErrorBasic', [
                'line' => $line,
                'number' => $number
            ]);
        }

        // Process error messages and improve them
        $processedErrors = array_map(function($error) {
            // Replace generic mobile number error with cleaner one
            if (str_contains($error, 'Мобильный номер уже используется другим сотрудником')) {
                return TranslationProvider::translate('ex_MobileNumberAlreadyUsed');
            }
            return $error;
        }, $errors);

        return $prefix . ' - ' . implode(', ', $processedErrors);
    }

    /**
     * Send progress update via EventBus
     * 
     * @param string $type Event type
     * @param array $data Event data
     */
    private function sendProgress(string $type, array $data): void
    {
        try {
            $this->eventBus->publish($this->channelId, [
                'type' => $type,
                'data' => $data,
                'timestamp' => time()
            ]);
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Failed to send progress: ' . $e->getMessage(), LOG_ERR);
        }
    }
    
    /**
     * Send individual record progress
     *
     * @param string $number Employee number
     * @param string $status Record status (created, updated, skipped, error)
     * @param string $message Status message
     */
    private function sendRecordProgress(string $number, string $status, string $message): void
    {
        $this->sendProgress('import_progress', [
            'processed' => $this->statistics['processed'],
            'total' => $this->statistics['total'],
            'created' => $this->statistics['created'],
            'updated' => $this->statistics['updated'],
            'skipped' => $this->statistics['skipped'],
            'errors' => $this->statistics['errors'],
            'currentRecord' => [
                'number' => $number,
                'status' => $status,
                'message' => $message
            ]
        ]);
    }

    /**
     * Send error message
     *
     * @param string $message Error message
     */
    private function sendError(string $message): void
    {
        SystemMessages::sysLogMsg(__CLASS__, $message, LOG_ERR);

        $this->sendProgress('import_error', [
            'message' => $message,
            'jobId' => $this->jobId
        ]);
    }
}

// Start the worker
WorkerBulkEmployees::startWorker($argv ?? []);