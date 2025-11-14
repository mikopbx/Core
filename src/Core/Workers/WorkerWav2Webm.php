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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Core\System\{Directories, Processes, SystemMessages, Util};
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Throwable;

/**
 * WorkerWav2Webm - Background worker for converting WAV recordings to WebM/Opus format
 *
 * This worker implements a task-based conversion system with native PHP implementation:
 * 1. Scans for JSON task files created by WorkerCDR in conversion-tasks directory
 * 2. Processes conversions using ffmpeg directly (no shell scripts)
 * 3. Implements retry logic with attempt counter (max 3 attempts)
 * 4. Deletes task file on success, renames to .failed.json after max attempts
 *
 * Benefits:
 * - System restart resilience (unprocessed tasks remain in queue)
 * - Retry logic for failed conversions
 * - Independent scaling (runs on different interval than CDR processing)
 * - Better error tracking (failed task files can be analyzed)
 * - Lowest CPU priority to avoid impacting call processing
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerWav2Webm extends WorkerBase
{
    /**
     * Maximum number of conversion attempts before giving up
     */
    private const int MAX_ATTEMPTS = 3;

    /**
     * Delay between retry attempts in seconds (5 minutes)
     */
    private const int RETRY_DELAY_SECONDS = 300;

    /**
     * Opus bitrate for 8kHz audio (G.711 codec)
     */
    private const string OPUS_BITRATE_8K = '48k';

    /**
     * Opus bitrate for 16kHz+ audio (G.722+ codecs)
     */
    private const string OPUS_BITRATE_16K = '64k';

    /**
     * FFmpeg main conversion timeout in seconds (5 minutes for long recordings)
     */
    private const int FFMPEG_TIMEOUT = 300;

    /**
     * FFmpeg stereo merge timeout in seconds (2 minutes should be enough)
     */
    private const int FFMPEG_MERGE_TIMEOUT = 120;

    /**
     * Grace period before sending SIGKILL after SIGTERM (seconds)
     */
    private const int FFMPEG_KILL_GRACE = 10;

    /**
     * Check interval for supervisor monitoring (seconds)
     *
     * @return int Interval for WorkerSafeScriptsCore to check this worker
     */
    public static function getCheckInterval(): int
    {
        return 5; // Check every 5 seconds for fast processing
    }

    /**
     * Start worker and process conversion tasks
     *
     * Main loop:
     * 1. Set lowest CPU priority to avoid impacting call processing
     * 2. Scan for JSON task files in conversion-tasks directory
     * 3. Process each task with file locking to prevent race conditions
     * 4. Execute ffmpeg conversion with metadata
     * 5. Handle success (delete task) or failure (retry or mark as failed)
     * 6. Sleep and repeat
     *
     * @param array<int, string> $argv Command-line arguments
     * @return void
     */
    public function start(array $argv): void
    {
        // Set lowest CPU priority for this worker process
        if (function_exists('proc_nice')) {
            proc_nice(19); // Lowest priority (nice +19)
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Worker started with lowest CPU priority (PID:%d)', getmypid()),
                LOG_NOTICE
            );
        } else {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Worker started (PID:%d) - proc_nice not available', getmypid()),
                LOG_NOTICE
            );
        }

        // Ensure task directory exists
        $this->ensureTaskDirectoryExists();

        // Main processing loop
        while ($this->needRestart === false) {
            pcntl_signal_dispatch();

            try {
                $this->processConversionTasks();
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Error in main loop: %s', $e->getMessage()),
                    LOG_ERR
                );
            }

            sleep(5); // Wait 5 seconds between iterations
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Worker stopped (PID:%d)', getmypid()),
            LOG_NOTICE
        );
    }

    /**
     * Ensure conversion tasks directory exists
     *
     * @return void
     */
    private function ensureTaskDirectoryExists(): void
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $tasksDir = $monitorDir . '/conversion-tasks';

        if (!is_dir($tasksDir)) {
            Util::mwMkdir($tasksDir, true);
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Created tasks directory: %s', $tasksDir),
                LOG_INFO
            );
        }
    }

    /**
     * Process all pending conversion tasks
     *
     * @return void
     */
    private function processConversionTasks(): void
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $tasksDir = $monitorDir . '/conversion-tasks';

        if (!is_dir($tasksDir)) {
            return;
        }

        // Find all JSON task files
        $taskFiles = $this->findTaskFiles($tasksDir);

        foreach ($taskFiles as $taskFile) {
            if ($this->needRestart) {
                break; // Graceful shutdown requested
            }

            $this->processTaskFile($taskFile);
        }
    }

    /**
     * Find all JSON task files recursively
     *
     * @param string $directory Directory to scan
     * @return array<int, string> Array of task file paths
     */
    private function findTaskFiles(string $directory): array
    {
        $taskFiles = [];

        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($iterator as $file) {
                if ($file->isFile() && strtolower($file->getExtension()) === 'json') {
                    $taskFiles[] = $file->getPathname();
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Error scanning directory %s: %s', $directory, $e->getMessage()),
                LOG_ERR
            );
        }

        return $taskFiles;
    }

    /**
     * Process a single task file
     *
     * @param string $taskFile Path to task file
     * @return void
     */
    private function processTaskFile(string $taskFile): void
    {
        // Try to open file with exclusive lock
        $fp = fopen($taskFile, 'r+');
        if (!$fp) {
            return; // Skip if can't open
        }

        // Try to get exclusive lock (non-blocking)
        if (!flock($fp, LOCK_EX | LOCK_NB)) {
            fclose($fp);
            return; // Another worker is processing this
        }

        try {
            // Read and parse task data
            $contents = stream_get_contents($fp);
            if ($contents === false) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Failed to read task file: %s', basename($taskFile)),
                    LOG_ERR
                );
                flock($fp, LOCK_UN);
                fclose($fp);
                return;
            }
            try {
                $taskData = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Invalid JSON in task file %s: %s', basename($taskFile), $e->getMessage()),
                    LOG_ERR
                );
                flock($fp, LOCK_UN);
                fclose($fp);
                return;
            }

            if (!is_array($taskData)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Invalid JSON structure in task file: %s', basename($taskFile)),
                    LOG_ERR
                );
                flock($fp, LOCK_UN);
                fclose($fp);
                return;
            }

            // Check if we should retry this task
            if (!$this->shouldRetryTask($taskData)) {
                flock($fp, LOCK_UN);
                fclose($fp);
                return;
            }

            // Process the conversion
            $exitCode = $this->executeConversion($taskData);

            if ($exitCode === 0) {
                // Success - delete task file
                flock($fp, LOCK_UN);
                fclose($fp);
                unlink($taskFile);

                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Successfully converted: %s', basename($taskData['input_path'] ?? 'unknown')),
                    LOG_INFO
                );
            } else {
                // Failure - handle retry or mark as failed
                $this->handleFailedTask($taskFile, $taskData, $exitCode, $fp);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Error processing task %s: %s', basename($taskFile), $e->getMessage()),
                LOG_ERR
            );
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    /**
     * Check if task should be retried
     *
     * @param array<string, mixed> $taskData Task data
     * @return bool True if task should be processed
     */
    private function shouldRetryTask(array $taskData): bool
    {
        $attempts = $taskData['attempts'] ?? 0;

        if ($attempts >= self::MAX_ATTEMPTS) {
            return false; // Already exceeded max attempts
        }

        // Check if enough time has passed since last attempt
        $lastAttempt = $taskData['last_attempt_at'] ?? 0;
        if ($lastAttempt > 0 && (time() - $lastAttempt) < self::RETRY_DELAY_SECONDS) {
            return false; // Too soon to retry
        }

        return true;
    }

    /**
     * Execute WAV to WebM/Opus conversion with metadata
     *
     * @param array<string, mixed> $taskData Task data with conversion parameters
     * @return int Exit code (0=success, 1=file not found, 2=ffmpeg missing, 3=conversion failed, 4=stereo merge failed, 5=validation failed)
     */
    private function executeConversion(array $taskData): int
    {
        $inputPath = $taskData['input_path'] ?? '';
        if (empty($inputPath)) {
            return 1; // File not found
        }

        // Check ffmpeg availability
        $ffmpeg = Util::which('ffmpeg');
        $ffprobe = Util::which('ffprobe');

        if (empty($ffmpeg)) {
            SystemMessages::sysLogMsg(__CLASS__, 'ffmpeg not found', LOG_ERR);
            return 2;
        }

        // Build file paths
        $srcFile = $inputPath . '.wav';
        $srcIn = $inputPath . '_in.wav';
        $srcOut = $inputPath . '_out.wav';
        $dstFile = $inputPath . '.webm';
        $tempMerged = '/tmp/merged_' . getmypid() . '.wav';

        // Step 1: Check if we need to merge stereo files
        $needsMerge = false;
        if (file_exists($srcIn) && file_exists($srcOut) && file_exists($srcFile)) {
            // Check if stereo files are actually different from main file
            $mainSize = filesize($srcFile);
            $inSize = filesize($srcIn);
            $outSize = filesize($srcOut);

            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Stereo check: main=%d, in=%d, out=%d bytes for %s',
                    $mainSize, $inSize, $outSize, basename($inputPath)),
                LOG_DEBUG
            );

            // If all files have same size, they're likely identical mono recordings
            // Use main file instead of merging
            if ($mainSize === $inSize && $mainSize === $outSize) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Stereo files identical to main file (mono recording), using main: %s',
                        basename($inputPath)),
                    LOG_INFO
                );
                $needsMerge = false;
            } else {
                $needsMerge = true;
            }
        }

        // Merge stereo files if needed
        if ($needsMerge) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Merging stereo files for: %s', basename($inputPath)),
                LOG_INFO
            );

            $mergeResult = $this->mergeStereoFiles($ffmpeg, $srcOut, $srcIn, $tempMerged);
            if ($mergeResult === 0) {
                $srcFile = $tempMerged;
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Stereo merge successful: %s', basename($inputPath)),
                    LOG_INFO
                );
            } else {
                @unlink($tempMerged);

                // Check if timeout occurred
                // BusyBox timeout: 143=SIGTERM, 137=SIGKILL
                // GNU timeout: 124=SIGTERM, 137=SIGKILL
                if ($mergeResult === 143 || $mergeResult === 124 || $mergeResult === 137) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        sprintf('Stereo merge TIMEOUT (exit code %d, timeout=%ds): %s',
                            $mergeResult, self::FFMPEG_MERGE_TIMEOUT, basename($inputPath)),
                        LOG_ERR
                    );
                } else {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        sprintf('Stereo merge failed (exit code %d): %s', $mergeResult, basename($inputPath)),
                        LOG_ERR
                    );
                }
                return 4; // Stereo merge failed
            }
        } elseif (!file_exists($srcFile)) {
            return 1; // Source file not found
        }

        // Step 2: Detect sample rate
        $sampleRate = $this->detectSampleRate($ffprobe, $srcFile);
        if ($sampleRate === 0) {
            @unlink($tempMerged);
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Failed to detect sample rate: %s', basename($inputPath)),
                LOG_ERR
            );
            return 3; // Failed to detect sample rate
        }

        // Step 3: Select Opus bitrate based on sample rate
        $opusBitrate = ($sampleRate <= 8000) ? self::OPUS_BITRATE_8K : self::OPUS_BITRATE_16K;

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Converting %s: sample_rate=%dHz, bitrate=%s',
                basename($inputPath), $sampleRate, $opusBitrate),
            LOG_INFO
        );

        // Step 4: Build and execute ffmpeg command
        $command = $this->buildFfmpegCommand($ffmpeg, $srcFile, $dstFile, $opusBitrate, $taskData);

        $output = [];
        $exitCode = 0;
        Processes::mwExec($command, $output, $exitCode);

        // Clean up temporary files
        if (file_exists($tempMerged)) {
            @unlink($tempMerged);
        }

        if ($exitCode !== 0) {
            // Check if timeout occurred
            // BusyBox timeout: 143=SIGTERM, 137=SIGKILL
            // GNU timeout: 124=SIGTERM, 137=SIGKILL
            if ($exitCode === 143 || $exitCode === 124 || $exitCode === 137) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Conversion TIMEOUT (exit code %d, timeout=%ds): %s',
                        $exitCode, self::FFMPEG_TIMEOUT, basename($inputPath)),
                    LOG_ERR
                );
            } else {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Conversion failed (exit code %d): %s', $exitCode, basename($inputPath)),
                    LOG_WARNING
                );
            }
            return 3; // Conversion failed
        }

        // Step 5: Validate output
        if (!$this->validateOutput($ffprobe, $dstFile)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Output validation failed: %s', basename($inputPath)),
                LOG_ERR
            );
            return 5; // Validation failed
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Conversion completed successfully: %s -> %s',
                basename($inputPath) . '.wav', basename($dstFile)),
            LOG_INFO
        );

        // Step 6: Cleanup source files if requested
        $deleteSource = ($taskData['delete_source'] ?? '0') === '1';
        if ($deleteSource) {
            @unlink($inputPath . '.wav');
            @unlink($inputPath . '_in.wav');
            @unlink($inputPath . '_out.wav');
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Source files deleted: %s', basename($inputPath)),
                LOG_DEBUG
            );
        }

        return 0; // Success
    }

    /**
     * Merge stereo split files (_in.wav and _out.wav) into single file
     *
     * @param string $ffmpeg Path to ffmpeg binary
     * @param string $srcOut External channel file
     * @param string $srcIn Internal channel file
     * @param string $output Output merged file
     * @return int Exit code (0=success, non-zero=failure)
     */
    private function mergeStereoFiles(string $ffmpeg, string $srcOut, string $srcIn, string $output): int
    {
        $command = sprintf(
            'timeout -k %d -s TERM %d %s -i %s -i %s -filter_complex "[0:a][1:a]amerge=inputs=2[a]" -map "[a]" -y %s 2>&1',
            self::FFMPEG_KILL_GRACE,
            self::FFMPEG_MERGE_TIMEOUT,
            $ffmpeg,
            escapeshellarg($srcOut),
            escapeshellarg($srcIn),
            escapeshellarg($output)
        );

        $result = [];
        $exitCode = 0;
        Processes::mwExec($command, $result, $exitCode);

        return $exitCode;
    }

    /**
     * Detect audio sample rate using ffprobe
     *
     * @param string $ffprobe Path to ffprobe binary
     * @param string $file Audio file path
     * @return int Sample rate in Hz (0 if detection failed)
     */
    private function detectSampleRate(string $ffprobe, string $file): int
    {
        if (empty($ffprobe)) {
            return 8000; // Default fallback
        }

        $command = sprintf(
            '%s -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 %s 2>&1',
            $ffprobe,
            escapeshellarg($file)
        );

        $output = [];
        $exitCode = 0;
        Processes::mwExec($command, $output, $exitCode);

        $sampleRate = (int)trim($output[0] ?? '0');

        return $sampleRate > 0 ? $sampleRate : 0;
    }

    /**
     * Build ffmpeg command for WAV to WebM/Opus conversion with metadata
     *
     * @param string $ffmpeg Path to ffmpeg binary
     * @param string $srcFile Source WAV file
     * @param string $dstFile Destination WebM file
     * @param string $opusBitrate Opus bitrate (48k or 64k)
     * @param array<string, mixed> $taskData Task metadata
     * @return string Complete ffmpeg command
     */
    private function buildFfmpegCommand(string $ffmpeg, string $srcFile, string $dstFile, string $opusBitrate, array $taskData): string
    {
        // Base command with timeout protection (BusyBox syntax) and loudnorm (EBU R128 normalization)
        $command = sprintf(
            'timeout -k %d -s TERM %d %s -i %s -vn -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libopus -b:a %s -vbr on -compression_level 10 -application voip',
            self::FFMPEG_KILL_GRACE,
            self::FFMPEG_TIMEOUT,
            $ffmpeg,
            escapeshellarg($srcFile),
            $opusBitrate
        );

        // Add metadata tags
        $linkedid = $taskData['linkedid'] ?? '';
        if (!empty($linkedid)) {
            $command .= sprintf(' -metadata title=%s', escapeshellarg("Call $linkedid"));
        }

        $srcNum = $taskData['src_num'] ?? '';
        if (!empty($srcNum)) {
            $command .= sprintf(' -metadata artist=%s', escapeshellarg($srcNum));
        }

        $dstNum = $taskData['dst_num'] ?? '';
        if (!empty($dstNum)) {
            $command .= sprintf(' -metadata album=%s', escapeshellarg($dstNum));
        }

        $start = $taskData['start'] ?? '';
        if (!empty($start)) {
            $command .= sprintf(' -metadata date=%s', escapeshellarg($start));
        }

        $disposition = $taskData['disposition'] ?? '';
        if (!empty($disposition)) {
            $command .= sprintf(' -metadata comment=%s', escapeshellarg("Status: $disposition"));
        }

        // Custom MikoPBX tags
        if (!empty($linkedid)) {
            $command .= sprintf(' -metadata CALL_LINKEDID=%s', escapeshellarg($linkedid));
        }
        if (!empty($srcNum)) {
            $command .= sprintf(' -metadata CALL_SRC_NUM=%s', escapeshellarg($srcNum));
        }
        if (!empty($dstNum)) {
            $command .= sprintf(' -metadata CALL_DST_NUM=%s', escapeshellarg($dstNum));
        }

        $duration = $taskData['duration'] ?? '';
        if (!empty($duration)) {
            $command .= sprintf(' -metadata CALL_DURATION=%s', escapeshellarg($duration));
        }

        $billsec = $taskData['billsec'] ?? '';
        if (!empty($billsec)) {
            $command .= sprintf(' -metadata CALL_BILLSEC=%s', escapeshellarg($billsec));
        }

        if (!empty($disposition)) {
            $command .= sprintf(' -metadata CALL_DISPOSITION=%s', escapeshellarg($disposition));
        }

        $uniqueid = $taskData['uniqueid'] ?? '';
        if (!empty($uniqueid)) {
            $command .= sprintf(' -metadata CALL_UNIQUEID=%s', escapeshellarg($uniqueid));
        }

        // Technical metadata
        $command .= ' -metadata AUDIO_FORMAT=webm';
        $command .= ' -metadata AUDIO_CODEC=opus';
        $command .= sprintf(' -metadata AUDIO_BITRATE=%s', escapeshellarg($opusBitrate));

        // Output file
        $command .= sprintf(' -y %s 2>&1', escapeshellarg($dstFile));

        return $command;
    }

    /**
     * Validate output WebM file
     *
     * @param string $ffprobe Path to ffprobe binary
     * @param string $file Output file path
     * @return bool True if file is valid
     */
    private function validateOutput(string $ffprobe, string $file): bool
    {
        // Check file exists and has reasonable size
        if (!file_exists($file)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Output file not created', LOG_ERR);
            return false;
        }

        $fileSize = filesize($file);
        if ($fileSize < 1000) {
            SystemMessages::sysLogMsg(__CLASS__, 'Output file too small (possibly corrupt)', LOG_ERR);
            @unlink($file);
            return false;
        }

        // Validate with ffprobe
        if (!empty($ffprobe)) {
            $command = sprintf('%s -v error %s 2>&1', $ffprobe, escapeshellarg($file));
            $output = [];
            $exitCode = 0;
            Processes::mwExec($command, $output, $exitCode);

            if ($exitCode !== 0) {
                SystemMessages::sysLogMsg(__CLASS__, 'Output file validation failed', LOG_ERR);
                @unlink($file);
                return false;
            }
        }

        // Set read permissions
        @chmod($file, 0644);

        return true;
    }

    /**
     * Handle failed conversion task
     *
     * @param string $taskFile Path to task file
     * @param array<string, mixed> $taskData Task data
     * @param int $exitCode Exit code from conversion
     * @param resource $fp File pointer with exclusive lock
     * @return void
     */
    private function handleFailedTask(string $taskFile, array $taskData, int $exitCode, $fp): void
    {
        $taskData['attempts'] = ($taskData['attempts'] ?? 0) + 1;
        $taskData['last_attempt_at'] = time();
        $taskData['last_error_code'] = $exitCode;

        if ($taskData['attempts'] >= self::MAX_ATTEMPTS) {
            // Give up after max attempts - rename to .failed.json
            flock($fp, LOCK_UN);
            fclose($fp);

            $failedFile = str_replace('.json', '.failed.json', $taskFile);
            rename($taskFile, $failedFile);

            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'Task failed after %d attempts (exit code %d): %s',
                    self::MAX_ATTEMPTS,
                    $exitCode,
                    basename($taskFile)
                ),
                LOG_ERR
            );
        } else {
            // Update task file for retry
            rewind($fp);
            ftruncate($fp, 0);
            $jsonData = json_encode($taskData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($jsonData !== false) {
                fwrite($fp, $jsonData);
            }
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);

            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'Task retry scheduled (attempt %d/%d, exit code %d): %s',
                    $taskData['attempts'],
                    self::MAX_ATTEMPTS,
                    $exitCode,
                    basename($taskFile)
                ),
                LOG_WARNING
            );
        }
    }
}

// Start the worker
WorkerWav2Webm::startWorker($argv ?? []);
