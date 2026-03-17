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

use MikoPBX\Core\System\{Directories, Processes, RecordingDeletionLogger, SystemMessages, Util};
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Throwable;

/**
 * WorkerWav2Webm - Background worker for converting WAV recordings to OggOpus format
 *
 * This worker implements a task-based conversion system with native PHP implementation:
 * 1. Scans for JSON task files created by WorkerCDR in conversion-tasks directory
 * 2. Processes conversions using ffmpeg directly (no shell scripts)
 * 3. Implements retry logic with attempt counter (max 3 attempts)
 * 4. Deletes task file on success, renames to .failed.json after max attempts
 *
 * Optimized for ASR with adaptive bitrate selection:
 * - Stereo output preserves speaker separation (left=external, right=internal)
 * - Adaptive bitrate based on source sample rate (32k-64k)
 * - VoIP application mode optimized for speech recognition
 * - No dynamic range compression preserves phonetic features
 * - Compatible with Whisper, Yandex SpeechKit, Google STT, AssemblyAI
 *
 * Adaptive Bitrate Strategy:
 * - 8kHz source (G.711): 32k Opus - prevents unnecessary upsampling
 * - 16kHz source (G.722): 48k Opus - optimal for wideband speech
 * - 48kHz source (Opus): 64k Opus - preserves fullband quality
 *
 * Benefits:
 * - System restart resilience (unprocessed tasks remain in queue)
 * - Retry logic for failed conversions
 * - Independent scaling (runs on different interval than CDR processing)
 * - Better error tracking (failed task files can be analyzed)
 * - Lowest CPU priority to avoid impacting call processing
 * - 2-3x smaller files compared to previous implementation
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
     * Opus bitrate for 8kHz narrowband audio (G.711 alaw/ulaw, GSM)
     * Lower bitrate prevents unnecessary upsampling of already compressed audio
     * Optimal for ASR with stereo speaker diarization (16k per channel)
     */
    private const string OPUS_BITRATE_8K = '32k';

    /**
     * Opus bitrate for 16kHz wideband audio (G.722, Opus wideband)
     * Optimal for ASR with stereo speaker diarization (24k per channel)
     * Recommended for Whisper and Yandex SpeechKit
     */
    private const string OPUS_BITRATE_16K = '48k';

    /**
     * Opus bitrate for 48kHz fullband audio (Opus fullband)
     * High quality for premium ASR with stereo speaker diarization (32k per channel)
     */
    private const string OPUS_BITRATE_48K = '64k';

    /**
     * Minimum FFmpeg main conversion timeout in seconds
     */
    private const int FFMPEG_TIMEOUT_MIN = 300;

    /**
     * Minimum FFmpeg stereo merge timeout in seconds
     */
    private const int FFMPEG_MERGE_TIMEOUT_MIN = 120;

    /**
     * Minimum assumed ffmpeg processing speed relative to audio duration.
     * Used to calculate adaptive timeouts for long recordings.
     * Value of 10 means ffmpeg processes at least 10x realtime even under load.
     * Actual speed is typically 100-300x realtime.
     */
    private const int MIN_PROCESSING_SPEED_FACTOR = 10;

    /**
     * Grace period before sending SIGKILL after SIGTERM (seconds)
     */
    private const int FFMPEG_KILL_GRACE = 10;

    /**
     * Minimum WAV file size in bytes to be considered valid for conversion
     * WAV header is 44 bytes, so files smaller than this contain no audio data
     */
    private const int MIN_WAV_SIZE_BYTES = 100;

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
     * Excludes .failed.json files to prevent infinite retry loops
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
                $filename = $file->getFilename();

                // Only process .json files, exclude .failed.json files
                if ($file->isFile() &&
                    strtolower($file->getExtension()) === 'json' &&
                    !str_ends_with($filename, '.failed.json')) {
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

        // Detect actual file extension (supports .wav, .wav16, .wav48)
        $fileExt = $this->detectSourceFileExtension($inputPath);
        if ($fileExt === null) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('No source file found with supported extensions (.wav, .wav16, .wav48): %s', basename($inputPath)),
                LOG_ERR
            );
            return 2;
        }

        // Build file paths with detected extension
        $srcFile = $inputPath . '.' . $fileExt;
        $srcIn = $inputPath . '_in.' . $fileExt;
        $srcOut = $inputPath . '_out.' . $fileExt;
        $dstFile = $inputPath . '.webm';
        // Write merged file next to source files (not /tmp which is tmpfs with limited RAM)
        // FFmpeg doesn't recognize .wav48 as output format, so always use .wav extension
        $tempMerged = $inputPath . '_merged_' . getmypid() . '.wav';

        // Step 1: Check if stereo channel files exist (_in.wav and _out.wav)
        // When Asterisk MixMonitor records with separate channels:
        // - _in.wav contains one party (e.g., client/external)
        // - _out.wav contains other party (e.g., employee/internal)
        // - main .wav contains mono mix of both
        $hasStereoFiles = file_exists($srcIn) && file_exists($srcOut);

        // Step 1a: Check minimum file size - files with only WAV header (44 bytes) have no audio
        if ($hasStereoFiles) {
            $sizeIn = filesize($srcIn);
            $sizeOut = filesize($srcOut);
            if ($sizeIn < self::MIN_WAV_SIZE_BYTES && $sizeOut < self::MIN_WAV_SIZE_BYTES) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf(
                        'Source files too small (no audio data): %s (_in=%d, _out=%d bytes)',
                        basename($inputPath),
                        $sizeIn,
                        $sizeOut
                    ),
                    LOG_WARNING
                );
                // Clean up empty source files
                RecordingDeletionLogger::log(
                    RecordingDeletionLogger::CONVERSION_EMPTY,
                    $inputPath,
                    "in={$sizeIn}bytes, out={$sizeOut}bytes"
                );
                @unlink($srcIn);
                @unlink($srcOut);
                @unlink($srcFile);
                return 0; // Return success to delete task - no point retrying empty files
            }
        } elseif (file_exists($srcFile) && filesize($srcFile) < self::MIN_WAV_SIZE_BYTES) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'Source file too small (no audio data): %s (%d bytes)',
                    basename($inputPath),
                    filesize($srcFile)
                ),
                LOG_WARNING
            );
            RecordingDeletionLogger::log(
                RecordingDeletionLogger::CONVERSION_EMPTY,
                $srcFile,
                'size=' . filesize($srcFile) . 'bytes'
            );
            @unlink($srcFile);
            return 0; // Return success to delete task
        }

        // Merge stereo files if both channel files exist
        if ($hasStereoFiles) {
            $mergeTimeout = $this->calculateAdaptiveTimeout(
                (int)($taskData['billsec'] ?? 0),
                (int)(filesize($srcIn) + filesize($srcOut)),
                self::FFMPEG_MERGE_TIMEOUT_MIN
            );

            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Merging stereo channels (_in + _out) for: %s (timeout=%ds)', basename($inputPath), $mergeTimeout),
                LOG_INFO
            );

            $mergeResult = $this->mergeStereoFiles($ffmpeg, $srcOut, $srcIn, $tempMerged, $mergeTimeout);
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
                            $mergeResult, $mergeTimeout, basename($inputPath)),
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

        // Step 3: Select Opus bitrate adaptively based on source sample rate
        // Sample rate indicates original call quality:
        // - 8kHz = narrowband (G.711 alaw/ulaw) - low quality source
        // - 16kHz = wideband (G.722) - good quality source
        // - 48kHz = fullband (Opus) - excellent quality source
        $opusBitrate = $this->selectOptimalBitrate($sampleRate);

        // Step 4: Calculate adaptive conversion timeout
        $conversionTimeout = $this->calculateAdaptiveTimeout(
            (int)($taskData['billsec'] ?? 0),
            (int)filesize($srcFile),
            self::FFMPEG_TIMEOUT_MIN
        );

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Converting %s: sample_rate=%dHz, adaptive_bitrate=%s, timeout=%ds',
                basename($inputPath), $sampleRate, $opusBitrate, $conversionTimeout),
            LOG_INFO
        );

        // Step 5: Build and execute ffmpeg command
        $command = $this->buildFfmpegCommand($ffmpeg, $srcFile, $dstFile, $opusBitrate, $taskData, $conversionTimeout);

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
                        $exitCode, $conversionTimeout, basename($inputPath)),
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

        // Step 6: Validate output
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
            sprintf('Conversion completed successfully: %s.wav -> %s (bitrate=%s)',
                basename($inputPath), basename($dstFile), $opusBitrate),
            LOG_INFO
        );

        // Step 7: Cleanup source files if requested
        $deleteSource = ($taskData['delete_source'] ?? '0') === '1';
        if ($deleteSource) {
            // Delete all possible source file formats
            foreach ([$inputPath . '.' . $fileExt, $inputPath . '_in.' . $fileExt, $inputPath . '_out.' . $fileExt] as $srcPath) {
                if (file_exists($srcPath)) {
                    RecordingDeletionLogger::log(
                        RecordingDeletionLogger::CONVERSION_CLEANUP,
                        $srcPath,
                        "output={$dstFile}"
                    );
                    @unlink($srcPath);
                }
            }
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Source files deleted: %s.%s', basename($inputPath), $fileExt),
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
     * @param int $timeout Timeout in seconds for ffmpeg process
     * @return int Exit code (0=success, non-zero=failure)
     */
    private function mergeStereoFiles(string $ffmpeg, string $srcOut, string $srcIn, string $output, int $timeout): int
    {
        // BusyBox timeout syntax: timeout -s SIGNAL -k KILL_SECS DURATION COMMAND
        $command = sprintf(
            'timeout -s TERM -k %d %d %s -i %s -i %s -filter_complex "[0:a][1:a]amerge=inputs=2[a]" -map "[a]" -y %s 2>&1',
            self::FFMPEG_KILL_GRACE,
            $timeout,
            $ffmpeg,
            escapeshellarg($srcOut),
            escapeshellarg($srcIn),
            escapeshellarg($output)
        );

        $result = [];
        $exitCode = 0;
        Processes::mwExec($command, $result, $exitCode);

        // Log detailed error output on failure
        if ($exitCode !== 0) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'FFmpeg merge failed (exit %d): %s',
                    $exitCode,
                    implode(' | ', array_filter($result))
                ),
                LOG_ERR
            );
        }

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
     * Select optimal Opus bitrate adaptively based on source sample rate
     *
     * Sample rate indicates original call codec quality (Asterisk decodes to PCM but preserves sample rate):
     * - 8kHz = narrowband source (G.711 alaw/ulaw, GSM) - already low quality
     * - 16kHz = wideband source (G.722, Opus wideband) - good quality
     * - 48kHz = fullband source (Opus fullband) - excellent quality
     *
     * Adaptive strategy prevents unnecessary upsampling:
     * - Low quality source (8kHz) → lower Opus bitrate (32k) saves space
     * - Good quality source (16kHz) → medium Opus bitrate (48k) optimal for ASR
     * - High quality source (48kHz) → higher Opus bitrate (64k) preserves details
     *
     * Compatible with:
     * - Whisper (OpenAI): Resamples to 16kHz internally, works well with 32-64k
     * - Yandex SpeechKit: OggOpus support, recommends 48k for speech
     * - Google STT, AssemblyAI: Standard Opus bitrates
     *
     * @param int $sampleRate Audio sample rate in Hz (detected from source WAV)
     * @return string Opus bitrate (32k, 48k, or 64k for stereo)
     */
    private function selectOptimalBitrate(int $sampleRate): string
    {
        // 8kHz = narrowband source (G.711 alaw/ulaw, GSM)
        // Low quality source - no benefit from high Opus bitrate
        // 32k stereo = 16k per channel (sufficient for narrowband speech)
        if ($sampleRate <= 8000) {
            return self::OPUS_BITRATE_8K; // 32k
        }

        // 16kHz = wideband source (G.722, Opus wideband)
        // Good quality source - optimal bitrate for ASR
        // 48k stereo = 24k per channel (recommended by Whisper/Yandex)
        if ($sampleRate <= 16000) {
            return self::OPUS_BITRATE_16K; // 48k
        }

        // 48kHz = fullband source (Opus fullband)
        // Excellent quality source - preserve acoustic details
        // 64k stereo = 32k per channel (high quality for premium ASR)
        return self::OPUS_BITRATE_48K; // 64k
    }

    /**
     * Calculate adaptive ffmpeg timeout based on call duration or file size
     *
     * For short recordings the minimum timeout applies.
     * For long recordings (multi-hour calls) the timeout scales proportionally.
     *
     * Uses billsec when available, falls back to file size estimation.
     * Assumes worst-case ffmpeg speed of MIN_PROCESSING_SPEED_FACTOR x realtime.
     *
     * @param int $billsec Call duration in seconds (0 if unknown)
     * @param int $fileSizeBytes Total input file size in bytes
     * @param int $minimumTimeout Minimum timeout in seconds
     * @return int Calculated timeout in seconds
     */
    private function calculateAdaptiveTimeout(int $billsec, int $fileSizeBytes, int $minimumTimeout): int
    {
        $estimatedDuration = $billsec;

        // Fall back to file size estimation if billsec is not available
        // Assume worst case: 48kHz stereo 16-bit PCM = 192000 bytes/sec
        if ($estimatedDuration <= 0 && $fileSizeBytes > 0) {
            $estimatedDuration = (int)ceil($fileSizeBytes / 192000);
        }

        if ($estimatedDuration <= 0) {
            return $minimumTimeout;
        }

        // Timeout = audio duration / minimum processing speed factor
        $adaptiveTimeout = (int)ceil($estimatedDuration / self::MIN_PROCESSING_SPEED_FACTOR);

        return max($minimumTimeout, $adaptiveTimeout);
    }

    /**
     * Build ffmpeg command for WAV to WebM/Opus conversion with metadata
     *
     * @param string $ffmpeg Path to ffmpeg binary
     * @param string $srcFile Source WAV file
     * @param string $dstFile Destination WebM file
     * @param string $opusBitrate Opus bitrate (32k, 48k, or 64k for stereo)
     * @param array<string, mixed> $taskData Task metadata
     * @param int $timeout Timeout in seconds for ffmpeg process
     * @return string Complete ffmpeg command
     */
    private function buildFfmpegCommand(string $ffmpeg, string $srcFile, string $dstFile, string $opusBitrate, array $taskData, int $timeout): string
    {
        // Base command optimized for ASR (Automatic Speech Recognition):
        // - No loudnorm: Preserves natural speech dynamics and phonetic features
        // - Stereo output (-ac 2): Enables speaker diarization (left=external, right=internal)
        // - Application voip: Optimized for speech (High Pass Filter, formant emphasis)
        // - Frame duration 20ms: Standard for VoIP, optimal latency/quality balance
        // - Adaptive bitrate (32k-64k): Based on source sample rate
        // - VBR enabled: Variable bitrate for better quality at same average bitrate
        // - Compression level 10: Maximum compression (CPU-intensive but offline processing)
        // BusyBox timeout syntax: timeout -s SIGNAL -k KILL_SECS DURATION COMMAND
        $command = sprintf(
            'timeout -s TERM -k %d %d %s -i %s -vn -c:a libopus -b:a %s -ac 2 -vbr on -compression_level 10 -application voip -frame_duration 20',
            self::FFMPEG_KILL_GRACE,
            $timeout,
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
        $command .= ' -metadata AUDIO_CODEC=libopus';
        $command .= sprintf(' -metadata AUDIO_BITRATE=%s', escapeshellarg($opusBitrate));
        $command .= ' -metadata AUDIO_APPLICATION=voip';

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

            // Safely build failed filename - replace only the final .json extension
            // This prevents creating .failed.failed.json if file is already .failed.json
            $failedFile = preg_replace('/\.json$/', '.failed.json', $taskFile);

            // Check if filename would be too long (most filesystems limit to 255 bytes)
            $basename = basename($failedFile);
            if (strlen($basename) > 255) {
                // Filename too long - use truncated linkedid-based name instead
                $linkedid = $taskData['linkedid'] ?? uniqid('task-');
                $dirName = dirname($taskFile);
                $failedFile = $dirName . '/' . substr($linkedid, 0, 200) . '.failed.json';

                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Filename too long, using truncated name: %s', basename($failedFile)),
                    LOG_WARNING
                );
            }

            // Perform rename with error handling
            if (!@rename($taskFile, $failedFile)) {
                // If rename fails, try to delete the corrupted task file
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Failed to rename task file, deleting: %s', basename($taskFile)),
                    LOG_ERR
                );
                @unlink($taskFile);
            } else {
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
            }
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

    /**
     * Detect source file extension by checking which format exists
     *
     * Checks for recording files in priority order:
     * 1. .wav48 - OPUS fullband (48kHz)
     * 2. .wav16 - G.722 wideband (16kHz)
     * 3. .wav - Default narrowband (8kHz)
     *
     * This supports adaptive recording format selection based on codec.
     *
     * @param string $basePath Base path without extension
     * @return string|null Extension without dot (e.g., "wav48") or null if no file found
     */
    private function detectSourceFileExtension(string $basePath): ?string
    {
        // Priority order: check high quality formats first
        $extensions = ['wav48', 'wav16', 'wav'];

        foreach ($extensions as $ext) {
            // Check for main file OR stereo split files
            if (file_exists($basePath . '.' . $ext) ||
                (file_exists($basePath . '_in.' . $ext) && file_exists($basePath . '_out.' . $ext))) {
                return $ext;
            }
        }

        return null;
    }
}

// Start the worker
WorkerWav2Webm::startWorker($argv ?? []);
