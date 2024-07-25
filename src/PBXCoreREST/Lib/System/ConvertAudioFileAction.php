<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;
/**
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class ConvertAudioFileAction extends Injectable
{
    /**
     * Convert the audio file to various codecs using Asterisk.
     *
     * @param string $filename The path of the audio file to be converted.
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if (!file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = "File '$filename' not found.";
        }
        $out          = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);
        if ($res->success && false === copy($filename, $tmp_filename)) {
            $res->success    = false;
            $res->messages[] = "Unable to create temporary file '$tmp_filename'.";
        }
        if(!$res->success){
            return $res;
        }

        // Change extension to wav
        $trimmedFileName = Util::trimExtensionForFile($filename);
        $n_filename     = $trimmedFileName . ".wav";
        $n_filename_mp3 = $trimmedFileName . ".mp3";

        // Convert file to wav format
        $tmp_filename = escapeshellcmd($tmp_filename);
        $n_filename   = escapeshellcmd($n_filename);
        $soxPath      = Util::which('sox');

        // Предварительная конвертация в wav.
        Processes::mwExec("$soxPath -v 0.99 -G '$n_filename' -c 1 -r 8000 -b 16 '$n_filename'", $out);
        $result_str = implode('', $out);

        // Convert wav file to mp3 format
        $lamePath = Util::which('lame');
        Processes::mwExec("$lamePath -b 32 --silent '$n_filename' '$n_filename_mp3'", $out);
        $result_mp3 = implode('', $out);

        // Convert the file to various codecs using Asterisk
        $codecs = ['alaw', 'ulaw', 'gsm', 'g722', 'wav'];
        $rmPath       = Util::which('rm');
        $asteriskPath = Util::which('asterisk');
        foreach ($codecs as $codec){
            $result = shell_exec("$asteriskPath -rx 'file convert $tmp_filename $trimmedFileName.$codec'");
            if(strpos($result, 'Converted') !== 0){
                shell_exec("$rmPath -rf /root/test.$codec");
            }
        }

        // Remove temporary file
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Conversion failed
            $res->success    = false;
            $res->messages[] = $result_str;

            return $res;
        }

        if ($filename !== $n_filename
            && $filename !== $n_filename_mp3 && file_exists($filename)) {
            // Remove the original file if it's different from the converted files
            unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }
}