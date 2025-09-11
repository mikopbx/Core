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
use MikoPBX\PBXCoreREST\Lib\Employees\BatchCreateAction;
use MikoPBX\PBXCoreREST\Lib\Employees\DependencyResolver;
use MikoPBX\PBXCoreREST\Lib\Employees\PatchRecordAction;

/**
 * Worker for bulk employee import from CSV
 * Processes up to 1000 employees in batches of 20
 * Sends progress updates via EventBus
 * 
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerBulkEmployees extends WorkerBase
{
    private const int BATCH_SIZE = 20;
    private const int PROGRESS_INTERVAL = 10; // Send progress every N records
    private const int MAX_ERRORS = 50; // Stop if too many errors
    
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
        $this->processImport($records, $strategy);
        
        // Clean up parameters file
        unlink($paramsFile);
    }
    
    /**
     * Process the import
     * 
     * @param array $records Employee records to import
     * @param string $strategy Import strategy
     */
    private function processImport(array $records, string $strategy): void
    {
        $this->statistics['total'] = count($records);
        
        // Send start event
        $this->sendProgress('import_started', [
            'total' => $this->statistics['total'],
            'jobId' => $this->jobId
        ]);
        
        // Resolve dependencies
        SystemMessages::sysLogMsg(__CLASS__, 'Resolving dependencies for ' . count($records) . ' records', LOG_INFO);
        
        $resolver = new DependencyResolver();
        $resolved = $resolver->resolve($records);
        
        $sortedEmployees = $resolved['sortedEmployees'];
        $brokenEdges = $resolved['brokenEdges'];
        $cycles = $resolved['cycles'];
        
        if (!empty($cycles)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Found ' . count($cycles) . ' dependency cycles', LOG_WARNING);
        }
        
        // Process in batches
        $batches = array_chunk($sortedEmployees, self::BATCH_SIZE);
        $totalBatches = count($batches);
        
        foreach ($batches as $batchIndex => $batch) {
            if ($this->statistics['errors'] >= self::MAX_ERRORS) {
                $this->sendError('Too many errors, stopping import');
                break;
            }
            
            $this->processBatch($batch, $strategy, $batchIndex + 1, $totalBatches);
            
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
     * Process a batch of employees
     * 
     * @param array $batch Batch of employee records
     * @param string $strategy Import strategy
     * @param int $batchNumber Current batch number
     * @param int $totalBatches Total number of batches
     */
    private function processBatch(array $batch, string $strategy, int $batchNumber, int $totalBatches): void
    {
        SystemMessages::sysLogMsg(__CLASS__, "Processing batch $batchNumber of $totalBatches", LOG_DEBUG);
        
        // Prepare batch for BatchCreateAction
        $batchData = [
            'mode' => 'create',
            'skip_errors' => true,
            'employees' => []
        ];
        
        foreach ($batch as $employee) {
            // Remove internal fields
            unset($employee['_line']);
            
            // Add to batch
            $batchData['employees'][] = $employee;
        }
        
        // Call BatchCreateAction
        $result = BatchCreateAction::main($batchData);
        
        if ($result->success || !empty($result->data['results'])) {
            $results = $result->data['results'] ?? [];
            
            foreach ($results as $recordResult) {
                $this->statistics['processed']++;
                
                switch ($recordResult['status']) {
                    case 'created':
                        $this->statistics['created']++;
                        break;
                        
                    case 'validation_failed':
                    case 'create_failed':
                        $this->statistics['errors']++;
                        $this->statistics['errorDetails'][] = [
                            'line' => $batch[$recordResult['index']]['_line'] ?? $recordResult['index'],
                            'number' => $batch[$recordResult['index']]['number'] ?? '',
                            'errors' => $recordResult['errors'] ?? ['Unknown error']
                        ];
                        break;
                        
                    default:
                        $this->statistics['skipped']++;
                        break;
                }
            }
        } else {
            // Batch failed completely
            $this->statistics['errors'] += count($batch);
            $this->statistics['processed'] += count($batch);
            
            SystemMessages::sysLogMsg(__CLASS__, 'Batch failed: ' . json_encode($result->messages), LOG_ERR);
        }
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