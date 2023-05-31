<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\System\RestoreDefaultSettings;
use Phalcon\Di\Injectable;


/**
 * Class SystemManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     * @throws \Exception
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'reboot':
                System::rebootSync();
                $res->success = true;
                break;
            case 'shutdown':
                System::shutdown();
                $res->success = true;
                break;
            case 'getDate':
                $res->success           = true;
                $res->data['timestamp'] = time();
                break;
            case 'setDate':
                $res->success = System::setDate($data['timestamp'], $data['userTimeZone']);
                break;
            case 'updateMailSettings':
                $notifier     = new Notifications();
                $res->success = $notifier->sendTestMail();
                break;
            case 'sendMail':
                $res = self::sendMail($data);
                break;
            case 'upgrade':
                $res = self::upgradeFromImg($data['temp_filename']);
                break;
            case 'restoreDefault':
                $ch = 0;
                do{
                    $ch++;
                    $res = RestoreDefaultSettings::main();
                    sleep(1);
                }while($ch <= 10 && !$res->success);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Processes::mwExec("{$mvPath} {$request['data']['temp_filename']} {$request['data']['filename']}");
                $res = self::convertAudioFile($request['data']['filename']);
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in systemCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Sends an email notification.
     *
     * @param array $data The data containing email, subject, and body.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function sendMail(array $data): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
            if (isset($data['encode']) && $data['encode'] === 'base64') {
                $data['subject'] = base64_decode($data['subject']);
                $data['body']    = base64_decode($data['body']);
            }
            $notifier = new Notifications();
            $result   = $notifier->sendMail($data['email'], $data['subject'], $data['body']);
            if ($result === true) {
                $res->success = true;
            } else {
                $res->success    = false;
                $res->messages[] = 'Notifications::sendMail method returned false';
            }
        } else {
            $res->success    = false;
            $res->messages[] = 'Not all query parameters were set';
        }

        return $res;
    }

    /**
     * Upgrade the PBX using uploaded IMG file.
     *
     * @param string $tempFilename The path to the uploaded image file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function upgradeFromImg(string $tempFilename): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $res->success         = true;
        $res->data['message'] = 'In progress...';

        if ( ! file_exists($tempFilename)) {
            $res->success    = false;
            $res->messages[] = "Update file '{$tempFilename}' not found.";

            return $res;
        }

        if ( ! file_exists('/var/etc/cfdevice')) {
            $res->success    = false;
            $res->messages[] = "The system is not installed";

            return $res;
        }
        $dev     = trim(file_get_contents('/var/etc/cfdevice'));
        $storage = new Storage();

        // Generate update script
        $cmd = '/bin/busybox grep "$(/bin/busybox  cat /var/etc/storage_device) " < /etc/fstab | /bin/busybox awk -F"[= ]" "{ print \$2}"';
        $storage_uuid = trim(shell_exec($cmd));
        $cf_uuid      = $storage->getUuid("{$dev}3");
        $data = "#!/bin/sh".PHP_EOL.
                'rm -rf "$0";'.PHP_EOL.
                "export storage_uuid='$storage_uuid';".PHP_EOL.
                "export cf_uuid='$cf_uuid';".PHP_EOL.
                "export updateFile='$tempFilename';".PHP_EOL;

        // Mount boot partition
        $cmd = '/bin/lsblk -o UUID,PKNAME -p | /bin/busybox grep "'.$cf_uuid.'" | /bin/busybox cut -f 2 -d " "';
        $bootDisc = trim(shell_exec($cmd));

        $systemDir = '/system';
        Util::mwMkdir($systemDir);
        $result = Processes::mwExec("mount {$bootDisc}1 $systemDir");
        if($result === 0){
            file_put_contents("$systemDir/update.sh", $data);
            // Reboot the system
            System::rebootSyncBg();
        }else{
            $res->success    = false;
            $res->messages[] = "Fail mount boot device...";
        }

        return $res;
    }


    /**
     * Convert the audio file to various codecs using Asterisk.
     *
     * @param string $filename The path of the audio file to be converted.
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function convertAudioFile(string $filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = "File '{$filename}' not found.";

            return $res;
        }
        $out          = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);
        if (false === copy($filename, $tmp_filename)) {
            $res->success    = false;
            $res->messages[] = "Unable to create temporary file '{$tmp_filename}'.";

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
        Processes::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        // Convert wav file to mp3 format
        $lamePath = Util::which('lame');
        Processes::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Convert the file to various codecs using Asterisk
        $codecs = ['alaw', 'ulaw', 'gsm', 'g722', 'wav'];
        $rmPath       = Util::which('rm');
        $asteriskPath = Util::which('asterisk');
        foreach ($codecs as $codec){
            $result = shell_exec("$asteriskPath -rx 'file convert $tmp_filename $trimmedFileName.$codec'");
            if(strpos($result, 'Converted') !== 0){
                shell_exec("$rmPath -rf /root/test.{$codec}");
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

        if (file_exists($filename)
            && $filename !== $n_filename
            && $filename !== $n_filename_mp3) {
            // Remove the original file if it's different from the converted files
            unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }

}