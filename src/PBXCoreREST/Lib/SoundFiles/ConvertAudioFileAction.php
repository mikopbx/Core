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
     * Convert the audio file to MP3 format using Asterisk tools
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

        $out = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);

        if (false === copy($filename, $tmp_filename)) {
            $res->success = false;
            $res->messages['error'][] = "Unable to create temporary file '$tmp_filename'.";
            return $res;
        }

        // Change extension to wav and mp3
        $trimmedFileName = Util::trimExtensionForFile($filename);
        $n_filename = $trimmedFileName . ".wav";
        $n_filename_mp3 = $trimmedFileName . ".mp3";

        // Convert file to wav format
        $tmp_filename = escapeshellcmd($tmp_filename);
        $soxPath = Util::which('sox');
        $soxIPath = Util::which('soxi');
        $busyBoxPath = Util::which('busybox');

        // Pre-conversion to wav step 1 - check if MPEG
        if (Processes::mwExec("$soxIPath $tmp_filename | $busyBoxPath grep MPEG") === 0) {
            Processes::mwExec("$soxPath $tmp_filename $tmp_filename.wav", $out);
            unlink($tmp_filename);
            $tmp_filename = "$tmp_filename.wav";
        }

        $n_filename = escapeshellcmd($n_filename);

        // Pre-conversion to wav step 2 - normalize audio
        Processes::mwExec("$soxPath -v 0.99 -G '$tmp_filename' -c 1 -r 8000 -b 16 '$n_filename'", $out);
        $result_str = implode('', $out);

        // Convert wav file to mp3 format
        $lamePath = Util::which('lame');
        Processes::mwExec("$lamePath -b 16 --silent '$n_filename' '$n_filename_mp3'", $out);
        $result_mp3 = implode('', $out);

        // Remove temporary file
        unlink($tmp_filename);

        if ($result_str !== '' && $result_mp3 !== '') {
            // Conversion failed
            $res->success = false;
            $res->messages['error'][] = $result_str;
            return $res;
        }

        // Remove original file if it's different from converted files
        if ($filename !== $n_filename && $filename !== $n_filename_mp3 && file_exists($filename)) {
            unlink($filename);
        }

        $res->success = true;
        $res->data = [$n_filename_mp3];

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

        switch ($category) {
            case SoundFiles::CATEGORY_MOH:
                $mohDir = Directories::getDir(Directories::AST_MOH_DIR);
                $res->data['filename'] = "$mohDir/" . basename($uploadedFilename);
                break;
            case SoundFiles::CATEGORY_CUSTOM:
                $mediaDir = Directories::getDir(Directories::AST_CUSTOM_SOUND_DIR);
                $res->data['filename'] = "$mediaDir/" . basename($uploadedFilename);
                break;
            default:
                $res->success = false;
                $res->messages['error'][] = "Invalid category: $category";
                return $res;
        }

        $mv = Util::which('mv');
        Processes::mwExec("$mv {$uploadedFilename} {$res->data['filename']}");

        return $res;
    }
}