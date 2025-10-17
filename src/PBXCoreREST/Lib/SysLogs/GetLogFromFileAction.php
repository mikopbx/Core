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

        // Validate filename is not empty before constructing path
        // WHY: Prevent directory path instead of file path (security + correct behavior)
        if (empty($filename)) {
            $res->success = false;
            $res->messages['error'][] = 'Filename parameter is required and cannot be empty';
            $res->httpCode = 400;
            return $res;
        }

        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;

        // Validate the result is a file, not a directory
        // WHY: Prevents commands like "tail /path/to/directory/" which produce empty output
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages['error'][] = 'Log file not found: ' . basename($filename);
            $res->httpCode = 404;
        } elseif (is_dir($filename)) {
            $res->success = false;
            $res->messages['error'][] = 'Path points to directory, not a file: ' . basename($filename);
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
                        $cmd = Util::which('gunzip') . ' -c ' . $filename . ' > ' . $decompressedFile;
                        Processes::mwExec($cmd);
                        break;
                    case 'bz2':
                        $cmd = Util::which('bunzip2') . ' -c ' . $filename . ' > ' . $decompressedFile;
                        Processes::mwExec($cmd);
                        break;
                    case 'xz':
                        $cmd = Util::which('unxz') . ' -c ' . $filename . ' > ' . $decompressedFile;
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

            // Track all commands for debug
            $commandChain = [];
            if ($isArchive && isset($decompressedFile)) {
                $commandChain[] = "Decompressed: $filename -> $decompressedFile";
            }
            $commandChain[] = "Source file: $fileToProcess";

            // Step 1: Apply text filter (grep) if provided
            $textFilteredFile = $fileToProcess;
            $needsTextFilter = !empty($filter) && is_string($filter);

            if ($needsTextFilter) {
                // Split filter by & and escape each part separately
                $filterParts = explode('&', $filter);
                $grepArgs = [];
                foreach ($filterParts as $part) {
                    $part = trim($part);
                    if (!empty($part)) {
                        $grepArgs[] = '-e ' . escapeshellarg($part);
                    }
                }

                if (!empty($grepArgs)) {
                    $textFilteredFile = $cacheDir . '/' . uniqid('text_filtered_', true) . '.log';
                    $grepCmd = "$grep --text -h " . implode(' ', $grepArgs) . " -F $fileToProcess > $textFilteredFile";
                    Processes::mwExec($grepCmd);
                    $commandChain[] = "Text filter: $grepCmd";
                }
            }

            // Step 1.5: Apply log level filter if provided
            $levelFilteredFile = $textFilteredFile;
            $validLogLevels = ['ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'];
            $needsLevelFilter = !empty($logLevel) && in_array($logLevel, $validLogLevels, true);

            if ($needsLevelFilter) {
                $levelFilteredFile = $cacheDir . '/' . uniqid('level_filtered_', true) . '.log';

                // Build comprehensive pattern for different log formats
                $levelPattern = self::buildLogLevelPattern($logLevel);

                $grepCmd = "$grep --text -E " . escapeshellarg($levelPattern) . " $textFilteredFile > $levelFilteredFile";
                Processes::mwExec($grepCmd);
                $textFilteredFile = $levelFilteredFile;
                $commandChain[] = "Level filter ($logLevel): $grepCmd";
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
                $commandChain[] = "Time filter: PHP filterLogByTime($textFilteredFile -> $timeFilteredFile, from=$timestampFrom, to=$timestampTo)";
            }

            // Step 3: Apply offset/lines pagination
            // For time-based filtering, use head to get first N lines (chronological order)
            // For offset-based filtering, use tail to get last N lines
            if ($needsTimeFilter) {
                // Time-based: get first N lines in chronological order
                $cmd = "$head -n $lines $finalFilteredFile";
            } else {
                // Offset-based: traditional tail behavior
                $cmd = "$tail -n $linesPlusOffset $finalFilteredFile";
                if ($offset > 0) {
                    $cmd .= " | $head -n $lines";
                }
            }

            $sed = Util::which('sed');
            $cmd .= ' | ' . $sed . ' -E \'s/\\\\([tnrfvb]|040)/ /g\'';
            $cmd .= " > $filenameTmp";

            $commandChain[] = "Final output: $cmd";

            Processes::mwExec($cmd);
            $res->data['command_chain'] = $commandChain;
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
                    $res->messages['warning'][] = 'No matching log entries found or command execution failed';
                }
            }

            // Extract actual time range from loaded content
            if (!empty($res->data['content'])) {
                $contentLines = explode("\n", $res->data['content']);
                $contentLines = array_filter($contentLines); // Remove empty lines

                if (count($contentLines) > 0) {
                    // Get first and last line timestamps
                    $firstLine = reset($contentLines);
                    $lastLine = end($contentLines);

                    $firstTimestamp = LogTimestampParser::parseTimestamp($firstLine);
                    $lastTimestamp = LogTimestampParser::parseTimestamp($lastLine);

                    if ($firstTimestamp && $lastTimestamp) {
                        $res->data['actual_range'] = [
                            'start' => $firstTimestamp,
                            'end' => $lastTimestamp,
                            'lines_count' => count($contentLines),
                            'truncated' => count($contentLines) >= $lines
                        ];
                    }
                }
            }
            
            // Clean up temporary files
            if ($isArchive && !empty($decompressedFile) && file_exists($decompressedFile)) {
                @unlink($decompressedFile);
            }

            if ($needsTextFilter && $textFilteredFile !== $fileToProcess && file_exists($textFilteredFile)) {
                @unlink($textFilteredFile);
            }

            if ($needsTimeFilter && $finalFilteredFile !== $textFilteredFile && file_exists($finalFilteredFile)) {
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