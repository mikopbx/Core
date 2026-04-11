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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Injectable;

/**
 * Gets partially filtered log file strings.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class GetLogFromFileAction extends Injectable
{
    /**
     * Gets partially filtered log file strings.
     *
     * @param array<string, mixed> $data An array containing the following parameters:
     *                    - filename (string): The name of the log file.
     *                    - filter (string): The filter string.
     *                    - logLevel (string): Log level filter (ERROR, WARNING, NOTICE, INFO, DEBUG).
     *                    - lines (int): The number of lines to return (default: 500, max: 10000).
     *                    - offset (int): The number of lines to skip (default: 0).
     *                    - dateFrom (string): Start date filter (YYYY-MM-DD HH:MM:SS or timestamp).
     *                    - dateTo (string): End date filter (YYYY-MM-DD HH:MM:SS or timestamp).
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // WHY: Get sanitization rules from DataStructure (Single Source of Truth)
        // DataStructure defines all field constraints, not controller attributes
        $sanitizationRules = DataStructure::getSanitizationRules();

        // WHY: Sanitize input data for security - never trust user input
        $sanitizedData = BaseActionHelper::sanitizeData($data, $sanitizationRules);

        // Extract validated parameters
        $filename = (string)($sanitizedData['filename'] ?? '');
        $filter = (string)($sanitizedData['filter'] ?? '');
        $logLevel = isset($sanitizedData['logLevel']) ? strtoupper((string)$sanitizedData['logLevel']) : '';
        $lines = (int)($sanitizedData['lines'] ?? 500);
        $offset = (int)($sanitizedData['offset'] ?? 0);
        $dateFrom = (string)($sanitizedData['dateFrom'] ?? '');
        $dateTo = (string)($sanitizedData['dateTo'] ?? '');
        $latest = (bool)($sanitizedData['latest'] ?? false);

        // Validate filename is not empty before constructing path
        // WHY: Prevent directory path instead of file path (security + correct behavior)
        if (empty($filename)) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_filename_required');
            $res->httpCode = 400;
            return $res;
        }

        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;

        // Security: path traversal protection
        $realLogDir = realpath(Directories::getDir(Directories::CORE_LOGS_DIR));
        $realFilename = realpath($filename);
        if ($realFilename === false || $realLogDir === false
            || !str_starts_with($realFilename . '/', $realLogDir . '/')) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_invalid_path');
            $res->httpCode = 400;
            return $res;
        }
        $filename = $realFilename;

        // Validate the result is a file, not a directory
        // WHY: Prevents commands like "tail /path/to/directory/" which produce empty output
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_file_not_found') . ': ' . basename($filename);
            $res->httpCode = 404;
        } elseif (is_dir($filename)) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_path_is_directory') . ': ' . basename($filename);
            $res->httpCode = 400;
        } else {
            $res->success = true;
            $head = Util::which('head');
            $grep = '/bin/grep'; //can work with -text option
            if (!is_executable($grep)) {
                $grep = Util::which('grep');
            }
            $tail = Util::which('tail');
            $linesPlusOffset = $lines + $offset;

            $cacheDir = Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR);
            if (!file_exists($cacheDir)) {
                Util::mwMkdir($cacheDir, true);
            }
            $filenameTmp = $cacheDir . '/' . __FUNCTION__ . '_' . uniqid(time() . '_', true) . '.log';
            
            // Check if the file is an archive
            $isArchive = false;
            $decompressedFile = '';
            $fileExtension = pathinfo($filename, PATHINFO_EXTENSION);
            if (in_array($fileExtension, ['gz', 'zip', 'bz2', 'xz'])) {
                $isArchive = true;
                $decompressedFile = $cacheDir . '/' . uniqid('decompressed_', true) . '_' . basename($filename, '.' . $fileExtension);
                
                // Decompress based on file extension
                switch ($fileExtension) {
                    case 'gz':
                        $cmd = Util::which('busybox') . ' gunzip -c ' . escapeshellarg($filename) . ' > ' . escapeshellarg($decompressedFile);
                        Processes::mwExec($cmd);
                        break;
                    case 'bz2':
                        $cmd = Util::which('bunzip2') . ' -c ' . escapeshellarg($filename) . ' > ' . escapeshellarg($decompressedFile);
                        Processes::mwExec($cmd);
                        break;
                    case 'xz':
                        $cmd = Util::which('unxz') . ' -c ' . escapeshellarg($filename) . ' > ' . escapeshellarg($decompressedFile);
                        Processes::mwExec($cmd);
                        break;
                    case 'zip':
                        // Use ZipArchive for ZIP files
                        $zip = new \ZipArchive();
                        if ($zip->open($filename) === true) {
                            // Assuming there's only one file in the archive or we want the first one
                            if ($zip->numFiles > 0) {
                                $zipEntryContent = $zip->getFromIndex(0);
                                file_put_contents($decompressedFile, $zipEntryContent);
                            }
                            $zip->close();
                        } else {
                            $isArchive = false;
                        }
                        break;
                    default:
                        $isArchive = false;
                        break;
                }
                
                if ($isArchive && file_exists($decompressedFile)) {
                    // Use decompressed file for further operations
                    $fileToProcess = $decompressedFile;
                    $res->data['decompressed'] = true;
                } else {
                    $fileToProcess = $filename;
                }
            } else {
                $fileToProcess = $filename;
            }

            // Step 1: Apply text filter (grep) if provided
            // Supports two formats:
            //   - JSON array: [{"type":"contains","value":"X"},{"type":"notContains","value":"Y"}]
            //   - Legacy plain string: "pattern1&pattern2" (OR logic with & separator)
            $textFilteredFile = $fileToProcess;
            $includeFilteredFile = null;
            $excludeFilteredFile = null;
            $needsTextFilter = !empty($filter) && is_string($filter);

            if ($needsTextFilter) {
                $conditions = self::parseFilterConditions($filter);
                $includePatterns = $conditions['contains'];
                $excludePatterns = $conditions['notContains'];

                // Apply include patterns: grep -F -e pat1 -e pat2
                if (!empty($includePatterns)) {
                    $grepArgs = [];
                    foreach ($includePatterns as $pattern) {
                        $grepArgs[] = '-e ' . escapeshellarg($pattern);
                    }
                    $includeFilteredFile = $cacheDir . '/' . uniqid('include_filtered_', true) . '.log';
                    $grepCmd = "$grep --text -h " . implode(' ', $grepArgs)
                        . ' -F ' . escapeshellarg($fileToProcess)
                        . ' > ' . escapeshellarg($includeFilteredFile);
                    Processes::mwExec($grepCmd);
                    $textFilteredFile = $includeFilteredFile;
                }

                // Apply exclude patterns: grep -v -F -e excl1 -e excl2
                if (!empty($excludePatterns)) {
                    $grepArgs = [];
                    foreach ($excludePatterns as $pattern) {
                        $grepArgs[] = '-e ' . escapeshellarg($pattern);
                    }
                    $excludeFilteredFile = $cacheDir . '/' . uniqid('exclude_filtered_', true) . '.log';
                    $grepCmd = "$grep --text -v -h " . implode(' ', $grepArgs)
                        . ' -F ' . escapeshellarg($textFilteredFile)
                        . ' > ' . escapeshellarg($excludeFilteredFile);
                    Processes::mwExec($grepCmd);
                    $textFilteredFile = $excludeFilteredFile;
                }
            }

            // Step 1.5: Apply log level filter if provided
            $levelFilteredFile = null;
            $validLogLevels = ['ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'];
            $needsLevelFilter = !empty($logLevel) && in_array($logLevel, $validLogLevels, true);

            if ($needsLevelFilter) {
                $levelFilteredFile = $cacheDir . '/' . uniqid('level_filtered_', true) . '.log';

                // Build comprehensive pattern for different log formats
                $levelPattern = self::buildLogLevelPattern($logLevel);

                $grepCmd = "$grep --text -E " . escapeshellarg($levelPattern)
                    . ' ' . escapeshellarg($textFilteredFile)
                    . ' > ' . escapeshellarg($levelFilteredFile);
                Processes::mwExec($grepCmd);
                $textFilteredFile = $levelFilteredFile;
            }

            // Step 2: Apply time-based filtering if dateFrom/dateTo provided
            $finalFilteredFile = $textFilteredFile;
            $needsTimeFilter = !empty($dateFrom) || !empty($dateTo);

            if ($needsTimeFilter) {
                // Convert dateFrom/dateTo to timestamps
                $timestampFrom = null;
                $timestampTo = null;

                if (!empty($dateFrom) && is_string($dateFrom)) {
                    if (is_numeric($dateFrom)) {
                        $timestampFrom = (int)$dateFrom;
                    } else {
                        $parsed = strtotime($dateFrom);
                        $timestampFrom = $parsed !== false ? $parsed : null;
                    }
                }

                if (!empty($dateTo) && is_string($dateTo)) {
                    if (is_numeric($dateTo)) {
                        $timestampTo = (int)$dateTo;
                    } else {
                        $parsed = strtotime($dateTo);
                        $timestampTo = $parsed !== false ? $parsed : null;
                    }
                }

                // Create temporary time-filtered file
                $timeFilteredFile = $cacheDir . '/' . uniqid('time_filtered_', true) . '.log';
                self::filterLogByTime($textFilteredFile, $timeFilteredFile, $timestampFrom, $timestampTo);
                $finalFilteredFile = $timeFilteredFile;
            }

            // Step 3: Apply offset/lines pagination
            // For time-based filtering:
            //   - latest=false (default): head to get oldest N lines (chronological order)
            //   - latest=true: tail to get newest N lines (chronological order)
            // For offset-based filtering: tail to get last N lines
            $escapedFinalFile = escapeshellarg($finalFilteredFile);
            if ($needsTimeFilter) {
                if ($latest) {
                    // Newest entries: get last N lines (tail preserves chronological order)
                    $cmd = "$tail -n $lines $escapedFinalFile";
                } else {
                    // Oldest first (default): get first N lines in chronological order
                    $cmd = "$head -n $lines $escapedFinalFile";
                }
            } else {
                // Offset-based: traditional tail behavior
                $cmd = "$tail -n $linesPlusOffset $escapedFinalFile";
                if ($offset > 0) {
                    $cmd .= " | $head -n $lines";
                }
            }

            $sed = Util::which('sed');
            $cmd .= ' | ' . $sed . ' -E \'s/\\\\([tnrfvb]|040)/ /g\'';
            $cmd .= ' > ' . escapeshellarg($filenameTmp);

            Processes::mwExec($cmd);
            $res->data['filename'] = $filenameTmp;
            
            // Check if temporary file was created successfully
            if (file_exists($filenameTmp)) {
                $res->data['content'] = mb_convert_encoding('' . file_get_contents($filenameTmp), 'UTF-8', 'UTF-8');
                // Use @ to suppress warning if file was already deleted by another process
                @unlink($filenameTmp);
            } else {
                // If file wasn't created, try to execute command without redirection to get content directly
                $cmdDirect = str_replace(" > $filenameTmp", "", $cmd);
                $output = [];
                $returnCode = 0;
                exec($cmdDirect, $output, $returnCode);

                if ($returnCode === 0) {
                    $res->data['content'] = mb_convert_encoding(implode("\n", $output), 'UTF-8', 'UTF-8');
                } else {
                    $res->data['content'] = '';
                    $res->messages['warning'][] = TranslationProvider::translate('rest_err_syslog_no_matching_entries');
                }
            }

            // Extract actual time range from loaded content
            if (!empty($res->data['content'])) {
                $contentLines = explode("\n", $res->data['content']);
                $contentLines = array_filter($contentLines); // Remove empty lines
                $contentLines = array_values($contentLines); // Re-index after filter

                $lineCount = count($contentLines);
                if ($lineCount > 0) {
                    // Scan forward to find first timestamp (fail2ban logs may have
                    // hundreds of non-timestamped action output lines like iptables commands)
                    $firstTimestamp = null;
                    for ($i = 0; $i < $lineCount; $i++) {
                        $firstTimestamp = LogTimestampParser::parseTimestamp($contentLines[$i]);
                        if ($firstTimestamp !== null) {
                            break;
                        }
                    }

                    // Scan backward to find last timestamp (handles trailing stack traces
                    // or action output lines at the end without timestamps)
                    $lastTimestamp = null;
                    for ($i = $lineCount - 1; $i >= 0; $i--) {
                        $lastTimestamp = LogTimestampParser::parseTimestamp($contentLines[$i]);
                        if ($lastTimestamp !== null) {
                            break;
                        }
                    }

                    if ($firstTimestamp && $lastTimestamp) {
                        $isTruncated = $lineCount >= $lines;
                        $res->data['actual_range'] = [
                            'start' => $firstTimestamp,
                            'end' => $lastTimestamp,
                            'lines_count' => $lineCount,
                            'truncated' => $isTruncated,
                            // Truncation direction: left (beginning cut) when latest=true, right (end cut) otherwise
                            'truncated_direction' => $isTruncated ? ($latest ? 'left' : 'right') : null
                        ];
                    }
                }
            }
            
            // Clean up temporary files
            if ($isArchive && !empty($decompressedFile) && file_exists($decompressedFile)) {
                @unlink($decompressedFile);
            }

            // Clean up include-filtered file
            if ($includeFilteredFile !== null && $includeFilteredFile !== $fileToProcess
                && file_exists($includeFilteredFile)) {
                @unlink($includeFilteredFile);
            }

            // Clean up exclude-filtered file
            if ($excludeFilteredFile !== null && $excludeFilteredFile !== $fileToProcess
                && file_exists($excludeFilteredFile)) {
                @unlink($excludeFilteredFile);
            }

            // Clean up level-filtered file
            if ($levelFilteredFile !== null && $levelFilteredFile !== $fileToProcess
                && file_exists($levelFilteredFile)) {
                @unlink($levelFilteredFile);
            }

            if ($needsTimeFilter && $finalFilteredFile !== $textFilteredFile
                && file_exists($finalFilteredFile)) {
                @unlink($finalFilteredFile);
            }
        }

        return $res;
    }

    /**
     * Build log level pattern for grep command supporting multiple log formats
     *
     * Supports the following log formats:
     * - Asterisk: [WARNING], [ERROR], [NOTICE], [INFO], [DEBUG]
     * - PHP: PHP Fatal error, PHP Warning, PHP Notice, PHP Deprecated
     * - Syslog: daemon.error, daemon.warn, daemon.notice, daemon.info, daemon.debug
     * - Nginx: [error], [warn], [notice], [info], [debug]
     * - Fail2ban: WARNING, ERROR, INFO, DEBUG
     *
     * @param string $logLevel Target log level (ERROR, WARNING, NOTICE, INFO, DEBUG)
     * @return string Regex pattern for grep -E
     */
    private static function buildLogLevelPattern(string $logLevel): string
    {
        // Level mapping dictionary for different log formats
        // Using word boundaries \b for flexible matching
        $levelMappings = [
            'ERROR' => [
                // Word boundary patterns (matches ] ERROR[, [ERROR], ERROR , etc)
                '\\bERROR\\b',
                '\\berror\\b',
                '\\bERR\\b',
                '\\berr\\b',
                '\\bCRITICAL\\b',
                '\\bFATAL\\b',
                // PHP formats
                'PHP Fatal error',
                'PHP Parse error',
                // Syslog formats (all facilities)
                '\\.err\\b',
                '\\.crit\\b',
                '\\.emerg\\b',
                '\\.alert\\b',
            ],
            'WARNING' => [
                // Word boundary patterns (matches ] WARNING[, [WARNING], WARNING , etc)
                '\\bWARNING\\b',
                '\\bwarning\\b',
                '\\bWARN\\b',
                '\\bwarn\\b',
                // PHP formats
                'PHP Warning',
                'PHP Deprecated',
                // Syslog formats (all facilities)
                '\\.warn\\b',
                '\\.warning\\b',
            ],
            'NOTICE' => [
                // Word boundary patterns
                '\\bNOTICE\\b',
                '\\bnotice\\b',
                // Syslog formats (all facilities)
                '\\.notice\\b',
            ],
            'INFO' => [
                // Word boundary patterns
                '\\bINFO\\b',
                '\\binfo\\b',
                '\\bINF\\b',
                '\\binf\\b',
                // Syslog formats (all facilities: daemon, cron, user, authpriv, etc.)
                '\\.info\\b',
            ],
            'DEBUG' => [
                // Word boundary patterns
                '\\bDEBUG\\b',
                '\\bdebug\\b',
                '\\bDBG\\b',
                '\\bdbg\\b',
                // Syslog formats (all facilities)
                '\\.debug\\b',
            ],
        ];

        // Get patterns for this level, default to simple pattern if not found
        $patterns = $levelMappings[$logLevel] ?? ['\\[' . $logLevel . '\\]', ' ' . $logLevel . ' '];

        // Join all patterns with OR operator
        return implode('|', $patterns);
    }

    /**
     * Parse filter string into structured conditions.
     *
     * Supports two formats:
     *   - JSON array: [{"type":"contains","value":"ERROR"},{"type":"notContains","value":"OPTIONS"}]
     *   - Legacy plain string: "pattern1&pattern2" (OR logic, all treated as "contains")
     *
     * @param string $filter Raw filter string from request
     * @return array{contains: string[], notContains: string[]} Grouped filter patterns
     */
    private static function parseFilterConditions(string $filter): array
    {
        $contains = [];
        $notContains = [];

        $trimmed = trim($filter);
        if ($trimmed === '') {
            return ['contains' => $contains, 'notContains' => $notContains];
        }

        // JSON format: starts with [
        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                foreach ($decoded as $condition) {
                    if (!is_array($condition) || empty($condition['value']) || !is_string($condition['value'])) {
                        continue;
                    }
                    $value = trim($condition['value']);
                    if ($value === '') {
                        continue;
                    }
                    $type = $condition['type'] ?? 'contains';
                    if ($type === 'notContains') {
                        $notContains[] = $value;
                    } else {
                        $contains[] = $value;
                    }
                }
                return ['contains' => $contains, 'notContains' => $notContains];
            }
        }

        // Legacy format: plain string with & as OR separator
        $parts = explode('&', $trimmed);
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part !== '') {
                $contains[] = $part;
            }
        }

        return ['contains' => $contains, 'notContains' => $notContains];
    }

    /**
     * Filter log file by time range
     *
     * @param string $sourceFile Source log file path
     * @param string $targetFile Target filtered file path
     * @param int|null $timestampFrom Start timestamp (inclusive)
     * @param int|null $timestampTo End timestamp (inclusive)
     * @return void
     */
    private static function filterLogByTime(string $sourceFile, string $targetFile, ?int $timestampFrom, ?int $timestampTo): void
    {
        $handle = fopen($sourceFile, 'r');
        if ($handle === false) {
            return;
        }

        $targetHandle = fopen($targetFile, 'w');
        if ($targetHandle === false) {
            fclose($handle);
            return;
        }

        while (($line = fgets($handle)) !== false) {
            $timestamp = LogTimestampParser::parseTimestamp($line);

            // If we can't parse timestamp, include the line (might be continuation of previous log entry)
            if ($timestamp === null) {
                fwrite($targetHandle, $line);
                continue;
            }

            // Check if timestamp is within range
            $includeTime = true;

            if ($timestampFrom !== null && $timestamp < $timestampFrom) {
                $includeTime = false;
            }

            if ($timestampTo !== null && $timestamp > $timestampTo) {
                $includeTime = false;
            }

            if ($includeTime) {
                fwrite($targetHandle, $line);
            }
        }

        fclose($handle);
        fclose($targetHandle);
    }
}