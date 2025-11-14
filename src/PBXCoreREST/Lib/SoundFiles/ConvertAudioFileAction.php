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
     * Convert the audio file to all Asterisk formats (ulaw, alaw, gsm, g722, sln) plus WAV and MP3
     *
     * Uses SoundFilesConf::convertAudioFile() for consistent conversion logic
     * with normalization and caching support.
     *
     * @param string $filename The path of the audio file to be converted
     * @return PBXApiResult An object containing the result of the API call
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

        // Convert to all Asterisk formats + WAV + MP3 (same as modules do)
        $targetFormats = ['wav', 'mp3', 'ulaw', 'alaw', 'gsm', 'g722', 'sln'];

        // Use unified converter with normalization
        $result = SoundFilesConf::convertAudioFile(
            $filename,
            $targetFormats,
            [
                'normalize' => true,
                'use_cache' => false,
                'force' => true,
                'output_dir' => $outputDir,
                'base_name' => $baseName,
                'sample_rate' => 8000,
                'bitrate' => '16k',
            ]
        );

        // Handle conversion result
        if (!$result['success']) {
            $res->success = false;
            $res->messages['error'][] = $result['error'] ?? 'Audio conversion failed';

            // Add format-specific errors if available
            foreach ($result['formats'] as $format => $formatResult) {
                if ($formatResult['status'] === 'failed' && isset($formatResult['error'])) {
                    $res->messages['error'][] = "Failed to convert to $format: {$formatResult['error']}";
                }
            }

            return $res;
        }

        // Get converted MP3 file path (for backward compatibility, return MP3)
        $mp3Path = $result['formats']['mp3']['path'] ?? null;
        if ($mp3Path === null || !file_exists($mp3Path)) {
            $res->success = false;
            $res->messages['error'][] = 'MP3 conversion failed';
            return $res;
        }

        // Collect all converted file paths
        $convertedPaths = [];
        foreach ($result['formats'] as $format => $formatResult) {
            if ($formatResult['status'] === 'converted' && isset($formatResult['path'])) {
                $convertedPaths[$format] = $formatResult['path'];
            }
        }

        // Remove original file if it's different from all converted files
        $isOriginalConverted = false;
        foreach ($convertedPaths as $convertedPath) {
            if ($filename === $convertedPath) {
                $isOriginalConverted = true;
                break;
            }
        }

        if (!$isOriginalConverted && is_file($filename)) {
            unlink($filename);
        }

        // Return MP3 path for backward compatibility (API clients expect this)
        $res->success = true;
        $res->data = [$mp3Path];

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
        Processes::mwExec("$mv {$uploadedFilename} {$targetPath}");

        return $res;
    }
}