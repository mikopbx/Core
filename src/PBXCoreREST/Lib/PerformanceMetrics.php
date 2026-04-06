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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\SystemMessages;

/**
 * Class PerformanceMetrics
 * 
 * Handles performance metrics collection and logging for API requests
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class PerformanceMetrics
{
    /**
     * Threshold in seconds for logging long-running requests
     */
    private const LONG_RUNNING_THRESHOLD = 0.5;
    
    /**
     * Performance metrics data
     */
    private array $metrics = [];
    
    /**
     * Job identifier
     */
    private string $jobId;
    
    /**
     * Request action
     */
    private string $action;
    
    /**
     * Request processor
     */
    private string $processor;
    
    /**
     * Constructor
     * 
     * @param string $jobId Job identifier
     * @param array $request Request data
     */
    public function __construct(string $jobId, array $request)
    {
        $this->jobId = $jobId;
        $this->action = $request['action'] ?? 'unknown';
        $this->processor = $request['processor'] ?? 'unknown';
        
        $this->metrics = [
            'request_received_at' => microtime(true),
            'processing_stages' => [],
            'job_id' => $jobId,
            'action' => $this->action,
            'processor' => $this->processor,
            'pid' => getmypid()
        ];
    }
    
    /**
     * Start measuring a processing stage
     * 
     * @param string $stageName Name of the stage
     */
    public function startStage(string $stageName): void
    {
        $this->metrics['processing_stages'][$stageName] = [
            'start' => microtime(true)
        ];
    }
    
    /**
     * End measuring a processing stage
     * 
     * @param string $stageName Name of the stage
     */
    public function endStage(string $stageName): void
    {
        if (!isset($this->metrics['processing_stages'][$stageName])) {
            return;
        }
        
        $stage = &$this->metrics['processing_stages'][$stageName];
        $stage['end'] = microtime(true);
        $stage['duration'] = $stage['end'] - $stage['start'];
    }
    
    /**
     * Get stage duration
     * 
     * @param string $stageName Name of the stage
     * @return float Duration in seconds
     */
    public function getStageDuration(string $stageName): float
    {
        return $this->metrics['processing_stages'][$stageName]['duration'] ?? 0.0;
    }
    
    /**
     * Finalize metrics collection
     */
    public function finalize(): void
    {
        $this->metrics['request_completed_at'] = microtime(true);
        $this->metrics['total_processing_time'] = 
            $this->metrics['request_completed_at'] - $this->metrics['request_received_at'];
    }
    
    /**
     * Get total processing time
     * 
     * @return float Total time in seconds
     */
    public function getTotalTime(): float
    {
        return $this->metrics['total_processing_time'] ?? 0.0;
    }
    
    /**
     * Get all metrics data
     * 
     * @return array Metrics data
     */
    public function getMetrics(): array
    {
        return $this->metrics;
    }
    
    /**
     * Log preparation stage completion
     * 
     * @param string $processor Processor class name
     */
    public function logPreparationComplete(string $processor): void
    {
        SystemMessages::sysLogMsg(
            self::class,
            sprintf(
                "Job %s using processor: %s (prepare: %.3fs, PID: %d)",
                $this->jobId,
                $processor,
                $this->getStageDuration('prepare'),
                getmypid()
            ),
            LOG_DEBUG
        );
    }
    
    /**
     * Log execution stage completion
     * 
     * @param string $processor Processor class name
     */
    public function logExecutionComplete(string $processor): void
    {
        SystemMessages::sysLogMsg(
            self::class,
            sprintf(
                "Job %s execution completed: %s::%s (execution: %.3fs, PID: %d)",
                $this->jobId,
                $processor,
                $this->action,
                $this->getStageDuration('execution'),
                getmypid()
            ),
            LOG_INFO
        );
    }
    
    /**
     * Log job completion with metrics
     * 
     * @param bool $success Whether the job completed successfully
     */
    public function logJobCompletion(bool $success): void
    {
        SystemMessages::sysLogMsg(
            self::class,
            sprintf(
                "Job %s completed: action=%s, total=%.3fs, success=%s, PID=%d",
                $this->jobId,
                $this->action,
                $this->getTotalTime(),
                $success ? 'true' : 'false',
                getmypid()
            ),
            $success ? LOG_INFO : LOG_WARNING
        );
        
        // Log long-running requests
        if ($this->getTotalTime() > self::LONG_RUNNING_THRESHOLD) {
            $this->logLongRunningRequest();
        }
    }
    
    /**
     * Log information about long-running requests
     */
    private function logLongRunningRequest(): void
    {
        SystemMessages::sysLogMsg(
            self::class,
            sprintf(
                "Long-running request: %s (%.3fs) - execution: %.3fs, response prep: %.3fs, PID: %d",
                $this->action,
                $this->getTotalTime(),
                $this->getStageDuration('execution'),
                $this->getStageDuration('response_preparation'),
                getmypid()
            ),
            LOG_NOTICE
        );
    }
}