<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use Phalcon\Http\Message\StreamFactory;
use Phalcon\Http\Message\UploadedFile;

class FilesManagementProcessor extends Injectable
{
    /**
     * Process resumable upload files
     *
     * @param $parameters
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function uploadResumable($parameters): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector not initialized';

            return $res;
        }
        $upload_id            = $parameters['upload_id'];
        $resumableFilename    = $parameters['resumableFilename'];
        $resumableIdentifier  = $parameters['resumableIdentifier'];
        $resumableChunkNumber = $parameters['resumableChunkNumber'];
        $resumableTotalSize   = $parameters['resumableTotalSize'];
        $uploadDir            = $di->getShared('config')->path('www.uploadDir');

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
                $temp_dir         = $uploadDir . '/' . Util::trimExtensionForFile(basename($resumableFilename));
                $temp_dst_file    = $uploadDir . '/' . $upload_id . '/' . $upload_id . '_' . basename(
                        $resumableFilename
                    );
                $chunks_dest_file = $temp_dir . '/' . $resumableFilename . '.part' . $resumableChunkNumber;
            } else {
                $temp_dir         = $uploadDir . '/' . $upload_id;
                $temp_dst_file    = $temp_dir . '/' . $upload_id . '_' . basename($file->getClientFilename());
                $chunks_dest_file = $temp_dst_file;
            }
            if ( ! Util::mwMkdir($temp_dir) || ! Util::mwMkdir(dirname($temp_dst_file))) {
                Util::sysLogMsg('UploadFile', "Error create dir '$temp_dir'");
                $res->success    = false;
                $res->messages[] = "Error create dir '{$temp_dir}'";

                return $res;
            }
            $file->moveTo($chunks_dest_file);
            // if (file_exists($file->))
            if ($resumableFilename) {
                $res->success = true;
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
                    $res->data['upload_id'] = $upload_id;
                    $res->data['filename']  = $temp_dst_file;
                    $res->data['d_status']  = 'INPROGRESS';
                }
            } else {
                $res->success = true;
                // Передача файла целиком.
                $res->data['upload_id'] = $upload_id;
                $res->data['filename']  = $temp_dst_file;
                $res->data['d_status']  = 'UPLOAD_COMPLETE';
                file_put_contents($temp_dir . '/progress', '100');

                Util::mwExecBg(
                    '/sbin/shell_functions.sh killprocesses ' . $temp_dir . ' -TERM 0;rm -rf ' . $temp_dir,
                    '/dev/null',
                    120
                );
            }
        }

        return $res;
    }

    /**
     * Returns Status of uploading process
     *
     * @param $postData
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function statusUploadFile($postData): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector not initialized';

            return $res;
        }
        $uploadDir = $di->getShared('config')->path('www.uploadDir');
        if ($postData && isset($postData['id'])) {
            $upload_id     = $postData['id'];
            $progress_dir  = $uploadDir . '/' . $upload_id;
            $progress_file = $progress_dir . '/progress';

            if (empty($upload_id)) {
                $res->success                   = false;
                $res->data['d_status_progress'] = '0';
                $res->data['d_status']          = 'ID_NOT_SET';
            } elseif ( ! file_exists($progress_file) && file_exists($progress_dir)) {
                $res->success                   = true;
                $res->data['d_status_progress'] = '0';
                $res->data['d_status']          = 'INPROGRESS';
            } elseif ( ! file_exists($progress_dir)) {
                $res->success                   = false;
                $res->data['d_status_progress'] = '0';
                $res->data['d_status']          = 'NOT_FOUND';
            } elseif ('100' === file_get_contents($progress_file)) {
                $res->success                   = true;
                $res->data['d_status_progress'] = '100';
                $res->data['d_status']          = 'UPLOAD_COMPLETE';
            } else {
                $res->success                   = true;
                $res->data['d_status_progress'] = file_get_contents($progress_file);
            }
        }

        return $res;
    }

    /**
     * Конвертация файла в wav 8000.
     *
     * @param $filename
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function convertAudioFile($filename): PBXApiResult
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
            $res->success    = false;
            $res->messages[] = $result_str;

            return $res;
        }

        if ($filename !== $n_filename && $filename !== $n_filename_mp3) {
            @unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }

    /**
     * Unpack ModuleFile and get metadata information
     *
     * @param $filePath
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function getMetadataFromModuleFile(string $filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        if (file_exists($filePath)) {
            $sevenZaPath = Util::which('7za');
            $grepPath    = Util::which('grep');
            $echoPath    = Util::which('echo');
            $awkPath     = Util::which('awk');
            $cmd         = 'f="' . $filePath . '"; p=`' . $sevenZaPath . ' l $f | ' . $grepPath . ' module.json`;if [ "$?" == "0" ]; then ' . $sevenZaPath . ' -so e -y -r $f `' . $echoPath . ' $p |  ' . $awkPath . ' -F" " \'{print $6}\'`; fi';

            Util::mwExec($cmd, $out);
            $settings = json_decode(implode("\n", $out), true);

            $moduleUniqueID = $settings['moduleUniqueID'] ?? null;
            if ( ! $moduleUniqueID) {
                $res->messages[] = 'The" moduleUniqueID " in the module file is not described.the json or file does not exist.';

                return $res;
            }
            $res->success = true;
            $res->data    = [
                'filePath' => $filePath,
                'uniqid'   => $moduleUniqueID,
            ];
        }

        return $res;
    }

    /**
     * Считывает содержимое файла, если есть разрешение.
     *
     * @param $filename
     * @param $needOriginal
     *
     * @return PBXApiResult
     */
    public static function fileReadContent($filename, $needOriginal = true): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $customFile     = CustomFiles::findFirst("filepath = '{$filename}'");
        if ($customFile !== null) {
            $filename_orgn = "{$filename}.orgn";
            if ($needOriginal && file_exists($filename_orgn)) {
                $filename = $filename_orgn;
            }
            $res->success = true;
            $res->data[]  = rawurlencode(file_get_contents($filename));
        } else {
            $res->success    = false;
            $res->messages[] = 'No access to the file ' . $filename;
        }

        return $res;
    }



    /**
     * Download IMG from MikoPBX repository
     *
     * @param $data
     *
     * @return PBXApiResult
     */
    public static function downloadNewFirmware($data): PBXApiResult
    {
        $di = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }
        $rmPath = Util::which('rm');
        $module = 'NewFirmware';
        if ( ! file_exists($tempDir . "/{$module}")) {
            Util::mwMkdir($tempDir . "/{$module}");
        } else {
            // Чистим файлы, загруженные онлайн.
            Util::mwExec("{$rmPath} -rf {$tempDir}/{$module}/* ");
        }
        if (file_exists("{$tempDir}/update.img")) {
            // Чистим вручную загруженный файл.
            Util::mwExec("{$rmPath} -rf {$tempDir}/update.img");
        }

        $download_settings = [
            'res_file' => "{$tempDir}/{$module}/update.img",
            'url'      => $data['url'],
            'module'   => $module,
            'md5'      => $data['md5'],
            'action'   => $module,
        ];

        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);

        file_put_contents($tempDir . "/{$module}/progress", '0');
        file_put_contents(
            $tempDir . "/{$module}/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $phpPath = Util::which('php');
        Util::mwExecBg("{$phpPath} -f {$workerDownloaderPath} " . $tempDir . "/{$module}/download_settings.json");

        $res                   = new PBXApiResult();
        $res->processor        = __METHOD__;
        $res->success          = true;
        $res->data['filename'] = $download_settings['res_file'];
        $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';

        return $res;
    }

    /**
     * Return download Firmware from remote repository progress
     *
     * @return PBXApiResult
     */
    public static function firmwareDownloadStatus(): PBXApiResult
    {
        clearstatcache();
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success   = true;
        $di             = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }
        $modulesDir    = $tempDir . '/NewFirmware';
        $progress_file = $modulesDir . '/progress';

        $error = '';
        if (file_exists($modulesDir . '/error')) {
            $error = trim(file_get_contents($modulesDir . '/error'));
        }

        if ( ! file_exists($progress_file)) {
            $res->data['d_status_progress'] = '0';
            $res->data['d_status']          = 'NOT_FOUND';
        } elseif ('' !== $error) {
            $res->data['d_status']          = 'DOWNLOAD_ERROR';
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $res->data['d_error']           = $error;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data['d_status_progress'] = '100';
            $res->data['d_status']          = 'DOWNLOAD_COMPLETE';
            $res->data['filePath']          = "{$tempDir}/NewFirmware/update.img";
        } else {
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $d_pid                          = Util::getPidOfProcess($tempDir . '/NewFirmware/download_settings.json');
            if (empty($d_pid)) {
                $res->data['d_status'] = 'DOWNLOAD_ERROR';
                $error                 = '';
                if (file_exists($modulesDir . '/error')) {
                    $error = file_get_contents($modulesDir . '/error');
                }
                $res->data['d_error'] = $error;
            } else {
                $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
            }
        }

        return $res;
    }

    /**
     * Start module download in background separate process
     *
     * @param $module
     * @param $url
     * @param $md5
     *
     * @return PBXApiResult
     */
    public static function moduleStartDownload($module, $url, $md5): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }

        $moduleDirTmp = "{$tempDir}/{$module}";
        Util::mwMkdir($moduleDirTmp);

        $download_settings = [
            'res_file' => "$moduleDirTmp/modulefile.zip",
            'url'      => $url,
            'module'   => $module,
            'md5'      => $md5,
            'action'   => 'moduleInstall',
        ];
        if (file_exists("$moduleDirTmp/error")) {
            unlink("$moduleDirTmp/error");
        }
        if (file_exists("$moduleDirTmp/installed")) {
            unlink("$moduleDirTmp/installed");
        }
        file_put_contents("$moduleDirTmp/progress", '0');
        file_put_contents(
            "$moduleDirTmp/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);
        $phpPath              = Util::which('php');
        Util::mwExecBg("{$phpPath} -f {$workerDownloaderPath} $moduleDirTmp/download_settings.json");

        $res->data['uniqid']   = $module;
        $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
        $res->success          = true;

        return $res;
    }

    /**
     * Returns module download status
     *
     * @param $moduleUniqueID
     *
     * @return PBXApiResult
     */
    public static function moduleDownloadStatus(string $moduleUniqueID): PBXApiResult
    {
        clearstatcache();
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getConfig()->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }
        $moduleDirTmp  = $tempDir . '/' . $moduleUniqueID;
        $progress_file = $moduleDirTmp . '/progress';
        $error         = '';
        if (file_exists($moduleDirTmp . '/error')) {
            $error = trim(file_get_contents($moduleDirTmp . '/error'));
        }

        // Ожидание запуска процесса загрузки.
        $d_pid = Util::getPidOfProcess("{$moduleDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }

        if ( ! file_exists($progress_file)) {
            $res->data['d_status_progress'] = '0';
            $res->data['d_status']          = 'NOT_FOUND';
            $res->success                   = false;
        } elseif ('' !== $error) {
            $res->data['d_status']          = 'DOWNLOAD_ERROR';
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $res->data['d_error']           = $error;
            $res->success                   = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data['d_status_progress'] = '100';
            $res->data['d_status']          = 'DOWNLOAD_COMPLETE';
            $res->data['filePath']          = "$moduleDirTmp/modulefile.zip";
            $res->success                   = true;
        } else {
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $d_pid                          = Util::getPidOfProcess($moduleDirTmp . '/download_settings.json');
            if (empty($d_pid)) {
                $res->data['d_status'] = 'DOWNLOAD_ERROR';
                $error                 = '';
                if (file_exists($moduleDirTmp . '/error')) {
                    $error = file_get_contents($moduleDirTmp . '/error');
                }
                $res->messages[] = $error;
                $res->success    = false;
            } else {
                $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
                $res->success          = true;
            }
        }

        return $res;
    }

    /**
     * Delete file from disk by filepath
     *
     * @param $filePath
     *
     * @return PBXApiResult
     */
    public static function removeAudioFile($filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $extension      = Util::getExtensionOfFile($filePath);
        if ( ! in_array($extension, ['mp3', 'wav', 'alaw'])) {
            $res->success    = false;
            $res->messages[] = "It is forbidden to remove the file type $extension.";

            return $res;
        }

        if ( ! file_exists($filePath)) {
            $res->success         = true;
            $res->data['message'] = "File '{$filePath}' already deleted";

            return $res;
        }

        $out = [];

        $arrDeletedFiles = [
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".wav"),
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".mp3"),
            escapeshellarg(Util::trimExtensionForFile($filePath) . ".alaw"),
        ];

        $rmPath = Util::which('rm');
        Util::mwExec("{$rmPath} -rf " . implode(' ', $arrDeletedFiles), $out);
        if (file_exists($filePath)) {
            $res->success  = false;
            $res->messages = $out;
        } else {
            $res->success = true;
        }

        return $res;
    }

    /**
     * Install new additional extension module
     *
     * @param $filePath
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
     */
    public static function installModuleFromFile($filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $moduleMetadata = FilesManagementProcessor::getMetadataFromModuleFile($filePath);
        if ( ! $moduleMetadata->success) {
            return $moduleMetadata;
        } else {
            $moduleUniqueID = $moduleMetadata->data['uniqid'];
            $res            = self::installModule($filePath, $moduleUniqueID);
        }

        return $res;
    }

    /**
     * Install module from file
     *
     * @param string $filePath
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult
     */
    public static function installModule(string $filePath, string $moduleUniqueID): PBXApiResult
    {
        $res              = new PBXApiResult();
        $res->processor   = __METHOD__;
        $res->success     = true;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $needBackup       = is_dir($currentModuleDir);

        if ($needBackup) {
            self::uninstallModule($moduleUniqueID, true);
        }

        $semZaPath = Util::which('7za');
        Util::mwExec("{$semZaPath} e -spf -aoa -o{$currentModuleDir} {$filePath}");
        Util::addRegularWWWRights($currentModuleDir);

        $pbxExtensionSetupClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
        if (class_exists($pbxExtensionSetupClass)
            && method_exists($pbxExtensionSetupClass, 'installModule')) {
            $setup = new $pbxExtensionSetupClass($moduleUniqueID);
            if ( ! $setup->installModule()) {
                $res->success    = false;
                $res->messages[] = $setup->getMessages();
            }
        } else {
            $res->success    = false;
            $res->messages[] = "Install error: the class {$pbxExtensionSetupClass} not exists";
        }

        if ($res->success) {
            $res->data['needRestartWorkers'] = true;
        }

        return $res;
    }

    /**
     * Uninstall module
     *
     * @param string $moduleUniqueID
     *
     * @param bool   $keepSettings
     *
     * @return PBXApiResult
     */
    public static function uninstallModule(string $moduleUniqueID, bool $keepSettings): PBXApiResult
    {
        $res              = new PBXApiResult();
        $res->processor   = __METHOD__;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        // Kill all module processes
        if (is_dir("{$currentModuleDir}/bin")) {
            $busyboxPath = Util::which('busybox');
            $killPath    = Util::which('kill');
            $lsofPath    = Util::which('lsof');
            $grepPath    = Util::which('grep');
            $awkPath     = Util::which('awk');
            $uniqPath    = Util::which('uniq');
            Util::mwExec(
                "{$busyboxPath} {$killPath} -9 $({$lsofPath} {$currentModuleDir}/bin/* |  {$busyboxPath} {$grepPath} -v COMMAND | {$busyboxPath} {$awkPath}  '{ print $2}' | {$busyboxPath} {$uniqPath})"
            );
        }
        // Uninstall module with keep settings and backup db
        $moduleClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";

        try {
            if (class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')) {
                $setup = new $moduleClass($moduleUniqueID);
            } else {
                // Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
            }
            $setup->uninstallModule($keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // Broken or very old module. Force uninstall.
                $rmPath = Util::which('rm');
                Util::mwExec("{$rmPath} -rf {$currentModuleDir}");

                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success                    = true;
        $res->data['needRestartWorkers'] = true;

        return $res;
    }

    /**
     *
     * Scans a directory just like scandir(), only recursively
     * returns a hierarchical array representing the directory structure
     *
     * @param string $dir      directory to scan
     *
     * @return array
     */
    public static function scanDirRecursively(string $dir): array
    {
        $list = [];

        //get directory contents
        foreach (scandir($dir) as $d) {
            //ignore any of the files in the array
            if (in_array($d, ['.', '..'])) {
                continue;
            }
            //if current file ($d) is a directory, call scanDirRecursively
            if (is_dir($dir . '/' . $d)) {
                $list[] = self::scanDirRecursively($dir . '/' . $d);
                //otherwise, add the file to the list
            } elseif (is_file($dir . '/' . $d) || is_link($dir . '/' . $d)) {
                $list[] = $dir . '/' . $d;
            }
        }

        return $list;
    }
}