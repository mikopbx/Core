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

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Configs\SoundFilesConf;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Action for converting audio files using Asterisk
 *
 * @api {post} /pbxcore/api/v3/sound-files:convertAudioFile Convert audio file
 * @apiVersion 3.0.0
 * @apiName ConvertAudioFile
 * @apiGroup SoundFiles
 *
 * @apiParam {String} temp_filename Path to temporary uploaded file
 * @apiParam {String} category File category (custom, moh)
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array with converted file path
 * @apiSuccess {String} data[0] Path to converted MP3 file
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class ConvertAudioFileAction extends Injectable
{
    /**
     * Convert audio file and move to appropriate directory
     *
     * @param array $data Request data containing temp_filename and category
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Validate input parameters
        if (empty($data['temp_filename'])) {
            $res->messages['error'][] = 'temp_filename parameter is required';
            return $res;
        }

        if (empty($data['category'])) {
            $res->messages['error'][] = 'category parameter is required';
            return $res;
        }

        $tempFilename = $data['temp_filename'];
        $category = $data['category'];

        // Step 1: Move file to appropriate directory based on category
        $moveResult = self::moveSoundFileAccordingToCategory($category, $tempFilename);
        if (!$moveResult->success) {
            $res->messages = $moveResult->messages;
            return $res;
        }

        $targetFilename = $moveResult->data['filename'];

        // Step 2: Convert audio file to MP3
        $convertResult = self::convertAudioFile($targetFilename);
        if (!$convertResult->success) {
            $res->messages = $convertResult->messages;
            return $res;
        }

        $res->success = true;
        $res->data = $convertResult->data;

        return $res;
    }

    /**
     * Convert the uploaded audio file synchronously to all required formats.
     *
     * Generates in one REST call (Codex review correctly flagged the original lazy split
     * as unsafe — IVR/MOH save+reload runs immediately after this returns and Asterisk
     * needs the codec variants on disk before the dialplan reload):
     *   - WebM/Opus at source's native sample rate, adaptive bitrate — browser preview
     *     and SoundFiles.path value.
     *   - WAV (16-bit PCM, native sample rate) — generic fallback.
     *   - ulaw / alaw / gsm / g722 / sln — Asterisk codec variants. Each uses its
     *     codec-mandated sample rate inside SoundFilesConf::convertAudioFile() formatSpecs;
     *     the global `sample_rate` option is no longer forced to 8000.
     *
     * NO loudnorm pass: it was the actual quality-killer (loudnorm internally resamples
     * to whatever -ar follows it, which used to be 8000). Original audio dynamics preserved.
     *
     * @param string $filename Path of the (already-moved) source audio file
     * @return PBXApiResult First element of $data is the webm path used as SoundFiles.path
     */
    public static function convertAudioFile(string $filename): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages['error'][] = "File '$filename' not found.";
            return $res;
        }

        // Get base path and name for output files
        $pathInfo = pathinfo($filename);
        $outputDir = $pathInfo['dirname'];
        $baseName = Util::trimExtensionForFile($filename);
        $baseName = basename($baseName);

        // WebM first so its path is the canonical preview returned to caller.
        // Asterisk codec formats follow — each ffmpeg pass uses its own -ar from the
        // formatSpec, source quality preserved (no loudnorm, no global resample).
        $targetFormats = ['webm', 'wav', 'ulaw', 'alaw', 'gsm', 'g722', 'sln'];

        $result = SoundFilesConf::convertAudioFile(
            $filename,
            $targetFormats,
            [
                'normalize' => false,
                'use_cache' => false,
                'force' => true,
                'output_dir' => $outputDir,
                'base_name' => $baseName,
            ]
        );

        // Handle conversion result
        if (!$result['success']) {
            $res->success = false;
            $res->messages['error'][] = $result['error'] ?? 'Audio conversion failed';

            // Add format-specific errors if available
            $failedFormats = [];
            foreach ($result['formats'] as $format => $formatResult) {
                if ($formatResult['status'] === 'failed' && isset($formatResult['error'])) {
                    $failedFormats[] = $format;
                    $res->messages['error'][] = "Failed to convert to $format: {$formatResult['error']}";
                }
            }

            // Audit log: original is preserved on failure (early return below)
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Conversion failed for '$filename' (failed formats: "
                . implode(',', $failedFormats) . "); original file preserved",
                LOG_WARNING
            );

            return $res;
        }

        // Collect all converted file paths that actually exist on disk with non-zero size.
        // ffmpeg exit code 0 does NOT guarantee a usable output (e.g. truncated or 0-byte file
        // on disk-full / interrupted process). Be paranoid here — a missing target is a reason
        // to keep the original.
        $convertedPaths = [];
        $invalidPaths = [];
        foreach ($result['formats'] as $format => $formatResult) {
            if (($formatResult['status'] ?? '') !== 'converted' || !isset($formatResult['path'])) {
                continue;
            }
            $path = $formatResult['path'];
            if (is_file($path) && filesize($path) > 0) {
                $convertedPaths[$format] = $path;
            } else {
                $invalidPaths[$format] = $path;
            }
        }

        // WebM is the new browser-preview format and the value stored in SoundFiles.path.
        $webmPath = $convertedPaths['webm'] ?? null;
        if ($webmPath === null) {
            $res->success = false;
            $res->messages['error'][] = 'WebM conversion failed';
            SystemMessages::sysLogMsg(
                __METHOD__,
                "WebM conversion validation failed for '$filename' (webm missing or empty); original preserved",
                LOG_WARNING
            );
            return $res;
        }

        // Determine whether the original file is itself one of the converted outputs.
        // Use realpath() to defeat trailing-slash / relative-path tricks, fall back to a
        // case-insensitive basename compare ONLY when the source and target live in the
        // same directory (otherwise an upload at /upload/audio.wav and a target at
        // /target/audio.wav would be treated as the same file and the upload would never
        // be cleaned up — orphan leak).
        $originalRealpath = realpath($filename);
        $originalDir = dirname($filename);
        $originalBasename = basename($filename);
        $isOriginalConverted = false;
        foreach ($convertedPaths as $convertedPath) {
            $convertedRealpath = realpath($convertedPath);
            if (
                $originalRealpath !== false
                && $convertedRealpath !== false
                && $originalRealpath === $convertedRealpath
            ) {
                $isOriginalConverted = true;
                break;
            }
            if (
                dirname($convertedPath) === $originalDir
                && strcasecmp($originalBasename, basename($convertedPath)) === 0
            ) {
                $isOriginalConverted = true;
                break;
            }
        }

        // Multi-guard unlink gate. The original file is ONLY removed when:
        //   - at least one target format was actually written successfully,
        //   - no requested format failed (atomicity: refuse to drop the source on partial success),
        //   - the original is not itself one of the converted outputs,
        //   - the original still exists on disk.
        // Any other case keeps the original to prevent unrecoverable data loss.
        $anyConverted = count($convertedPaths) > 0;
        $allRequestedOk = ($result['stats']['failed'] ?? 0) === 0 && empty($invalidPaths);

        if ($anyConverted && $allRequestedOk && !$isOriginalConverted && is_file($filename)) {
            if (@unlink($filename)) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Removed original after successful conversion: $filename",
                    LOG_DEBUG
                );
            } else {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to remove original after conversion: $filename",
                    LOG_WARNING
                );
            }
        } else {
            $reason = !$anyConverted ? 'no_formats_converted'
                : (!$allRequestedOk ? 'partial_failure_or_invalid_targets'
                    : ($isOriginalConverted ? 'is_original_target' : 'file_already_gone'));
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Skipping unlink of original '$filename': reason=$reason",
                LOG_INFO
            );
        }

        // Return WebM path — becomes SoundFiles.path; the index page audio tag streams it.
        // The Asterisk codec siblings (ulaw/alaw/gsm/g722/sln/wav) live next to it under the
        // same basename, so dialplan generators that hand Asterisk the extensionless path
        // still find a playable variant immediately on save+reload.
        $res->success = true;
        $res->data = [$webmPath];

        return $res;
    }

    /**
     * Moves the uploaded sound file to the appropriate directory based on the category
     *
     * @param string $category The category of the file
     * @param string $uploadedFilename The path of the uploaded file
     * @return PBXApiResult An object containing the result of the API call
     */
    public static function moveSoundFileAccordingToCategory(string $category, string $uploadedFilename): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Determine target directory based on category
        switch ($category) {
            case SoundFiles::CATEGORY_MOH:
                $targetDir = Directories::getDir(Directories::AST_MOH_DIR);
                break;
            case SoundFiles::CATEGORY_CUSTOM:
                $targetDir = Directories::getDir(Directories::AST_CUSTOM_SOUND_DIR);
                break;
            default:
                $res->success = false;
                $res->messages['error'][] = "Invalid category: $category";
                return $res;
        }

        // Generate unique filename to prevent conflicts
        $originalBasename = basename($uploadedFilename);
        $pathInfo = pathinfo($originalBasename);
        $filename = $pathInfo['filename'];
        $extension = $pathInfo['extension'] ?? '';

        // Build target path
        $targetPath = "$targetDir/$originalBasename";

        // If file already exists, make it unique by adding timestamp and counter
        if (file_exists($targetPath)) {
            $timestamp = date('Ymd_His');
            $counter = 1;

            do {
                $uniqueFilename = "{$filename}_{$timestamp}_{$counter}";
                if (!empty($extension)) {
                    $uniqueFilename .= ".{$extension}";
                }
                $targetPath = "$targetDir/$uniqueFilename";
                $counter++;
            } while (file_exists($targetPath) && $counter < 100);

            // Safety check - if we couldn't find a unique name after 100 tries
            if ($counter >= 100) {
                $res->success = false;
                $res->messages['error'][] = "Could not generate unique filename after 100 attempts";
                return $res;
            }
        }

        $res->data['filename'] = $targetPath;

        // Move file to target location
        $mv = Util::which('mv');
        Processes::mwExec("$mv " . escapeshellarg($uploadedFilename) . " " . escapeshellarg($targetPath));

        return $res;
    }
}