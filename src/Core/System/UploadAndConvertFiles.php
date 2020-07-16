<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System;

namespace MikoPBX\Core\System;

use MikoPBX\Core\Workers\WorkerMergeUploadedFile;
use Phalcon\Di;
use Phalcon\Http\Message\Stream;
use Phalcon\Http\Message\StreamFactory;
use Phalcon\Http\Message\UploadedFile;

class UploadAndConvertFiles
{
    /**
     * Process resumable upload files
     *
     * @param $parameters
     */
    public static function uploadResumable($parameters): array
    {
        $data           = [];
        $data['result'] = 'ERROR';
        $di             = Di::getDefault();
        if ($di === null) {
            return ['result' => 'ERROR', 'data' => 'Dependency injector not initialized'];
        }
        $upload_id            = $parameters['upload_id'];
        $resumableFilename    = $parameters['resumableFilename'];
        $resumableIdentifier  = $parameters['resumableIdentifier'];
        $resumableChunkNumber = $parameters['resumableChunkNumber'];
        $resumableTotalSize   = $parameters['resumableTotalSize'];
        $uploadPath           = $di->getShared('config')->path('core.uploadPath');

        $factory = new StreamFactory();

        foreach ($parameters['files'] as $file_data) {
            $stream = $factory->createStreamFromFile($file_data['file_path'], 'r');
            $file   = new UploadedFile(
                $stream,
                $file_data['file_size'],
                $file_data['file_error'],
                $file_data['file_name'],
                $file_data['file_type']
            );

            if (isset($resumableIdentifier) && trim($resumableIdentifier) !== '') {
                $temp_dir         = $uploadPath . '/' . Util::trimExtensionForFile(basename($resumableFilename));
                $temp_dst_file    = $uploadPath . '/' . $upload_id . '/' . $upload_id . '_' . basename(
                        $resumableFilename
                    );
                $chunks_dest_file = $temp_dir . '/' . $resumableFilename . '.part' . $resumableChunkNumber;
            } else {
                $temp_dir         = $uploadPath . '/' . $upload_id;
                $temp_dst_file    = $temp_dir . '/' . $upload_id . '_' . basename($file->getClientFilename());
                $chunks_dest_file = $temp_dst_file;
            }
            if ( ! Util::mwMkdir($temp_dir) || ! Util::mwMkdir(dirname($temp_dst_file))) {
                Util::sysLogMsg('UploadFile', "Error create dir '$temp_dir'");

                return ['result' => 'ERROR', 'data' => "Error create dir 'temp_dir'"];
            }
            $file->moveTo($chunks_dest_file);
            // if (file_exists($file->))
            if ($resumableFilename) {
                $data['result'] = 'Success';
                // Передача файлов частями.
                $result = Util::createFileFromChunks($temp_dir, $resumableTotalSize);
                if ($result === true) {
                    $merge_settings = [
                        'data'   => [
                            'result_file'          => $temp_dst_file,
                            'temp_dir'             => $temp_dir,
                            'resumableFilename'    => $resumableFilename,
                            'resumableTotalChunks' => $resumableChunkNumber,
                        ],
                        'action' => 'merge',
                    ];
                    $settings_file  = "{$temp_dir}/merge_settings";
                    file_put_contents(
                        $settings_file,
                        json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
                    );

                    // Отправляем задачу на склеивание файла.
                    $phpPath               = Util::which('php');
                    $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
                    Util::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} '{$settings_file}'");

                    $data['upload_id'] = $upload_id;
                    $data['filename']  = $temp_dst_file;
                    $data['d_status']  = 'INPROGRESS';
                }
            } else {
                $data['result'] = 'Success';
                // Передача файла целиком.
                $data['upload_id'] = $upload_id;
                $data['filename']  = $temp_dst_file;
                $data['d_status']  = 'UPLOAD_COMPLETE';
                file_put_contents($temp_dir . '/progress', '100');

                Util::mwExecBg(
                    '/etc/rc/shell_functions.sh killprocesses ' . $temp_dir . ' -TERM 0;rm -rf ' . $temp_dir,
                    '/dev/null',
                    120
                );
            }
        }

        return $data;
    }

    /**
     * Returns Status of uploading process
     *
     * @param $postData
     *
     * @return array
     */
    public static function statusUploadFile($postData): array
    {
        $result           = [];
        $result['result'] = 'ERROR';
        $di               = Di::getDefault();
        if ($di === null) {
            return ['result' => 'ERROR', 'data' => 'Dependency injector not initialized'];
        }
        $uploadPath = $di->getShared('config')->path('core.uploadPath');
        if ($postData && isset($postData['id'])) {
            $upload_id     = $postData['id'];
            $progress_dir  = $uploadPath . '/' . $upload_id;
            $progress_file = $progress_dir . '/progress';

            if (empty($upload_id)) {
                $result['result']            = 'ERROR';
                $result['d_status_progress'] = '0';
                $result['d_status']          = 'ID_NOT_SET';
            } elseif ( ! file_exists($progress_file) && file_exists($progress_dir)) {
                $result['result']            = 'Success';
                $result['d_status_progress'] = '0';
                $result['d_status']          = 'INPROGRESS';
            } elseif ( ! file_exists($progress_dir)) {
                $result['result']            = 'ERROR';
                $result['d_status_progress'] = '0';
                $result['d_status']          = 'NOT_FOUND';
            } elseif ('100' === file_get_contents($progress_file)) {
                $result['result']            = 'Success';
                $result['d_status_progress'] = '100';
                $result['d_status']          = 'UPLOAD_COMPLETE';
            } else {
                $result['result']            = 'Success';
                $result['d_status_progress'] = file_get_contents($progress_file);
            }
        }

        return $result;
    }

    /**
     * Конвертация файла в wav 8000.
     *
     * @param $filename
     *
     * @return mixed
     */
    public static function convertAudioFile($filename)
    {
        $result = [];
        if ( ! file_exists($filename)) {
            $result['result']  = 'Error';
            $result['message'] = "File '{$filename}' not found.";

            return $result;
        }
        $out          = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);
        if (false === copy($filename, $tmp_filename)) {
            $result['result']  = 'Error';
            $result['message'] = "Unable to create temporary file '{$tmp_filename}'.";

            return $result;
        }

        // Принудительно устанавливаем расширение файла в wav.
        $n_filename     = Util::trimExtensionForFile($filename) . ".wav";
        $n_filename_mp3 = Util::trimExtensionForFile($filename) . ".mp3";
        // Конвертируем файл.
        $tmp_filename = escapeshellcmd($tmp_filename);
        $n_filename   = escapeshellcmd($n_filename);
        $soxPath      = Util::which('sox');
        Util::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        $lamePath = Util::which('lame');
        Util::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Чистим мусор.
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Ошибка выполнения конвертации.
            $result['result']  = 'Error';
            $result['message'] = $result_str;

            return $result;
        }

        if ($filename !== $n_filename && $filename !== $n_filename_mp3) {
            @unlink($filename);
        }

        $result['result'] = 'Success';
        $result['data']   = $n_filename_mp3;

        return $result;
    }

    /**
     * Unpack ModuleFile and get metadata information
     *
     * @param $filePath
     *
     * @return mixed
     */
    public static function  getMetadataFromModuleFile(string $filePath): array
    {
        $result['result'] = 'Error';
        if (file_exists($filePath)) {
            $sevenZaPath = Util::which('7za');
            $grepPath    = Util::which('grep');
            $echoPath    = Util::which('echo');
            $awkPath     = Util::which('awk');
            // $cmd = 'f="' . $filePath . '"; p=`7za l $f | grep module.json`;if [ "$?" == "0" ]; then 7za -so e -y -r $f `echo $p |  awk -F" " \'{print $6}\'`; fi';
            $cmd = 'f="' . $filePath . '"; p=`' . $sevenZaPath . ' l $f | ' . $grepPath . ' module.json`;if [ "$?" == "0" ]; then ' . $sevenZaPath . ' -so e -y -r $f `' . $echoPath . ' $p |  ' . $awkPath . ' -F" " \'{print $6}\'`; fi';

            Util::mwExec($cmd, $out);
            $settings = json_decode(implode("\n", $out), true);

            $moduleUniqueID = $settings['moduleUniqueID'] ?? null;
            if ( ! $moduleUniqueID) {
                $result['data'] = 'The" moduleUniqueID " in the module file is not described.the json or file does not exist.';
                return $result;
            }
            $result['result'] = 'Success';
            $result['data']   = [
                'filePath' => $filePath,
                'uniqid' => $moduleUniqueID,
            ];
        }

        return $result;
    }
}