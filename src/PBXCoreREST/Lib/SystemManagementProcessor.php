<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
                $res->success = Notifications::sendTestMail();
                break;
            case 'sendMail':
                $res = self::sendMail($data);
                break;
            case 'unBanIp':
                $res = FirewallManagementProcessor::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $res = FirewallManagementProcessor::getBanIp();
                break;
            case 'upgrade':
                $res = self::upgradeFromImg($data['temp_filename']);
                break;
            case 'installNewModule':
                $filePath = $request['data']['filePath'];
                $res      = self::installModule($filePath);
                break;
            case 'statusOfModuleInstallation':
                $filePath = $request['data']['filePath'];
                $res      = self::statusOfModuleInstallation($filePath);
                break;
            case 'enableModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $res            = self::enableModule($moduleUniqueID);
                break;
            case 'disableModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $res            = self::disableModule($moduleUniqueID);
                break;
            case 'uninstallModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $keepSettings   = $request['data']['keepSettings'] === 'true';
                $res            = self::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            case 'restoreDefault':
                $res = self::restoreDefaultSettings();
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Processes::mwExec("{$mvPath} {$request['data']['temp_filename']} {$request['data']['filename']}");
                $res = self::convertAudioFile($request['data']['filename']);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor  = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in systemCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Sends test email to admin address
     *
     * @param                                       $data
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult $res
     */
    private static function sendMail($data): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
            if (isset($data['encode']) && $data['encode'] === 'base64') {
                $data['subject'] = base64_decode($data['subject']);
                $data['body']    = base64_decode($data['body']);
            }
            $result = Notifications::sendMail($data['email'], $data['subject'], $data['body']);
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
     * Upgrade MikoPBX from uploaded IMG file
     *
     * @param string $tempFilename path to uploaded image
     *
     * @return PBXApiResult
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
        $dev = trim(file_get_contents('/var/etc/cfdevice'));

        $link = '/tmp/firmware_update.img';
        Util::createUpdateSymlink($tempFilename, $link);
        $mikoPBXFirmwarePath = Util::which('mikopbx_firmware');
        Processes::mwExecBg("{$mikoPBXFirmwarePath} recover_upgrade {$link} /dev/{$dev}");

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
    public static function installModule($filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $resModuleMetadata = FilesManagementProcessor::getMetadataFromModuleFile($filePath);
        if ( ! $resModuleMetadata->success) {
            return $resModuleMetadata;
        } else {
            $moduleUniqueID = $resModuleMetadata->data['uniqid'];
            // If it enabled send disable action first
            if (PbxExtensionUtils::isEnabled($moduleUniqueID)){
                $res = self::disableModule($moduleUniqueID);
                if (!$res->success){
                    return $res;
                }
            }

            $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
            $needBackup       = is_dir($currentModuleDir);

            if ($needBackup) {
                self::uninstallModule($moduleUniqueID, true);
            }

            // We will start the background process to install module
            $temp_dir            = dirname($filePath);
            $install_settings = [
                'filePath' => $filePath,
                'currentModuleDir' => $currentModuleDir,
                'uniqid' => $moduleUniqueID,
            ];
            $settings_file  = "{$temp_dir}/install_settings.json";
            file_put_contents(
                $settings_file,
                json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
            );
            $phpPath               = Util::which('php');
            $workerFilesMergerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);
            Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");
            $res->data['filePath']= $filePath;
            $res->success = true;
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
            Processes::mwExec(
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
                Processes::mwExec("{$rmPath} -rf {$currentModuleDir}");

                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success = true;

        return $res;
    }

    /**
     * Enables extension module
     *
     * @param string $moduleUniqueID
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult $res
     */
    private static function enableModule(string $moduleUniqueID): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->enableModule() === false) {
            $res->success  = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data    = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Disables extension module
     *
     * @param string $moduleUniqueID
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult $res
     */
    private static function disableModule(string $moduleUniqueID): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->disableModule() === false) {
            $res->success  = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data    = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Deletes all settings and uploaded files
     */
    private static function restoreDefaultSettings(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = DI::getDefault();
        if ($di === null) {
            $res->messages[] = 'Error on DI initialize';

            return $res;
        }

        $res->success = true;
        $rm           = Util::which('rm');

        // Pre delete some types
        $clearThisModels = [
            [Providers::class => ''],
            [OutgoingRoutingTable::class => ''],
            [IncomingRoutingTable::class => ''],
            [OutWorkTimes::class => ''],
            [AsteriskManagerUsers::class => ''],
            [Extensions::class => 'type="' . Extensions::TYPE_IVR_MENU . '"'],  // IVR Menu
            [Extensions::class => 'type="' . Extensions::TYPE_CONFERENCE . '"'],  // CONFERENCE
            [Extensions::class => 'type="' . Extensions::TYPE_QUEUE . '"'],  // QUEUE
        ];

        foreach ($clearThisModels as $modelParams) {
            foreach ($modelParams as $key => $value) {
                $records = call_user_func([$key, 'find'], $value);
                if ( ! $records->delete()) {
                    $res->messages[] = $records->getMessages();
                    $res->success    = false;
                }
            }
        }

        // Other extensions
        $parameters     = [
            'conditions' => 'not number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    '000063', // Reads back the extension
                    '000064', // 0000MILLI
                    '10003246',// Echo test
                    '10000100' // Voicemail
                ],
            ],
        ];
        $stopDeleting   = false;
        $countRecords   = Extensions::count($parameters);
        $deleteAttempts = 0;
        while ($stopDeleting === false) {
            $record = Extensions::findFirst($parameters);
            if ($record === null) {
                $stopDeleting = true;
                continue;
            }
            if ( ! $record->delete()) {
                $deleteAttempts += 1;
            }
            if ($deleteAttempts > $countRecords * 10) {
                $stopDeleting    = true; // Prevent loop
                $res->messages[] = $record->getMessages();
            }
        }

        // SoundFiles
        $parameters = [
            'conditions' => 'category = :custom:',
            'bind'       => [
                'custom' => SoundFiles::CATEGORY_CUSTOM,
            ],
        ];
        $records    = SoundFiles::find($parameters);

        foreach ($records as $record) {
            if (stripos($record->path, '/storage/usbdisk1/mikopbx') !== false) {
                Processes::mwExec("{$rm} -rf {$record->path}");
                if ( ! $record->delete()) {
                    $res->messages[] = $record->getMessages();
                    $res->success    = false;
                }
            }
        }

        // PbxExtensions
        $records = PbxExtensionModules::find();
        foreach ($records as $record) {
            $moduleDir = PbxExtensionUtils::getModuleDir($record->uniqid);
            Processes::mwExec("{$rm} -rf {$moduleDir}");
            if ( ! $record->delete()) {
                $res->messages[] = $record->getMessages();
                $res->success    = false;
            }
        }

        // Delete CallRecords
        $records = CallDetailRecords::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // Delete CallRecords sound files
        $callRecordsPath = $di->getShared('config')->path('asterisk.monitordir');
        if (stripos($callRecordsPath, '/storage/usbdisk1/mikopbx') !== false) {
            Processes::mwExec("{$rm} -rf {$callRecordsPath}/*");
        }

        return $res;
    }

    /**
     * Converts file to wav file with 8000 bitrate
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
        Processes::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        $lamePath = Util::which('lame');
        Processes::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Чистим мусор.
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Ошибка выполнения конвертации.
            $res->success    = false;
            $res->messages[] = $result_str;

            return $res;
        }

        if (file_exists($filename)
            && $filename !== $n_filename
            && $filename !== $n_filename_mp3) {
            unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }

    /**
     * Returns Status of module installation process
     *
     * @param string $filePath
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function statusOfModuleInstallation(string $filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $temp_dir            = dirname($filePath);
        $progress_file = $temp_dir . '/installation_progress';
        $error_file = $temp_dir . '/installation_error';
        if (!file_exists($error_file)|| !file_exists($progress_file)){
            $res->success                   = false;
            $res->data['i_status']          = 'PROGRESS_FILE_NOT_FOUND';
            $res->data['i_status_progress'] = '0';
        }
        elseif (file_get_contents($error_file)!=='') {
            $res->success                   = false;
            $res->data['i_status']          = 'INSTALLATION_ERROR';
            $res->data['i_status_progress'] = '0';
            $res->messages[]                = file_get_contents($error_file);
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success                   = true;
            $res->data['i_status_progress'] = '100';
            $res->data['i_status']          = 'INSTALLATION_COMPLETE';
        } else {
            $res->success                   = true;
            $res->data['i_status']          = 'INSTALLATION_IN_PROGRESS';
            $res->data['i_status_progress'] = file_get_contents($progress_file);
        }


        return $res;
    }
}